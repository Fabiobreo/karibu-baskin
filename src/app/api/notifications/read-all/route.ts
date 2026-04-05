import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const userId = session.user.id;

  const unread = await prisma.appNotification.findMany({
    where: {
      reads: { none: { userId } },
      OR: [{ targetUserId: null }, { targetUserId: userId }],
    },
    select: { id: true },
  });

  if (unread.length === 0) return NextResponse.json({ marked: 0 });

  await prisma.appNotificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, userId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ marked: unread.length });
}
