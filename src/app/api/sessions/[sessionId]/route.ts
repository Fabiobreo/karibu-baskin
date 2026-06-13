import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { SessionUpdateSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { notifySessionOpen } from "@/lib/notifications/sessionNotify";

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
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = SessionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const { sessionId } = await params;
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.date !== undefined) data.date = new Date(body.date);
  if ("endTime" in body) data.endTime = body.endTime ? new Date(body.endTime) : null;
  if (body.dateSlug !== undefined) data.dateSlug = body.dateSlug;
  if (body.allowedRoles !== undefined) data.allowedRoles = body.allowedRoles;
  if ("restrictTeamId" in body) data.restrictTeamId = body.restrictTeamId ?? null;
  if (body.openRoles !== undefined) data.openRoles = body.openRoles;

  const before = await prisma.trainingSession.findUnique({ where: { id: sessionId } });

  let session;
  try {
    session = await prisma.trainingSession.update({
      where: { id: sessionId },
      data,
      include: {
        _count: { select: { registrations: true } },
        restrictTeam: { select: { id: true, name: true, color: true } },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    }
    throw err;
  }

  if (session.registrationOpen) {
    notifySessionOpen(session, "updated");
  }

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "UPDATE_SESSION",
      targetType: "TrainingSession",
      targetId: sessionId,
      before: before
        ? {
            title: before.title,
            date: before.date.toISOString(),
            endTime: before.endTime?.toISOString() ?? null,
            allowedRoles: before.allowedRoles,
            restrictTeamId: before.restrictTeamId,
            openRoles: before.openRoles,
          }
        : null,
      after: {
        title: session.title,
        date: session.date.toISOString(),
        endTime: session.endTime?.toISOString() ?? null,
        allowedRoles: session.allowedRoles,
        restrictTeamId: session.restrictTeamId,
        openRoles: session.openRoles,
      },
    }).catch((err) => console.error("[audit] update session", err));
  }

  return NextResponse.json(session);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { sessionId } = await params;
  const before = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  try {
    await prisma.trainingSession.delete({ where: { id: sessionId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
    }
    throw err;
  }

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "DELETE_SESSION",
      targetType: "TrainingSession",
      targetId: sessionId,
      before: before
        ? {
            title: before.title,
            date: before.date.toISOString(),
          }
        : null,
    }).catch((err) => console.error("[audit] delete session", err));
  }

  return new NextResponse(null, { status: 204 });
}
