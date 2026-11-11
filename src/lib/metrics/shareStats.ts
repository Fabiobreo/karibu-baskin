import { prisma } from "@/lib/db";
import { romeDay } from "@/lib/notifications/pushStatTypes";
import type { ShareCampaign, ShareSource } from "@/lib/shareLinks";

/**
 * Visite arrivate da una condivisione del sito (UX-56), per giorno, campagna
 * e fonte. Come le aperture delle push: si conta quante, mai chi.
 */

/** Righe oltre questa età le cancella il cron cleanup-notifications. */
export const SHARE_STAT_RETENTION_MONTHS = 13;

export async function recordShareVisit(
  campaign: ShareCampaign,
  source: ShareSource,
  now = new Date()
) {
  const day = romeDay(now);
  await prisma.shareVisitStat.upsert({
    where: { day_campaign_source: { day, campaign, source } },
    create: { day, campaign, source, visits: 1 },
    update: { visits: { increment: 1 } },
  });
}
