import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { foldLine, icsDate, icsEscape, sequenceFor } from "@/lib/calendar/ics";

const LOCATION_DEFAULT =
  "Polisportivo Gino Cosaro, Via del Vigo 11, 36075 Montecchio Maggiore (VI)";
const PRODID = "-//ASD Karibu Baskin//Karibu Baskin App//IT";
const CALDESC = "Allenamenti, partite e eventi Karibu Baskin Montecchio Maggiore";

/**
 * Quanto passato tiene il feed.
 *
 * Un calendario SOTTOSCRITTO non e' un elenco di cose da fare: e' lo specchio
 * del feed. Quello che esce dal feed il client lo cancella dal calendario di
 * chi e' iscritto, quindi tenendo solo il futuro gli allenamenti sparivano dal
 * suo calendario appena passati, portandosi via lo storico.
 */
const PAST_WINDOW_MONTHS = 6;

/** Ogni quanto chiedere ai client di ricontrollare il feed. */
const REFRESH = "PT6H";

function vevent(
  uid: string,
  summary: string,
  dtstart: Date,
  dtend: Date,
  options: {
    description?: string;
    location?: string;
    updatedAt?: Date | null;
  } = {}
): string {
  const { description, location, updatedAt } = options;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}@karibubaskin.it`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(dtstart)}`,
    `DTEND:${icsDate(dtend)}`,
    `SEQUENCE:${sequenceFor(dtstart, updatedAt)}`,
    foldLine(`SUMMARY:${icsEscape(summary)}`),
  ];
  if (updatedAt) lines.push(`LAST-MODIFIED:${icsDate(updatedAt)}`);
  if (description) lines.push(foldLine(`DESCRIPTION:${icsEscape(description)}`));
  if (location) lines.push(foldLine(`LOCATION:${icsEscape(location)}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "export-ics", 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }
  // Il pulsante "Scarica .ics" chiede esplicitamente il file; per tutto il
  // resto la risposta va servita inline (vedi gli header in fondo).
  const asDownload = req.nextUrl.searchParams.get("download") === "1";

  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - PAST_WINDOW_MONTHS);

  const [trainings, matches, events] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { date: { gte: from } },
      select: { id: true, title: true, date: true, endTime: true },
      orderBy: { date: "asc" },
    }),
    prisma.match.findMany({
      where: { date: { gte: from } },
      select: {
        id: true,
        date: true,
        isHome: true,
        venue: true,
        team: { select: { name: true } },
        opponent: { select: { name: true } },
        opponentTeam: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.event.findMany({
      // Un evento su piu' giorni resta rilevante finche' non e' finito.
      where: { OR: [{ date: { gte: from } }, { endDate: { gte: from } }] },
      select: {
        id: true,
        title: true,
        date: true,
        endDate: true,
        description: true,
        location: true,
        updatedAt: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const vevents: string[] = [];

  for (const t of trainings) {
    const start = t.date;
    const end = t.endTime ?? new Date(t.date.getTime() + 90 * 60 * 1000);
    vevents.push(vevent(`training-${t.id}`, t.title, start, end, { location: LOCATION_DEFAULT }));
  }

  for (const m of matches) {
    const start = m.date;
    const end = new Date(m.date.getTime() + 90 * 60 * 1000);
    const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
    const summary = m.isHome
      ? `${m.team.name} vs ${opponentName}`
      : `${m.team.name} @ ${opponentName}`;
    const location = m.isHome ? LOCATION_DEFAULT : (m.venue ?? undefined);
    vevents.push(vevent(`match-${m.id}`, summary, start, end, { location }));
  }

  for (const e of events) {
    const start = e.date;
    const end = e.endDate ?? new Date(e.date.getTime() + 60 * 60 * 1000);
    vevents.push(
      vevent(`event-${e.id}`, e.title, start, end, {
        description: e.description ?? undefined,
        location: e.location ?? undefined,
        updatedAt: e.updatedAt,
      })
    );
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    // Niente METHOD: con METHOD:PUBLISH i client leggono il file come un
    // messaggio iCalendar da importare una volta sola, non come feed da
    // seguire. E' meta' del motivo per cui la sottoscrizione non attaccava.
    "X-WR-CALNAME:Karibu Baskin",
    // Anche le righe dell'intestazione vanno piegate: questa arrivava a 77
    // ottetti, fuori dal limite di RFC 5545.
    foldLine(`X-WR-CALDESC:${icsEscape(CALDESC)}`),
    "X-WR-TIMEZONE:Europe/Rome",
    // Senza queste, ogni client decide da se' quando ricontrollare e Google
    // arriva a rileggere il feed una volta al giorno o meno.
    `REFRESH-INTERVAL;VALUE=DURATION:${REFRESH}`,
    `X-PUBLISHED-TTL:${REFRESH}`,
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // `attachment` fa scaricare il file, e un file scaricato il calendario lo
      // IMPORTA: si prendono gli eventi di quel momento e finisce li'. Per
      // sottoscrivere, lo stesso URL deve rispondere inline. Il download resta
      // disponibile a richiesta esplicita.
      "Content-Disposition": asDownload
        ? 'attachment; filename="karibu-baskin.ics"'
        : 'inline; filename="karibu-baskin.ics"',
      "Cache-Control": "no-store",
    },
  });
}
