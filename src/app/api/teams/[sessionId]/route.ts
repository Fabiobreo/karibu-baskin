import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generateTeams } from "@/lib/season/teamGenerator";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";

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

  const { sessionId } = await params;
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { teams: true },
  });

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.teams) return NextResponse.json({ teamA: [], teamB: [], generated: false });

  return NextResponse.json({ ...(session.teams as object), generated: true });
}

// POST — crea squadre e le salva in DB (solo admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const authSession = await auth();

  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const numTeams: 2 | 3 = body.numTeams === 3 ? 3 : 2;

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { gender: true, ratingMu: true } },
      child: { select: { gender: true, ratingMu: true } },
    },
  });

  if (registrations.length === 0) {
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
  // SHA-256(sessionId || secret) → hex string used as the PRNG seed.
  // Hashing prevents reversing observed team outputs back to the raw secret,
  // which matters because AUTH_SECRET is also the session-signing key.
  const seedInput = createHash("sha256")
    .update(sessionId + (process.env.AUTH_SECRET ?? ""))
    .digest("hex");
  const teams = generateTeams(athletes, seedInput, numTeams);

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { teams: { ...teams, coaches, generated: true } as object },
  });

  // Notifica push solo agli iscritti all'allenamento (fire-and-forget)
  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { title: true, dateSlug: true },
  });
  if (trainingSession) {
    // Raccoglie gli userId degli iscritti come atleti (non allenatori)
    const registeredUserIds = registrations
      .filter((r) => !r.registeredAsCoach && r.userId)
      .map((r) => r.userId as string);

    const pushPayload = {
      title: "📋 Squadre pronte!",
      body: `Le squadre per "${trainingSession.title}" sono state create.`,
      url: `/allenamento/${trainingSession.dateSlug ?? sessionId}`,
      type: "TEAMS_READY",
    };
    sendPushToUsers(registeredUserIds, pushPayload, "TEAMS_READY").catch((err) =>
      console.error("[push] teams ready", err)
    );
    createTargetedAppNotifications(registeredUserIds, {
      type: "TEAMS_READY",
      title: "Squadre pronte!",
      body: `Le squadre per "${trainingSession.title}" sono state create.`,
      url: `/allenamento/${trainingSession.dateSlug ?? sessionId}`,
    }).catch((err) => console.error("[notification] teams ready", err));
  }

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "GENERATE_TEAMS",
      targetType: "TrainingSession",
      targetId: sessionId,
      after: {
        numTeams,
        athleteCount: athletes.length,
        coachCount: coaches.length,
      },
    }).catch((err) => console.error("[audit] generate teams", err));
  }

  return NextResponse.json({ ...teams, coaches, generated: true });
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

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { teams: { ...body, generated: true } as object },
  });

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "UPDATE_TEAMS",
      targetType: "TrainingSession",
      targetId: sessionId,
      before: (beforeSession?.teams as Record<string, unknown> | null) ?? null,
      after: { ...body, generated: true },
    }).catch((err) => console.error("[audit] update teams", err));
  }

  return NextResponse.json({ ...body, generated: true });
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
    logAudit({
      actorId: authSession.user.id,
      action: "DELETE_TEAMS",
      targetType: "TrainingSession",
      targetId: sessionId,
    }).catch((err) => console.error("[audit] delete teams", err));
  }

  return NextResponse.json({ ok: true });
}
