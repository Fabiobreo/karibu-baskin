import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToAll } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export async function GET() {
  const sessions = await prisma.trainingSession.findMany({
    orderBy: { date: "asc" },
    include: {
      _count: { select: { registrations: true } },
    },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, date, endTime, dateSlug } = body as { title?: string; date?: string; endTime?: string; dateSlug?: string };

  if (!title?.trim() || !date) {
    return NextResponse.json({ error: "Titolo e data sono obbligatori" }, { status: 400 });
  }

  const session = await prisma.trainingSession.create({
    data: {
      title: title.trim(),
      date: new Date(date),
      endTime: endTime ? new Date(endTime) : null,
      ...(dateSlug ? { dateSlug } : {}),
    },
    include: { _count: { select: { registrations: true } } },
  });

  // Notifica push (fire-and-forget)
  const timeRange = session.endTime
    ? `${format(session.date, "HH:mm")}–${format(session.endTime, "HH:mm")}`
    : `ore ${format(session.date, "HH:mm")}`;
  sendPushToAll({
    title: "🏀 Nuovo allenamento",
    body: `${session.title} — ${format(session.date, "EEEE d MMMM", { locale: it })}, ${timeRange}`,
    url: `/allenamento/${session.dateSlug ?? session.id}`,
  }).catch(() => {});
  createAppNotification({
    type: "NEW_TRAINING",
    title: "Nuovo allenamento",
    body: `${session.title} — ${format(session.date, "EEEE d MMMM", { locale: it })}, ${timeRange}`,
    url: `/allenamento/${session.dateSlug ?? session.id}`,
  }).catch(() => {});

  return NextResponse.json(session, { status: 201 });
}
