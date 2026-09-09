import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { computeMatchCoverageBatch } from "@/lib/matches/matchCoverage";

// Vercel Cron — giornaliero alle 09:00 UTC.
// Per ogni partita ufficiale tra 36 e 60 ore da adesso (≈ 48h),
// se almeno un ruolo è sotto la soglia minima di disponibili,
// notifica COACH e ADMIN con la lista dei ruoli scoperti.
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
  const from = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 60 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: { date: { gte: from, lte: to } },
    select: {
      id: true,
      date: true,
      team: { select: { name: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
    },
  });

  if (matches.length === 0) {
    return NextResponse.json({ alerted: 0, matches: 0 });
  }

  const coverages = await computeMatchCoverageBatch(matches.map((m) => m.id));
  const matchesWithShortfall = matches.filter((m) => coverages.get(m.id)?.hasShortfall);
  if (matchesWithShortfall.length === 0) {
    return NextResponse.json({ alerted: 0, matches: 0 });
  }

  const staff = await prisma.user.findMany({
    where: { appRole: { in: ["COACH", "ADMIN"] } },
    select: { id: true },
  });
  const staffIds = staff.map((u) => u.id);
  if (staffIds.length === 0) {
    return NextResponse.json({ alerted: 0, matches: matchesWithShortfall.length });
  }

  let totalAlerted = 0;

  for (const m of matchesWithShortfall) {
    const cov = coverages.get(m.id)!;
    const dateLabel = format(m.date, "EEEE d MMMM", { locale: it });
    const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
    const shortfallDetail = cov.perGroup
      .filter((r) => r.shortfall > 0)
      .map((r) => `${r.label}: ${r.available}/${r.required}`)
      .join(" · ");

    const title = "⚠️ Copertura ruoli insufficiente";
    const body = `${m.team.name} vs ${opponentName} ${dateLabel}: ${shortfallDetail}`;
    const url = "/admin/partite";

    sendPushToUsers(staffIds, { title, body, url, type: "SYSTEM" }).catch((err) =>
      console.error("[push] coverage alert", err)
    );
    createTargetedAppNotifications(staffIds, {
      type: "SYSTEM",
      title: "Copertura ruoli insufficiente",
      body,
      url,
    }).catch((err) => console.error("[notification] coverage alert", err));

    totalAlerted += staffIds.length;
  }

  return NextResponse.json({ alerted: totalAlerted, matches: matchesWithShortfall.length });
}
