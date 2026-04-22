import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const result = await prisma.registration.updateMany({
    where: {
      userId: null,
      childId: null,
      name: { equals: session.user.name.trim(), mode: "insensitive" },
    },
    data: { userId: session.user.id },
  });

  return NextResponse.json({ claimed: result.count });
}
