import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  generateTeams,
  withoutRatings,
  type Teams,
  type Athlete,
} from "@/lib/season/teamGenerator";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { isMemberRole } from "@/lib/authRoles";
import { notifyTeamChanges } from "@/lib/notifications/teamsNotify";
import { TRUESKILL } from "@/lib/rating/trueskill";
import { TeamsPostSchema } from "@/lib/schemas/teams";
import {
  NOTIFIED_KEY,
  assignmentOf,
  notifiedAssignmentOf,
  placeLateAthletes,
  teamChanges,
  type BibKey,
} from "@/lib/trainingTeams";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";

/** Squadre come stanno nel JSON di `TrainingSession.teams`. */
type SavedTeams = Partial<Record<BibKey, Athlete[]>>;

// GET — ritorna le squadre salvate in DB
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const rl = checkRateLimit(getClientIp(req), "get-teams", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  // Le squadre contengono gli stessi dati della rosa (nome e ruolo di ogni
  // atleta): stessa protezione di GET /api/registrations, altrimenti chiudere
  // quello lascerebbe aperta la porta accanto.
  const viewer = await auth();
  if (!viewer?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!isMemberRole(viewer.user.appRole)) {
    return NextResponse.json({ error: "Riservato ai tesserati" }, { status: 403 });
  }

  const { sessionId } = await params;
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { teams: true },
  });

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.teams) return NextResponse.json({ teamA: [], teamB: [], generated: false });

  // Squadre salvate prima di KB-40 possono contenere ancora il rating.
  return NextResponse.json({ ...withoutRatings(session.teams as object), generated: true });
}

// POST — crea le squadre da capo (`generate`) o ci aggiunge chi si è iscritto
// dopo (`add`, UX-54), e le salva in DB (solo staff)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const authSession = await auth();

  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const parsed = TeamsPostSchema.safeParse((await req.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }
  const { mode, numTeams } = parsed.data;

  // Chi è segnato assente non gioca: conta per le squadre ricreate a
  // allenamento finito, dalla pagina "da completare".
  const registrations = await prisma.registration.findMany({
    // Non `NOT: { attended: false }`: in SQL `NOT (attended = false)` scarta
    // anche i NULL, cioe' chi non e' ancora stato segnato (quasi sempre tutti),
    // e la generazione rispondeva "Nessun atleta iscritto".
    where: { sessionId, OR: [{ attended: null }, { attended: true }] },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { gender: true, ratingMu: true } },
      child: { select: { gender: true, ratingMu: true } },
    },
  });

  // In `add` si va avanti anche senza iscritti: se se ne sono andati tutti,
  // "Aggiorna le squadre" deve poterli togliere.
  if (registrations.length === 0 && mode !== "add") {
    return NextResponse.json({ error: "Nessun atleta iscritto" }, { status: 400 });
  }

  const athletes = registrations
    .filter((r) => !r.registeredAsCoach)
    .map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      gender: r.user?.gender ?? r.child?.gender ?? null,
      // μ TrueSkill per il bilanciamento skill; null = non valutato (anonimo o mai giocato)
      rating: r.user?.ratingMu ?? r.child?.ratingMu ?? null,
    }));
  const coaches = registrations
    .filter((r) => r.registeredAsCoach)
    .map((r) => ({ id: r.id, name: r.name }));

  // Le squadre di prima: per sapere chi avvisare (solo chi entra o cambia
  // squadra) e, in `add`, per non spostare nessuno.
  const current = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { teams: true },
  });
  if (!current) return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  const before = (current.teams as SavedTeams | null) ?? null;

  let teams: Teams;
  let addedCount = 0;
  let removedCount = 0;
  if (mode === "add") {
    if (!before) {
      return NextResponse.json({ error: "Le squadre non ci sono ancora" }, { status: 400 });
    }
    const keys: BibKey[] = before.teamC ? ["teamA", "teamB", "teamC"] : ["teamA", "teamB"];
    const ratingById = new Map(athletes.map((a) => [a.id, a.rating ?? TRUESKILL.MU]));
    const placed = placeLateAthletes(
      keys.map((k) => before[k] ?? []),
      athletes,
      (id) => ratingById.get(id) ?? TRUESKILL.MU
    );
    addedCount = placed.added.length;
    removedCount = placed.removed.length;
    teams = {
      teamA: placed.teams[0],
      teamB: placed.teams[1],
      ...(keys.length === 3 ? { teamC: placed.teams[2] } : {}),
      numTeams: keys.length as 2 | 3,
    };
  } else {
    // SHA-256(sessionId || secret) → hex string used as the PRNG seed.
    // Hashing prevents reversing observed team outputs back to the raw secret,
    // which matters because AUTH_SECRET is also the session-signing key.
    const seedInput = createHash("sha256")
      .update(sessionId + (process.env.AUTH_SECRET ?? ""))
      .digest("hex");
    teams = generateTeams(athletes, seedInput, numTeams);
  }

  const teamsOnly = { ...withoutRatings(teams), coaches, generated: true };
  // Il confronto parte dall'ultimo avviso, se c'è: una modifica a mano mai
  // avvisata (uscita senza "Fatto") arriva così con la prossima squadra fatta.
  const baseline = notifiedAssignmentOf(before) ?? assignmentOf(before);
  const changes = teamChanges(baseline, assignmentOf(teamsOnly));
  const saved = { ...teamsOnly, [NOTIFIED_KEY]: assignmentOf(teamsOnly) };
  try {
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { teams: saved as object },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    }
    throw err;
  }

  // La prima volta "Squadre pronte!" a tutti; dopo solo a chi entra o cambia
  // squadra. Allenamento finito: nessuno (lo decide `notifyTeamChanges`).
  inBackground(
    notifyTeamChanges(
      sessionId,
      changes,
      registrations.filter((r) => !r.registeredAsCoach)
    ),
    "notification teams"
  );

  if (authSession?.user?.id) {
    inBackground(
      logAudit({
        actorId: authSession.user.id,
        action: mode === "add" ? "UPDATE_TEAMS" : "GENERATE_TEAMS",
        targetType: "TrainingSession",
        targetId: sessionId,
        after:
          mode === "add"
            ? { added: addedCount, removed: removedCount }
            : { numTeams, athleteCount: athletes.length, coachCount: coaches.length },
      }),
      "audit generate teams"
    );
  }

  return NextResponse.json(saved);
}

