import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export type CalendarEventType = "training" | "match" | "event";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string;       // ISO
  endDate?: string;   // ISO
  color: string;      // hex
  teamName?: string;
  opponent?: string;
  isHome?: boolean;
  result?: string | null;
  location?: string;
  href?: string;
}

export async function GET(req: Request) {
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
        team: { select: { name: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.match.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        date: true,
        isHome: true,
        venue: true,
        result: true,
        team: { select: { name: true, color: true } },
        opponent: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.event.findMany({
      where: {
        OR: [
          { date: { gte: start, lt: end } },
          { endDate: { gte: start, lt: end } },
        ],
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
      color: t.team?.color ?? "#FF6D00",
      teamName: t.team?.name,
      href: `/allenamento/${t.dateSlug ?? t.id}`,
    })),
    ...matches.map((m) => ({
      id: m.id,
      type: "match" as const,
      title: m.isHome
        ? `vs ${m.opponent.name}`
        : `@ ${m.opponent.name}`,
      date: m.date.toISOString(),
      color: m.team?.color ?? "#F44336",
      teamName: m.team?.name,
      opponent: m.opponent.name,
      isHome: m.isHome,
      result: m.result,
      location: m.venue ?? undefined,
    })),
    ...events.map((e) => ({
      id: e.id,
      type: "event" as const,
      title: e.title,
      date: e.date.toISOString(),
      endDate: e.endDate?.toISOString(),
      color: "#039BE5",
      location: e.location ?? undefined,
    })),
  ];

  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return NextResponse.json(result);
}
