import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { sendPushToAll } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";

// Vercel Cron — eseguito giornalmente alle 09:00 UTC.
// Notifica COACH/ADMIN per allenamenti futuri (<= 48h) con iscrizioni ancora chiuse
// e per cui non è già stato inviato un reminder.
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
  const limit = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const pending = await prisma.trainingSession.findMany({
    where: {
      registrationOpen: false,
      registrationOpenedAt: null, // mai aperto (non rispammare per chiusi manualmente)
      openReminderSentAt: null,
      date: { gte: now, lte: limit },
    },
    select: { id: true, title: true, date: true, dateSlug: true },
  });

  if (pending.length === 0) {
    return NextResponse.json({ reminded: 0 });
  }

  const staff = await prisma.user.findMany({
    where: { appRole: { in: ["COACH", "ADMIN"] } },
    select: { id: true },
  });
  const staffIds = staff.map((s) => s.id);

  for (const s of pending) {
    const dateLabel = format(s.date, "EEEE d MMMM", { locale: it });
    const timeLabel = format(s.date, "HH:mm");
    const url = `/allenamento/${s.dateSlug ?? s.id}`;
    const title = "⏰ Iscrizioni da aprire";
    const body = `"${s.title}" è ${dateLabel} alle ${timeLabel} e le iscrizioni non sono ancora state aperte.`;

    sendPushToAll({ title, body, url, type: "SYSTEM" }, true).catch((err) =>
      console.error("[push] open reminder", err)
    );

    if (staffIds.length > 0) {
      createTargetedAppNotifications(staffIds, {
        type: "SYSTEM",
        title: "Iscrizioni da aprire",
        body,
        url,
      }).catch((err) => console.error("[notification] open reminder", err));
    }

    await prisma.trainingSession.update({
      where: { id: s.id },
      data: { openReminderSentAt: now },
    });
  }

  return NextResponse.json({ reminded: pending.length });
}
