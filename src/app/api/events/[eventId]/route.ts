import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ eventId: string }> };

export async function PUT(req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { eventId } = await params;
  const body = await req.json() as {
    title?: string;
    date?: string;
    endDate?: string | null;
    location?: string;
    description?: string;
  };

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.location !== undefined && { location: body.location.trim() || null }),
      ...(body.description !== undefined && { description: body.description.trim() || null }),
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { eventId } = await params;
  await prisma.event.delete({ where: { id: eventId } });
  return new NextResponse(null, { status: 204 });
}
