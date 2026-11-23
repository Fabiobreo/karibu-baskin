import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { EventOptionsReplaceSchema } from "@/lib/schemas";
import { answerLossConflict, lostAnswers } from "@/lib/polls/pollEdit";

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
// relative selezioni via cascade, e se ne hanno solo con `confirmAnswerLoss`).
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
  const keepIds = new Set(incoming.flatMap((o) => (o.id ? [o.id] : [])));
  const saved = await prisma.eventOption.findMany({
    where: { eventId },
    select: { id: true, label: true, _count: { select: { selections: true } } },
  });
  const savedIds = new Set(saved.map((o) => o.id));
  if ([...keepIds].some((id) => !savedIds.has(id))) {
    return NextResponse.json(
      { error: "Un extra non esiste più: ricarica la pagina" },
      { status: 409 }
    );
  }

  // Un extra tolto porta via le risposte: solo se chi modifica l'ha confermato.
  const removed = saved.filter((o) => !keepIds.has(o.id));
  const lost = lostAnswers(removed, new Map(saved.map((o) => [o.id, o._count?.selections ?? 0])));
  if (lost.length > 0 && !parsed.data.confirmAnswerLoss) {
    return NextResponse.json(answerLossConflict(lost), { status: 409 });
  }

  await prisma.$transaction([
    // Elimina le opzioni rimosse (e in cascata le loro selezioni).
    prisma.eventOption.deleteMany({
      where: { eventId, id: { in: removed.map((o) => o.id) } },
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
