import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { EventAttendanceSchema } from "@/lib/schemas";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ eventId: string }> };

// Fine entro cui un evento è ancora "futuro" (per multi-giorno usa endDate).
function isPast(event: { date: Date; endDate: Date | null }): boolean {
  return (event.endDate ?? event.date).getTime() <= Date.now();
}

// GET /api/events/[eventId]/attendance
// Ritorna i conteggi per stato + la risposta dell'utente (self + figli).
// Lo staff riceve anche l'elenco nominativo dei partecipanti.
export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params;
  const session = await auth();

  const attendances = await prisma.eventAttendance.findMany({
    where: { eventId },
    select: {
      status: true,
      userId: true,
      childId: true,
      user: { select: { id: true, name: true, image: true, customImage: true } },
      child: { select: { id: true, name: true, parentId: true } },
    },
  });

  const counts = { GOING: 0, MAYBE: 0, NOT_GOING: 0 } as Record<string, number>;
  for (const a of attendances) counts[a.status] += 1;

  const userId = session?.user?.id ?? null;
  const mine = userId
    ? attendances
        .filter((a) => a.userId === userId || a.child?.parentId === userId)
        .map((a) => ({ childId: a.childId ?? null, status: a.status }))
    : [];

  const staff = await isCoachOrAdmin();
  const list = staff
    ? attendances.map((a) => ({
        status: a.status,
        name: a.user?.name ?? a.child?.name ?? "—",
        image: a.user?.customImage ?? a.user?.image ?? null,
        isChild: !!a.childId,
      }))
    : undefined;

  return NextResponse.json({ counts, mine, list });
}

// PUT /api/events/[eventId]/attendance
// Body: { status: "GOING"|"MAYBE"|"NOT_GOING", childId?: string }
export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const userId = session.user.id;

  const { eventId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = EventAttendanceSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { status, childId } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, date: true, endDate: true },
  });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  if (isPast(event)) {
    return NextResponse.json(
      { error: "Non puoi modificare la presenza per un evento già concluso" },
      { status: 400 }
    );
  }

  // Se rispondo per un figlio, verifico che sia mio.
  if (childId) {
    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: userId },
      select: { id: true },
    });
    if (!child) {
      return NextResponse.json({ error: "Figlio non valido" }, { status: 403 });
    }
  }

  const where = childId
    ? { eventId_childId: { eventId, childId } }
    : { eventId_userId: { eventId, userId } };
  const data = childId ? { eventId, childId, status } : { eventId, userId, status };

  const attendance = await prisma.eventAttendance.upsert({
    where,
    create: data,
    update: { status },
  });

  return NextResponse.json(attendance);
}
