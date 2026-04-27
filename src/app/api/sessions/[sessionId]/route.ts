import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { SessionUpdateSchema } from "@/lib/schemas/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // Prova prima per ID (CUID), poi per dateSlug (es. "2025-03-15T18:00")
  const session = await prisma.trainingSession.findFirst({
    where: { OR: [{ id: sessionId }, { dateSlug: sessionId }] },
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
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

  // [CLAUDE - 09:00] Validazione Zod — previene titoli vuoti e array ruoli malformati
  const raw = await req.json().catch(() => null);
  const parsed = SessionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const body = parsed.data;

  const { sessionId } = await params;
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.date !== undefined) data.date = new Date(body.date);
  if ("endTime" in body) data.endTime = body.endTime ? new Date(body.endTime) : null;
  if (body.allowedRoles !== undefined) data.allowedRoles = body.allowedRoles;
  if ("restrictTeamId" in body) data.restrictTeamId = body.restrictTeamId ?? null;
  if (body.openRoles !== undefined) data.openRoles = body.openRoles;

  const session = await prisma.trainingSession.update({
    where: { id: sessionId },
    data,
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
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
