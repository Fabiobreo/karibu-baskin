import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { sessionId } = await params;

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { managedAt: new Date() },
  });

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "CONCLUDE_SESSION",
      targetType: "TrainingSession",
      targetId: sessionId,
    }).catch((err) => console.error("[audit] conclude session", err));
  }

  return new NextResponse(null, { status: 204 });
}
