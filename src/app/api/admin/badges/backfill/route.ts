import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { reconcilePlayerBadges } from "@/lib/rating/badgeService";

// POST /api/admin/badges/backfill
// Popola `EarnedBadge` per tutti i giocatori con statistiche, SENZA inviare
// notifiche (notify: false). Idempotente: i badge già registrati vengono
// ignorati. Pensato come azione una tantum dopo l'introduzione del sistema,
// ma ri-eseguibile in sicurezza.
export async function POST() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const [userRows, childRows] = await Promise.all([
    prisma.playerMatchStats.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.playerMatchStats.findMany({
      where: { childId: { not: null } },
      select: { childId: true },
      distinct: ["childId"],
    }),
  ]);

  let unlocked = 0;
  for (const { userId } of userRows) {
    if (!userId) continue;
    const ids = await reconcilePlayerBadges({ userId }, { notify: false });
    unlocked += ids.length;
  }
  for (const { childId } of childRows) {
    if (!childId) continue;
    const ids = await reconcilePlayerBadges({ childId }, { notify: false });
    unlocked += ids.length;
  }

  return NextResponse.json({
    players: userRows.length + childRows.length,
    unlocked,
  });
}
