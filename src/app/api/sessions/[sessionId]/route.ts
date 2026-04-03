import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // Prova prima per ID (CUID), poi per dateSlug (es. "2025-03-15T18:00")
  const session = await prisma.trainingSession.findFirst({
    where: { OR: [{ id: sessionId }, { dateSlug: sessionId }] },
    include: { _count: { select: { registrations: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, date, endTime } = body as {
    title?: string;
    date?: string;
    endTime?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title.trim();
  if (date !== undefined) data.date = new Date(date);
  if ("endTime" in body) data.endTime = endTime ? new Date(endTime) : null;

  const session = await prisma.trainingSession.update({
    where: { id: sessionId },
    data,
    include: { _count: { select: { registrations: true } } },
  });
  return NextResponse.json(session);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { sessionId } = await params;
  await prisma.trainingSession.delete({ where: { id: sessionId } });
  return new NextResponse(null, { status: 204 });
}
