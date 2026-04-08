import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

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

  const body = await req.json() as {
    title?: string;
    date?: string;
    endDate?: string;
    location?: string;
    description?: string;
  };

  if (!body.title?.trim() || !body.date) {
    return NextResponse.json({ error: "Titolo e data obbligatori" }, { status: 400 });
  }

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
