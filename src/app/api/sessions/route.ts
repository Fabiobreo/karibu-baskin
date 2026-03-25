import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { date: "asc" },
    include: {
      _count: { select: { registrations: true } },
    },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, date } = body as { title?: string; date?: string };

  if (!title?.trim() || !date) {
    return NextResponse.json({ error: "Titolo e data sono obbligatori" }, { status: 400 });
  }

  const session = await prisma.session.create({
    data: {
      title: title.trim(),
      date: new Date(date),
    },
    include: { _count: { select: { registrations: true } } },
  });

  return NextResponse.json(session, { status: 201 });
}