// PUT — aggiorna le squadre (spostamento manuale giocatori, solo staff)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const authSession = await auth();

  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.teamA) || !Array.isArray(body.teamB)) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const beforeSession = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { teams: true },
  });

  // L'ultimo avviso lo scrive solo il server: quello che manda il browser si
  // ignora, quello salvato resta.
  const { [NOTIFIED_KEY]: _ignored, ...teamsBody } = body as Record<string, unknown>;
  void _ignored;
  const notified = notifiedAssignmentOf(beforeSession?.teams);
  const next = { ...teamsBody, generated: true, ...(notified ? { [NOTIFIED_KEY]: notified } : {}) };
  try {
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { teams: next as object },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    }
    throw err;
  }

  if (authSession?.user?.id) {
    inBackground(
      logAudit({
        actorId: authSession.user.id,
        action: "UPDATE_TEAMS",
        targetType: "TrainingSession",
        targetId: sessionId,
        before: (beforeSession?.teams as Record<string, unknown> | null) ?? null,
        after: { ...teamsBody, generated: true },
      }),
      "audit update teams"
    );
  }

  return NextResponse.json(next);
}

// DELETE — rimuove le squadre salvate (solo admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const authSession = await auth();

  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { teams: Prisma.DbNull },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    }
    throw err;
  }

  if (authSession?.user?.id) {
    inBackground(
      logAudit({
        actorId: authSession.user.id,
        action: "DELETE_TEAMS",
        targetType: "TrainingSession",
        targetId: sessionId,
      }),
      "audit delete teams"
    );
  }

  return NextResponse.json({ ok: true });
}
