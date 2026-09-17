import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export type CalendarEventType = "training" | "match" | "event";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string; // ISO
  endDate?: string; // ISO
  /**
   * Squadra dell'evento. L'API non decide piu' un `color` gia' cotto: il colore
   * dello sfondo dipende dal TIPO (e quindi dal tema chiaro/scuro, che il server
   * non conosce), mentre il colore squadra serve solo come accento. Risolve
   * entrambi il client con `eventVisual` in `@/lib/calendar/eventColors`.
   */
  teamId?: string;
  teamColor?: string | null;
  teamName?: string;
  opponent?: string;
  isHome?: boolean;
  result?: string | null;
  location?: string;
  href?: string;
}

export async function GET(req: Request) {
  const rl = checkRateLimit(getClientIp(req), "get-calendar", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  let start: Date, end: Date;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 1);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const [trainings, matches, events] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        title: true,
        date: true,
        endTime: true,
        dateSlug: true,
        team: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.match.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        slug: true,
        date: true,
        isHome: true,
        venue: true,
        result: true,
        team: { select: { id: true, name: true, color: true } },
        opponent: { select: { name: true } },
        opponentTeam: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.event.findMany({
      // Un evento è rilevante per il mese se si sovrappone all'intervallo:
      // inizia prima della fine del mese E (non ha fine OR finisce dopo l'inizio del mese)
      where: {
        date: { lt: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const result: CalendarEvent[] = [
    ...trainings.map((t) => ({
      id: t.id,
      type: "training" as const,
      title: t.title,
      date: t.date.toISOString(),
      endDate: t.endTime?.toISOString(),
      teamId: t.team?.id,
      teamColor: t.team?.color ?? null,
      teamName: t.team?.name,
      href: `/allenamento/${t.dateSlug ?? t.id}`,
    })),
    ...matches.map((m) => {
      const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
      return {
        id: m.id,
        type: "match" as const,
        title: m.isHome ? `vs ${opponentName}` : `@ ${opponentName}`,
        date: m.date.toISOString(),
        teamId: m.team?.id,
        teamColor: m.team?.color ?? null,
        teamName: m.team?.name,
        opponent: opponentName,
        isHome: m.isHome,
        result: m.result,
        location: m.venue ?? undefined,
        href: `/partite/${m.slug ?? m.id}`,
      };
    }),
    ...events.map((e) => ({
      id: e.id,
      type: "event" as const,
      title: e.title,
      date: e.date.toISOString(),
      endDate: e.endDate?.toISOString(),
      location: e.location ?? undefined,
      href: `/eventi/${e.slug ?? e.id}`,
    })),
  ];

  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return NextResponse.json(result);
}
