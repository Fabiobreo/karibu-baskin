import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { StaffAvailabilitySchema } from "@/lib/schemas";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { hasStarted } from "@/lib/matches/matchPhase";
import { loadAvailabilityLookup, saveAvailability } from "@/lib/matches/availability";
import { notifyStaffAvailability } from "@/lib/notifications/matchNotify";

type Params = { params: Promise<{ matchId: string }> };

// PUT /api/matches/[matchId]/availability/staff
// Body: { kind: "user" | "child", id: string, available: boolean }
//
// Lo staff segna la disponibilità al posto del giocatore, di solito perché gli
// ha detto a voce che c'è. La riga dice che l'ha segnata lo staff
// (`setByStaff`), la famiglia riceve un avviso e può correggere, e l'azione
// finisce nel registro attività. Solo prima della partita: dopo, le
// disponibilità non servono più e lo staff registra chi ha giocato.
export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = StaffAvailabilitySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { kind, id, available } = parsed.data;

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        date: true,
        team: { select: { season: true } },
        opponentTeam: { select: { season: true } },
      },
    });
    if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
    if (hasStarted(match.date, Date.now())) {
      return NextResponse.json(
        { error: "La partita è già iniziata: le disponibilità non servono più" },
        { status: 400 }
      );
    }

    // Un giocatore della stagione della partita: della rosa o in prestito da
    // un'altra squadra della società. Per una scheda figlio con un account
    // vale anche la squadra dell'account (persona unica).
    const seasons = [match.team.season, match.opponentTeam?.season].filter((s): s is string => !!s);
    const card =
      kind === "child"
        ? await prisma.child.findUnique({ where: { id }, select: { userId: true } })
        : null;
    if (kind === "child" && !card) {
      return NextResponse.json({ error: "Giocatore non trovato" }, { status: 404 });
    }
    const membership = await prisma.teamMembership.findFirst({
      where: {
        team: { season: { in: seasons } },
        OR:
          kind === "user"
            ? [{ userId: id }]
            : [{ childId: id }, ...(card?.userId ? [{ userId: card.userId }] : [])],
      },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Il giocatore non fa parte delle squadre di questa stagione" },
        { status: 400 }
      );
    }

    const person = kind === "user" ? { userId: id } : { childId: id };
    const before = (
      await loadAvailabilityLookup(
        matchId,
        kind === "user" ? [id] : [],
        kind === "child" ? [id] : []
      )
    ).forPerson(person);

    await saveAvailability({ matchId, person: { kind, id }, available, setByStaff: true });

    // Stessa risposta di prima: niente avviso né riga nel registro.
    if (before?.available !== available) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "SET_AVAILABILITY",
          targetType: "Match",
          targetId: matchId,
          before: { ...person, available: before?.available ?? null },
          after: { ...person, available },
        }),
        "audit staff availability"
      );
      inBackground(
        notifyStaffAvailability(matchId, person, available),
        "notify staff availability"
      );
    }

    return NextResponse.json({ ok: true, available, setByStaff: true });
  } catch (err) {
    console.error("[staff availability]", err);
    return NextResponse.json({ error: "Disponibilità non salvata" }, { status: 500 });
  }
}
