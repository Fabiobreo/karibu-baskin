import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { EventRsvpSchema } from "@/lib/schemas";
import { isEventPast } from "@/lib/events";
import { loadFamily } from "@/lib/eventFamily";
import { loadFamilyRsvp, RsvpError, saveFamilyRsvp } from "@/lib/eventRsvp";

type Params = { params: Promise<{ eventId: string }> };

// PUT /api/events/[eventId]/rsvp
// Body: { people: [{ key, status, optionIds, note }], guests: [{ id?, name, status, optionIds, note }] }
// Risposta di tutta la famiglia in un colpo: chi risponde puo' farlo per
// chiunque della sua famiglia (anche gli adulti), e gestisce i propri esterni.
// Presenza all'evento e opzioni sono indipendenti (solo pranzo = No + Pranzo).
export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const selfId = session.user.id;

  const raw = await req.json().catch(() => null);
  const parsed = EventRsvpSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      date: true,
      endDate: true,
      allowGuests: true,
      maxGuests: true,
      options: { select: { id: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  if (isEventPast(event)) {
    return NextResponse.json(
      { error: "Non puoi modificare la presenza per un evento già concluso" },
      { status: 400 }
    );
  }

  const optionIds = event.options.map((o) => o.id);
  let members;
  try {
    members = await loadFamily(selfId);
    await saveFamilyRsvp({
      eventId,
      selfId,
      members,
      optionIds,
      people: parsed.data.people,
      guests: parsed.data.guests,
      allowGuests: event.allowGuests,
      maxGuests: event.maxGuests,
    });
  } catch (err) {
    if (err instanceof RsvpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[rsvp] save", err);
    return NextResponse.json({ error: "Risposta non salvata, riprova" }, { status: 500 });
  }

  // Stato aggiornato: il modulo si riallinea (id degli esterni nuovi, conteggio).
  const [state, going] = await Promise.all([
    loadFamilyRsvp(eventId, selfId, members, optionIds),
    prisma.eventAttendance.count({ where: { eventId, status: "GOING" } }),
  ]);
  return NextResponse.json({ ...state, going });
}
