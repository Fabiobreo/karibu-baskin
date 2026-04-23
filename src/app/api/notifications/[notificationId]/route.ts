import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { notificationId } = await params;
  const userId = session.user.id;

  // Verifica che la notifica esista e sia visibile a questo utente
  const notification = await prisma.appNotification.findUnique({
    where: { id: notificationId },
    select: { targetUserId: true },
  });
  if (!notification) {
    return NextResponse.json({ error: "Notifica non trovata" }, { status: 404 });
  }
  if (notification.targetUserId !== null && notification.targetUserId !== userId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  await prisma.appNotificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    create: { notificationId, userId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
