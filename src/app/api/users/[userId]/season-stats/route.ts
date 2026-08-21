import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const rl = checkRateLimit(getClientIp(req), "user-season-stats", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  const { userId } = await params;
  const season = req.nextUrl.searchParams.get("season") ?? null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const stats = await prisma.playerMatchStats.findMany({
    where: {
      userId,
      ...(season ? { match: { team: { season } } } : {}),
    },
    select: {
      points: true,
      twoPointers: true,
      threePointers: true,
      freeThrows: true,
      fouls: true,
      illegalFouls: true,
      shotsAttempted: true,
    },
  });

  const matchesPlayed = stats.length;
  const totals = stats.reduce(
    (acc, s) => ({
      points: acc.points + s.points,
      twoPointers: acc.twoPointers + s.twoPointers,
      threePointers: acc.threePointers + s.threePointers,
      freeThrows: acc.freeThrows + s.freeThrows,
      fouls: acc.fouls + s.fouls,
      illegalFouls: acc.illegalFouls + s.illegalFouls,
      shotsAttempted: acc.shotsAttempted + s.shotsAttempted,
    }),
    {
      points: 0,
      twoPointers: 0,
      threePointers: 0,
      freeThrows: 0,
      fouls: 0,
      illegalFouls: 0,
      shotsAttempted: 0,
    }
  );
  const baskets = totals.twoPointers + totals.threePointers + totals.freeThrows;

  return NextResponse.json({
    matchesPlayed,
    ...totals,
    baskets,
    avgPoints: matchesPlayed > 0 ? Math.round((totals.points / matchesPlayed) * 10) / 10 : 0,
    season,
  });
}
