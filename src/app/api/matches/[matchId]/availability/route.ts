import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { AvailabilitySchema } from "@/lib/schemas";

type Params = { params: Promise<{ matchId: string }> };

// PUT /api/matches/[matchId]/availability
// Body: { available: boolean, childId?: string }
// - L'utente marca la propria disponibilità OPPURE quella di un figlio.
// - Solo membri della squadra (User o Child) della partita possono marcare.
// - Non si può modificare la disponibilità per partite già giocate.
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
    select: { id: true, date: true, teamId: true, opponentTeamId: true },
  });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  if (match.date.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Non puoi modificare la disponibilità per partite già giocate" },
      { status: 400 }
    );
  }

  const teamIds = [match.teamId, match.opponentTeamId].filter((x): x is string => !!x);

  if (childId) {
    // Verifica che il childId appartenga al genitore loggato
    const child = await prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child || child.parentId !== userId) {
      return NextResponse.json({ error: "Non autorizzato per questo figlio" }, { status: 403 });
    }
    // Verifica membership del child in una delle squadre della partita
    const membership = await prisma.teamMembership.findFirst({
      where: { childId, teamId: { in: teamIds } },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Il figlio non fa parte delle squadre di questa partita" },
        { status: 403 }
      );
    }

    await prisma.matchAvailability.upsert({
      where: { matchId_childId: { matchId, childId } },
      create: { matchId, childId, available },
      update: { available },
    });
  } else {
    const membership = await prisma.teamMembership.findFirst({
      where: { userId, teamId: { in: teamIds } },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Non fai parte delle squadre di questa partita" },
        { status: 403 }
      );
    }

    await prisma.matchAvailability.upsert({
      where: { matchId_userId: { matchId, userId } },
      create: { matchId, userId, available },
      update: { available },
    });
  }

  return NextResponse.json({ ok: true, available });
}
