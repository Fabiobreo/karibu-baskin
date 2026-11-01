import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { withGuardians } from "@/lib/person";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { rosterTeamIds } from "@/lib/matches/mixedTeam";
import { callupsLocked, loadAvailabilityLookup } from "@/lib/matches/availability";
import { formatRomeDayLabel, formatRomeTime } from "@/lib/dateUtils";

// Vercel Cron — eseguito giornalmente.
// Notifica i giocatori (User o genitori di Child) membri di una squadra che ha
// una partita ufficiale entro 14 giorni e che non hanno ancora marcato la
// propria disponibilità (nessun record MatchAvailability per quel match).
// Si ripete giornalmente finché lo staff non fa le convocazioni: da lì le
// risposte non si cambiano più (callupsLocked), quindi non c'è niente da chiedere.
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
      team: { select: { id: true, name: true, season: true, isMixed: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { id: true, name: true, season: true, isMixed: true } },
      _count: { select: { callups: true } },
    },
  });

  const pending = matches.filter((m) => !callupsLocked(m._count.callups));
  if (pending.length === 0) {
    return NextResponse.json({ reminded: 0, matches: 0 });
  }

  let totalReminded = 0;
  let matchesNotified = 0;

  for (const m of pending) {
    // Per la Karibu di stagione si sollecitano i tesserati di tutta la stagione.
    const teamIds = await rosterTeamIds(
      [m.team, m.opponentTeam].filter((t): t is NonNullable<typeof t> => !!t)
    );

    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true, childId: true },
    });

    // Persona unica (@/lib/person): la risposta di chi ha account e scheda può
    // stare su tutte e due le chiavi, e il lookup le guarda entrambe.
    const memberUserIds = memberships.flatMap((mb) => (mb.userId ? [mb.userId] : []));
    const memberChildIds = memberships.flatMap((mb) => (mb.childId ? [mb.childId] : []));
    const answers = await loadAvailabilityLookup(m.id, memberUserIds, memberChildIds);
    const missingUserIds = memberUserIds.filter((id) => answers.forUser(id) === null);
    const missingChildIds = memberChildIds.filter((id) => answers.forChild(id) === null);

    const targetUserIds = new Set<string>(missingUserIds);

    if (missingChildIds.length > 0) {
      const children = await prisma.child.findMany({
        where: { id: { in: missingChildIds } },
        select: { guardians: { select: { userId: true } }, userId: true },
      });
      for (const c of children) {
        for (const g of c.guardians) targetUserIds.add(g.userId);
        if (c.userId) targetUserIds.add(c.userId);
      }
    }

    if (targetUserIds.size === 0) continue;

    const dateLabel = formatRomeDayLabel(m.date);
    const timeLabel = formatRomeTime(m.date);
    const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
    const url = "/profilo/disponibilita";
    const title = "🏀 Disponibilità partita";
    const body = `${m.team.name} vs ${opponentName} ${dateLabel} alle ${timeLabel}: segnala se sei disponibile.`;

    // Anche i genitori di chi ha un account: possono rispondere per lui.
    const ids = await withGuardians([...targetUserIds]);

    // Nei cron si aspetta tutto prima di rispondere: dopo la risposta Vercel
    // congela la funzione. Ognuno ha il suo catch, così una push fallita non
    // ferma la notifica in-app né il resto del giro.
    await Promise.all([
      sendPushToUsers(ids, { title, body, url, type: "SYSTEM" }).catch((err) =>
        console.error("[push] availability reminder", err)
      ),
      createTargetedAppNotifications(ids, {
        type: "SYSTEM",
        title: "Disponibilità partita",
        body,
        url,
      }).catch((err) => console.error("[notification] availability reminder", err)),
    ]);

    totalReminded += ids.length;
    matchesNotified += 1;
  }

  return NextResponse.json({ reminded: totalReminded, matches: matchesNotified });
}
