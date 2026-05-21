import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { notifySessionOpen } from "@/lib/sessionNotify";
import { sessionEndDate } from "@/lib/dateUtils";

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
    session = await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { registrationOpen: false },
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

  // Notifica solo se la chiusura avviene prima della fine dell'allenamento
  // (chiudere un allenamento già passato è solo "manutenzione" — niente notifica).
  const sessEnd = sessionEndDate(session.date, session.endTime);
  if (new Date() < sessEnd) {
    notifySessionOpen(session, "closed");
  }

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "CLOSE_REGISTRATIONS",
      targetType: "TrainingSession",
      targetId: sessionId,
      after: { date: session.date.toISOString(), title: session.title },
    }).catch((err) => console.error("[audit] close registrations", err));
  }

  return NextResponse.json(session);
}
