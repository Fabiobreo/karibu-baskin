import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { EventSelectionsSchema } from "@/lib/schemas";
import { isEventPast } from "@/lib/events";

type Params = { params: Promise<{ eventId: string }> };

// PUT /api/events/[eventId]/selections
// Body: { optionIds: string[], childId?: string, note?: string }
// Sostituisce in blocco le opzioni selezionate dal partecipante per l'evento e
// aggiorna la riga di presenza (status GOING se almeno un'opzione, NOT_GOING
// altrimenti) con le eventuali note.
export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const userId = session.user.id;

  const { eventId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = EventSelectionsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { optionIds, childId, note } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, date: true, endDate: true, options: { select: { id: true } } },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  if (isEventPast(event)) {
    return NextResponse.json(
      { error: "Non puoi modificare la presenza per un evento già concluso" },
      { status: 400 }
    );
  }

  // Tutte le opzioni richieste devono appartenere all'evento.
  const validIds = new Set(event.options.map((o) => o.id));
  if (optionIds.some((id) => !validIds.has(id))) {
    return NextResponse.json({ error: "Opzione non valida" }, { status: 400 });
  }

  // Se rispondo per un figlio, verifico che sia mio.
  if (childId) {
    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: userId },
      select: { id: true },
    });
    if (!child) return NextResponse.json({ error: "Figlio non valido" }, { status: 403 });
  }

  const subject = childId ? { childId } : { userId };
  const eventOptionIds = event.options.map((o) => o.id);
  const attendanceWhere = childId
    ? { eventId_childId: { eventId, childId } }
    : { eventId_userId: { eventId, userId } };
  const status = optionIds.length > 0 ? "GOING" : "NOT_GOING";
  const cleanNote = note?.trim() || null;

  await prisma.$transaction([
    // Azzera le selezioni del partecipante per le opzioni di questo evento.
    prisma.eventOptionSelection.deleteMany({
      where: { optionId: { in: eventOptionIds }, ...subject },
    }),
    // Reinserisce quelle scelte.
    prisma.eventOptionSelection.createMany({
      data: optionIds.map((optionId) => ({ optionId, ...subject })),
      skipDuplicates: true,
    }),
    // Aggiorna/crea la riga di presenza con status derivato + note.
    prisma.eventAttendance.upsert({
      where: attendanceWhere,
      create: { eventId, ...subject, status, note: cleanNote },
      update: { status, note: cleanNote },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
