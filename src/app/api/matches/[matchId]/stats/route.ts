import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const stats = await prisma.playerMatchStats.findMany({
    where: { matchId },
    include: {
      user: { select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true } },
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
    },
  });
  return NextResponse.json(stats);
}

// Upsert batch: riceve array di stats per la partita
export async function PUT(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const body = await req.json() as Array<{
    userId?: string;
    childId?: string;
    points?: number;
    baskets?: number;
    fouls?: number;
    minutesPlayed?: number | null;
    notes?: string;
  }>;

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Array di statistiche richiesto" }, { status: 400 });
  }

  // Upsert ogni riga
  const results = await Promise.all(
    body.map((s) => {
      if (s.userId) {
        return prisma.playerMatchStats.upsert({
          where: { matchId_userId: { matchId, userId: s.userId } },
          create: {
            matchId,
            userId: s.userId,
            points: s.points ?? 0,
            baskets: s.baskets ?? 0,
            fouls: s.fouls ?? 0,
            minutesPlayed: s.minutesPlayed ?? null,
            notes: s.notes?.trim() || null,
          },
          update: {
            points: s.points ?? 0,
            baskets: s.baskets ?? 0,
            fouls: s.fouls ?? 0,
            minutesPlayed: s.minutesPlayed ?? null,
            notes: s.notes?.trim() || null,
          },
        });
      } else if (s.childId) {
        return prisma.playerMatchStats.upsert({
          where: { matchId_childId: { matchId, childId: s.childId } },
          create: {
            matchId,
            childId: s.childId,
            points: s.points ?? 0,
            baskets: s.baskets ?? 0,
            fouls: s.fouls ?? 0,
            minutesPlayed: s.minutesPlayed ?? null,
            notes: s.notes?.trim() || null,
          },
          update: {
            points: s.points ?? 0,
            baskets: s.baskets ?? 0,
            fouls: s.fouls ?? 0,
            minutesPlayed: s.minutesPlayed ?? null,
            notes: s.notes?.trim() || null,
          },
        });
      }
      return null;
    })
  );

  return NextResponse.json(results.filter(Boolean));
}
