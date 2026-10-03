import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { matchVevent, singleEventCalendar } from "@/lib/calendar/ics";
import { matchLocation } from "@/lib/clubVenue";
import { slugify } from "@/lib/slugUtils";

type Params = { params: Promise<{ matchId: string }> };

/**
 * "Aggiungi al calendario" di una partita (UX-50): un file .ics con un solo
 * impegno, da importare. Stesso VEVENT (e stesso UID) del feed
 * `/api/calendar/export.ics`, cosi' chi e' abbonato non lo vede doppio.
 * Solo squadre, orario (UTC) e luogo: niente nomi di persone, niente note.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const rl = checkRateLimit(getClientIp(req), "match-event-ics", 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }
  const { matchId } = await params;

  const match = await prisma.match.findFirst({
    where: { OR: [{ id: matchId }, { slug: matchId }] },
    select: {
      id: true,
      date: true,
      isHome: true,
      venue: true,
      opponentTeamId: true,
      team: { select: { name: true } },
      opponent: { select: { name: true, address: true, city: true } },
      opponentTeam: { select: { name: true } },
    },
  });
  if (!match) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";
  const { label } = matchLocation({
    isHome: match.isHome,
    venue: match.venue,
    opponent: match.opponent,
    internal: !!match.opponentTeamId,
  });
  const ics = singleEventCalendar(
    matchVevent({
      id: match.id,
      date: match.date,
      isHome: match.isHome,
      teamName: match.team.name,
      opponentName,
      location: label,
    })
  );
  const filename = `${slugify(`${match.team.name} ${opponentName}`) || "partita"}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Un file scaricato il calendario lo importa: e' quello che si vuole qui.
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
