import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { PUSH_STAT_RETENTION_MONTHS } from "@/lib/notifications/pushStats";
import { SHARE_STAT_RETENTION_MONTHS } from "@/lib/metrics/shareStats";
import { saveWeeklyActivitySnapshot } from "@/lib/metrics/loadEngagementMetrics";

// Vercel Cron — eseguito ogni domenica alle 03:00 UTC
// Elimina notifiche più vecchie di 90 giorni già lette da tutti, i contatori
// delle push oltre 13 mesi, e salva le famiglie attive della settimana (UX-55:
// dalle sessioni si sa solo l'ultimo uso, quindi la settimana va fotografata
// adesso). È il cron settimanale: niente cron nuovi, sono già 7.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret ?? ""}`;
  // Timing-safe comparison to prevent secret leakage via response time.
  // Also reject when CRON_SECRET is not set.
  const valid =
    !!cronSecret &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  // Only accept requests from Vercel's real cron scheduler.
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!valid || !isVercelCron) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Elimina notifiche vecchie che hanno almeno una lettura
  // (globali lette da almeno qualcuno; targettate lette dall'utente target)
  const { count } = await prisma.appNotification.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      reads: { some: {} }, // ha almeno una riga in AppNotificationRead
    },
  });

  // Elimina anche link-request scadute da più di 90 giorni
  const { count: expiredLinks } = await prisma.linkRequest.deleteMany({
    where: {
      expiresAt: { lt: cutoff },
      status: "PENDING",
    },
  });

  const statsCutoff = new Date();
  statsCutoff.setUTCMonth(statsCutoff.getUTCMonth() - PUSH_STAT_RETENTION_MONTHS);
  const { count: deletedPushStats } = await prisma.pushDailyStat.deleteMany({
    where: { day: { lt: statsCutoff } },
  });

  const shareCutoff = new Date();
  shareCutoff.setUTCMonth(shareCutoff.getUTCMonth() - SHARE_STAT_RETENTION_MONTHS);
  const { count: deletedShareStats } = await prisma.shareVisitStat.deleteMany({
    where: { day: { lt: shareCutoff } },
  });
  // Partite dei giochi (UX-61): stessa durata dei contatori delle condivisioni.
  const { count: deletedGameStats } = await prisma.gameDailyStat.deleteMany({
    where: { day: { lt: shareCutoff } },
  });

  // Una fotografia mancata non deve far fallire la pulizia.
  const weeklyActivity = await saveWeeklyActivitySnapshot().catch((err) => {
    console.error("[cron cleanup] weekly activity", err);
    return null;
  });

  return NextResponse.json({
    deletedNotifications: count,
    deletedExpiredLinks: expiredLinks,
    deletedPushStats,
    deletedShareStats,
    deletedGameStats,
    weeklyActivity,
  });
}
