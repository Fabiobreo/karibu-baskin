import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/webpush";
import { createTargetedAppNotifications } from "@/lib/appNotifications";
import { MIN_CALLUPS } from "@/lib/constants";

// Vercel Cron — eseguito giornalmente.
// Notifica i giocatori (User o genitori di Child) membri di una squadra che ha
// una partita ufficiale entro 14 giorni e che non hanno ancora marcato la
// propria disponibilità (nessun record MatchAvailability per quel match).
// Si ripete giornalmente finché il match ha meno di MIN_CALLUPS convocati —
// quando lo staff ha completato le convocazioni, smettiamo di stressare i
// giocatori rimasti.
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
  const limit = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: { date: { gte: now, lte: limit } },
    select: {
      id: true,
      date: true,
      teamId: true,
      opponentTeamId: true,
      team: { select: { name: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
      _count: { select: { callups: true } },
    },
  });

  const pending = matches.filter((m) => m._count.callups < MIN_CALLUPS);
  if (pending.length === 0) {
    return NextResponse.json({ reminded: 0, matches: 0 });
  }

  let totalReminded = 0;
  let matchesNotified = 0;

  for (const m of pending) {
    const teamIds = [m.teamId, m.opponentTeamId].filter((x): x is string => !!x);

    const [memberships, availabilities] = await Promise.all([
      prisma.teamMembership.findMany({
        where: { teamId: { in: teamIds } },
        select: { userId: true, childId: true },
      }),
      prisma.matchAvailability.findMany({
        where: { matchId: m.id },
        select: { userId: true, childId: true },
      }),
    ]);

    const respondedUserIds = new Set(availabilities.filter((a) => a.userId).map((a) => a.userId!));
    const respondedChildIds = new Set(
      availabilities.filter((a) => a.childId).map((a) => a.childId!)
    );

    const missingUserIds = memberships
      .filter((mb) => mb.userId && !respondedUserIds.has(mb.userId))
      .map((mb) => mb.userId!);
    const missingChildIds = memberships
      .filter((mb) => mb.childId && !respondedChildIds.has(mb.childId))
      .map((mb) => mb.childId!);

    const targetUserIds = new Set<string>(missingUserIds);

    if (missingChildIds.length > 0) {
      const children = await prisma.child.findMany({
        where: { id: { in: missingChildIds } },
        select: { parentId: true, userId: true },
      });
      for (const c of children) {
        targetUserIds.add(c.parentId);
        if (c.userId) targetUserIds.add(c.userId);
      }
    }

    if (targetUserIds.size === 0) continue;

    const dateLabel = format(m.date, "EEEE d MMMM", { locale: it });
    const timeLabel = format(m.date, "HH:mm");
    const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
    const url = "/profilo/disponibilita";
    const title = "🏀 Disponibilità partita";
    const body = `${m.team.name} vs ${opponentName} ${dateLabel} alle ${timeLabel}: segnala se sei disponibile.`;

    const ids = [...targetUserIds];

    sendPushToUsers(ids, { title, body, url, type: "SYSTEM" }).catch((err) =>
      console.error("[push] availability reminder", err)
    );

    createTargetedAppNotifications(ids, {
      type: "SYSTEM",
      title: "Disponibilità partita",
      body,
      url,
    }).catch((err) => console.error("[notification] availability reminder", err));

    totalReminded += ids.length;
    matchesNotified += 1;
  }

  return NextResponse.json({ reminded: totalReminded, matches: matchesNotified });
}
