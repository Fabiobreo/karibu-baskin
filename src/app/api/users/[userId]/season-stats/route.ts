import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const season = req.nextUrl.searchParams.get("season") ?? null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const stats = await prisma.playerMatchStats.findMany({
    where: {
      userId,
      ...(season ? { match: { team: { season } } } : {}),
    },
    select: { points: true, baskets: true, fouls: true, assists: true, rebounds: true },
  });

  const matchesPlayed = stats.length;
  const totals = stats.reduce(
    (acc, s) => ({
      points: acc.points + s.points,
      baskets: acc.baskets + s.baskets,
      fouls: acc.fouls + s.fouls,
      assists: acc.assists + s.assists,
      rebounds: acc.rebounds + s.rebounds,
    }),
    { points: 0, baskets: 0, fouls: 0, assists: 0, rebounds: 0 }
  );

  return NextResponse.json({
    matchesPlayed,
    ...totals,
    avgPoints: matchesPlayed > 0 ? Math.round((totals.points / matchesPlayed) * 10) / 10 : 0,
    season,
  });
}
