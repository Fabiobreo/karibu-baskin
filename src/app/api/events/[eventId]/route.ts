import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { EventUpdateSchema } from "@/lib/schemas/event";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ eventId: string }> };

export async function PUT(req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = EventUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const body = parsed.data;

  const { eventId } = await params;
  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.location !== undefined && { location: body.location?.trim() || null }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
      },
    });
    return NextResponse.json(event);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { eventId } = await params;
  try {
    await prisma.event.delete({ where: { id: eventId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
    }
    throw err;
  }
  if (session?.user?.id) {
    logAudit({ actorId: session.user.id, action: "DELETE_EVENT", targetType: "Event", targetId: eventId }).catch((err) => console.error("[audit] delete event", err));
  }
  return new NextResponse(null, { status: 204 });
}
