import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { AvailabilitySchema } from "@/lib/schemas";
import { rosterTeamIds } from "@/lib/matches/mixedTeam";
import { guardianOf } from "@/lib/guardians";
import { personRows } from "@/lib/person";
import { CALLUPS_LOCKED_ERROR, callupsLocked, saveAvailability } from "@/lib/matches/availability";

type Params = { params: Promise<{ matchId: string }> };

// PUT /api/matches/[matchId]/availability
// Body: { available: boolean, childId?: string }
// - L'utente marca la propria disponibilità OPPURE quella di un figlio.
// - Solo membri della squadra (User o Child) della partita possono marcare.
// - Non si può modificare la disponibilità per partite già giocate.
// - Un figlio con un account è una persona sola (@/lib/person): la riga è
//   sempre quella dell'account, che risponda lui o un genitore.
// - Dopo le convocazioni la risposta non si cambia più (callupsLocked): resta
//   quella che lo staff aveva davanti quando ha convocato.
// - La risposta della persona toglie il segno "segnata dallo staff".
export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const userId = session.user.id;

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = AvailabilitySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { available, childId } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      date: true,
      team: { select: { id: true, season: true, isMixed: true } },
      opponentTeam: { select: { id: true, season: true, isMixed: true } },
      _count: { select: { callups: true } },
    },
  });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  if (match.date.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Non puoi modificare la disponibilità per partite già giocate" },
      { status: 400 }
    );
  }

  if (callupsLocked(match._count.callups)) {
    return NextResponse.json({ error: CALLUPS_LOCKED_ERROR }, { status: 409 });
  }

  // Per la Karibu di stagione valgono le rose di tutte le squadre della stagione.
  const teamIds = await rosterTeamIds(
    [match.team, match.opponentTeam].filter((t): t is NonNullable<typeof t> => !!t)
  );

  // Chi risponde: la scheda del figlio, oppure l'account di chi chiama.
  let person: { kind: "user" | "child"; id: string };
  if (childId) {
    // Verifica che il childId appartenga al genitore loggato
    const child = await prisma.child.findFirst({
      where: { id: childId, ...guardianOf(userId) },
      select: { id: true, userId: true },
    });
    if (!child) {
      return NextResponse.json({ error: "Non autorizzato per questo figlio" }, { status: 403 });
    }
    // Verifica membership del child in una delle squadre della partita
    const membership = await prisma.teamMembership.findFirst({
      where: { teamId: { in: teamIds }, OR: personRows(child) },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Il figlio non fa parte delle squadre di questa partita" },
        { status: 403 }
      );
    }
    person = { kind: "child", id: child.id };
  } else {
    const ownCard = await prisma.child.findUnique({ where: { userId }, select: { id: true } });
    const membership = await prisma.teamMembership.findFirst({
      where: {
        teamId: { in: teamIds },
        OR: [{ userId }, ...(ownCard ? [{ childId: ownCard.id }] : [])],
      },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Non fai parte delle squadre di questa partita" },
        { status: 403 }
      );
    }
    person = { kind: "user", id: userId };
  }

  // La risposta della persona o di un genitore vale più di quella dello staff.
  await saveAvailability({ matchId, person, available, setByStaff: false });

  return NextResponse.json({ ok: true, available });
}
