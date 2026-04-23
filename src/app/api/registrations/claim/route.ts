import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const userId = session.user.id;
  const userName = session.user.name.trim();

  const body = await req.json().catch(() => ({})) as { ids?: string[] };

  // If specific IDs provided, claim only those (verify they're anonymous + name-matching)
  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const eligible = await prisma.registration.findMany({
      where: {
        id: { in: body.ids },
        userId: null,
        childId: null,
        name: { equals: userName, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (eligible.length === 0) {
      return NextResponse.json({ claimed: 0 });
    }

    await prisma.registration.updateMany({
      where: { id: { in: eligible.map((r) => r.id) } },
      data: { userId },
    });

    return NextResponse.json({ claimed: eligible.length });
  }

  // Fallback: claim all anonymous registrations with matching name
  const result = await prisma.registration.updateMany({
    where: {
      userId: null,
      childId: null,
      name: { equals: userName, mode: "insensitive" },
    },
    data: { userId },
  });

  return NextResponse.json({ claimed: result.count });
}
