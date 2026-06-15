import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { EventOptionsReplaceSchema } from "@/lib/schemas";

type Params = { params: Promise<{ eventId: string }> };

// GET — elenco opzioni dell'evento (pubblico, ordinato).
export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params;
  const options = await prisma.eventOption.findMany({
    where: { eventId },
    orderBy: [{ order: "asc" }, { startsAt: "asc" }],
    select: { id: true, label: true, startsAt: true, kind: true, order: true },
  });
  return NextResponse.json(options);
}

// PUT — sostituisce in blocco l'elenco opzioni (staff). Le opzioni con `id`
// vengono aggiornate, quelle nuove create, quelle mancanti eliminate (con le
// relative selezioni via cascade).
export async function PUT(req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { eventId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = EventOptionsReplaceSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  const incoming = parsed.data.options;
  const keepIds = incoming.map((o) => o.id).filter((id): id is string => !!id);

  await prisma.$transaction([
    // Elimina le opzioni rimosse (e in cascata le loro selezioni).
    prisma.eventOption.deleteMany({
      where: { eventId, ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}) },
    }),
    // Aggiorna le esistenti e crea le nuove.
    ...incoming.map((o, i) => {
      const data = {
        label: o.label.trim(),
        startsAt: o.startsAt ? new Date(o.startsAt) : null,
        kind: o.kind,
        order: o.order ?? i,
      };
      return o.id
        ? prisma.eventOption.update({ where: { id: o.id }, data })
        : prisma.eventOption.create({ data: { eventId, ...data } });
    }),
  ]);

  const options = await prisma.eventOption.findMany({
    where: { eventId },
    orderBy: [{ order: "asc" }, { startsAt: "asc" }],
    select: { id: true, label: true, startsAt: true, kind: true, order: true },
  });
  return NextResponse.json(options);
}
