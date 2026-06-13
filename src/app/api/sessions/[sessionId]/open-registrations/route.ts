import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { notifySessionOpen } from "@/lib/notifications/sessionNotify";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { sessionId } = await params;

  let session;
  try {
    const existing = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      select: { registrationOpenedAt: true },
    });
    session = await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        registrationOpen: true,
        registrationOpenedAt: existing?.registrationOpenedAt ?? new Date(),
        openReminderSentAt: null,
      },
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

  notifySessionOpen(session, "new");

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "OPEN_REGISTRATIONS",
      targetType: "TrainingSession",
      targetId: sessionId,
      after: { date: session.date.toISOString(), title: session.title },
    }).catch((err) => console.error("[audit] open registrations", err));
  }

  return NextResponse.json(session);
}
