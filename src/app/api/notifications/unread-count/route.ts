import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  const joinedAt = user?.createdAt ?? new Date(0);

  const count = await prisma.appNotification.count({
    where: {
      reads: { none: { userId } },
      OR: [{ targetUserId: null, createdAt: { gte: joinedAt } }, { targetUserId: userId }],
    },
  });

  return NextResponse.json({ count });
}
