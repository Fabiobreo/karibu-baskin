import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToAll } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";
import { SessionCreateSchema } from "@/lib/schemas/session";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const upcoming = searchParams.get("upcoming") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const rawLimit = parseInt(searchParams.get("limit") ?? "0", 10);
  const usePagination = rawLimit > 0;
  const limit = usePagination ? Math.min(100, Math.max(1, rawLimit)) : 0;

  const now = new Date();

  const sessions = await prisma.trainingSession.findMany({
    where: upcoming ? { date: { gte: now } } : undefined,
    orderBy: { date: upcoming ? "asc" : "desc" },
    ...(usePagination && { skip: (page - 1) * limit, take: limit }),
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
  });

  if (usePagination) {
    const total = await prisma.trainingSession.count({
      where: upcoming ? { date: { gte: now } } : undefined,
    });
    return NextResponse.json({ sessions, total, page, limit, pages: Math.ceil(total / limit) });
  }

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = SessionCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const { title, date, endTime, dateSlug, allowedRoles, restrictTeamId, openRoles } = parsed.data;

  const session = await prisma.trainingSession.create({
    data: {
      title: title.trim(),
      date: new Date(date),
      endTime: endTime ? new Date(endTime) : null,
      ...(dateSlug ? { dateSlug } : {}),
      allowedRoles: allowedRoles ?? [],
      restrictTeamId: restrictTeamId ?? null,
      openRoles: openRoles ?? [],
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
    type: "NEW_TRAINING",
  }, false, "NEW_TRAINING").catch(() => {});
  createAppNotification({
    type: "NEW_TRAINING",
    title: "Nuovo allenamento",
    body: `${session.title} — ${format(session.date, "EEEE d MMMM", { locale: it })}, ${timeRange}`,
    url: `/allenamento/${session.dateSlug ?? session.id}`,
  }).catch(() => {});

  return NextResponse.json(session, { status: 201 });
}
