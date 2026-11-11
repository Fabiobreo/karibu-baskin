import { prisma } from "@/lib/db";
import { isPushStatType, romeDay, type PushStatType } from "./pushStatTypes";

export { isPushStatType, romeDay, PUSH_STAT_TYPES, type PushStatType } from "./pushStatTypes";

/**
 * Contatori aggregati delle push (UX-55): quante ne partono e quante vengono
 * toccate, per tipo e giorno. Nessun identificativo di persona o dispositivo:
 * serve a capire se un tipo di notifica funziona, non chi ha aperto cosa.
 */

/** Righe oltre questa età le cancella il cron cleanup-notifications. */
export const PUSH_STAT_RETENTION_MONTHS = 13;

async function increment(type: PushStatType, field: "sent" | "opened", by: number, now: Date) {
  const day = romeDay(now);
  await prisma.pushDailyStat.upsert({
    where: { day_type: { day, type } },
    create: { day, type, [field]: by },
    update: { [field]: { increment: by } },
  });
}

/**
 * Somma gli invii riusciti di un lotto: una scrittura per lotto, non per
 * destinatario. Non lancia mai: un contatore mancato non deve far fallire
 * l'invio delle notifiche.
 */
export async function recordPushSent(type: unknown, count: number, now = new Date()) {
  if (count <= 0 || !isPushStatType(type)) return;
  try {
    await increment(type, "sent", count, now);
  } catch (err) {
    console.error("[pushStats] sent", err);
  }
}

/** Una notifica toccata (dal service worker, `POST /api/push/opened`). */
export async function recordPushOpened(type: PushStatType, now = new Date()) {
  await increment(type, "opened", 1, now);
}
