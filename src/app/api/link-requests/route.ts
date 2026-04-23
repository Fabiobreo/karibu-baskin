import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// GET /api/link-requests — richieste di collegamento in attesa per l'utente loggato
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const now = new Date();
  const requests = await prisma.linkRequest.findMany({
    where: {
      targetUserId: session.user.id,
      status: "PENDING",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true, gender: true, birthDate: true } },
      parent: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
