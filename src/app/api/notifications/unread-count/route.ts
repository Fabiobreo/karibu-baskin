import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.appNotification.count({
    where: { reads: { none: { userId: session.user.id } } },
  });

  return NextResponse.json({ count });
}
