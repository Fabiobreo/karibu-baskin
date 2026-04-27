import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { EventCreateSchema } from "@/lib/schemas/event";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // [CLAUDE - 09:00] Validazione Zod — previene titoli vuoti e date malformate
  const raw = await req.json().catch(() => null);
  const parsed = EventCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const body = parsed.data;

  const event = await prisma.event.create({
    data: {
      title: body.title.trim(),
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : null,
      location: body.location?.trim() || null,
      description: body.description?.trim() || null,
    },
  });
  return NextResponse.json(event, { status: 201 });
}
