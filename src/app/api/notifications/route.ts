import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;
  const userId = session.user.id;

  const [notifications, total] = await Promise.all([
    prisma.appNotification.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
    }),
    prisma.appNotification.count(),
  ]);

  const mapped = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    url: n.url,
    createdAt: n.createdAt,
    isRead: n.reads.length > 0,
  }));

  return NextResponse.json({ notifications: mapped, total, hasMore: skip + limit < total });
}
