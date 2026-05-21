import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { sendPushToAll } from "@/lib/webpush";
import { createTargetedAppNotifications } from "@/lib/appNotifications";
import { MIN_CALLUPS } from "@/lib/constants";

// Vercel Cron — eseguito giornalmente alle 09:00 UTC.
// Notifica COACH/ADMIN per le partite ufficiali entro 3 giorni con meno di
// MIN_CALLUPS convocati. Idempotente: ogni partita riceve al massimo un
// reminder (campo Match.callupReminderSentAt).
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret ?? ""}`;
  const valid =
    !!cronSecret &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!valid || !isVercelCron) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const now = new Date();
  const limit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.match.findMany({
    where: {
      date: { gte: now, lte: limit },
      callupReminderSentAt: null,
    },
    select: {
      id: true,
      date: true,
      team: { select: { name: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
      _count: { select: { callups: true } },
    },
  });

  const toRemind = candidates.filter((m) => m._count.callups < MIN_CALLUPS);
  if (toRemind.length === 0) {
    return NextResponse.json({ reminded: 0 });
  }

  const staff = await prisma.user.findMany({
    where: { appRole: { in: ["COACH", "ADMIN"] } },
    select: { id: true },
  });
  const staffIds = staff.map((s) => s.id);

  for (const m of toRemind) {
    const dateLabel = format(m.date, "EEEE d MMMM", { locale: it });
    const timeLabel = format(m.date, "HH:mm");
    const url = `/admin/partite/${m.id}/convocazioni`;
    const count = m._count.callups;
    const title = "📋 Convocazioni mancanti";
    const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
    const body =
      count === 0
        ? `${m.team.name} vs ${opponentName} è ${dateLabel} alle ${timeLabel} e non ci sono ancora convocati.`
        : `${m.team.name} vs ${opponentName} è ${dateLabel} alle ${timeLabel}: solo ${count}/${MIN_CALLUPS} convocati.`;

    sendPushToAll({ title, body, url, type: "SYSTEM" }, true).catch((err) =>
      console.error("[push] callup reminder", err)
    );

    if (staffIds.length > 0) {
      createTargetedAppNotifications(staffIds, {
        type: "SYSTEM",
        title: "Convocazioni mancanti",
        body,
        url,
      }).catch((err) => console.error("[notification] callup reminder", err));
    }

    await prisma.match.update({
      where: { id: m.id },
      data: { callupReminderSentAt: now },
    });
  }

  return NextResponse.json({ reminded: toRemind.length });
}
