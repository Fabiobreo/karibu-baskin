import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const LOCATION_DEFAULT = "Polisportivo Gino Cosaro, Via del Vigo 11, 36075 Montecchio Maggiore (VI)";
const PRODID = "-//ASD Karibu Baskin//Karibu Baskin App//IT";

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let pos = 0;
  let first = true;
  while (pos < bytes.length) {
    const chunk = bytes.slice(pos, pos + (first ? 75 : 74));
    parts.push((first ? "" : " ") + new TextDecoder().decode(chunk));
    pos += first ? 75 : 74;
    first = false;
  }
  return parts.join("\r\n");
}

function vevent(uid: string, summary: string, dtstart: Date, dtend: Date, description?: string, location?: string): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}@karibubaskin.it`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(dtstart)}`,
    `DTEND:${icsDate(dtend)}`,
    foldLine(`SUMMARY:${icsEscape(summary)}`),
  ];
  if (description) lines.push(foldLine(`DESCRIPTION:${icsEscape(description)}`));
  if (location) lines.push(foldLine(`LOCATION:${icsEscape(location)}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export async function GET() {
  const now = new Date();

  const [trainings, matches, events] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { date: { gte: now } },
      select: { id: true, title: true, date: true, endTime: true },
      orderBy: { date: "asc" },
    }),
    prisma.match.findMany({
      where: { date: { gte: now } },
      select: { id: true, date: true, isHome: true, venue: true, team: { select: { name: true } }, opponent: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.event.findMany({
      where: { date: { gte: now } },
      select: { id: true, title: true, date: true, endDate: true, description: true, location: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const vevents: string[] = [];

  for (const t of trainings) {
    const start = t.date;
    const end = t.endTime ?? new Date(t.date.getTime() + 90 * 60 * 1000);
    vevents.push(vevent(`training-${t.id}`, t.title, start, end, undefined, LOCATION_DEFAULT));
  }

  for (const m of matches) {
    const start = m.date;
    const end = new Date(m.date.getTime() + 90 * 60 * 1000);
    const summary = m.isHome
      ? `${m.team.name} vs ${m.opponent.name}`
      : `${m.team.name} @ ${m.opponent.name}`;
    const location = m.isHome ? LOCATION_DEFAULT : (m.venue ?? undefined);
    vevents.push(vevent(`match-${m.id}`, summary, start, end, undefined, location));
  }

  for (const e of events) {
    const start = e.date;
    const end = e.endDate ?? new Date(e.date.getTime() + 60 * 60 * 1000);
    vevents.push(vevent(
      `event-${e.id}`,
      e.title,
      start,
      end,
      e.description ?? undefined,
      e.location ?? undefined,
    ));
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Karibu Baskin",
    "X-WR-CALDESC:Allenamenti\\, partite e eventi Karibu Baskin Montecchio Maggiore",
    "X-WR-TIMEZONE:Europe/Rome",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="karibu-baskin.ics"',
      "Cache-Control": "no-store",
    },
  });
}
