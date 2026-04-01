import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// GET /api/users/me — profilo dell'utente loggato
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
      createdAt: true,
      sportRole: true,
      sportRoleVariant: true,
      sportRoleSuggested: true,
      sportRoleSuggestedVariant: true,
      childLinks: {
        include: { child: { select: { id: true, name: true, email: true, image: true, appRole: true } } },
      },
      parentLinks: {
        include: { parent: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  return NextResponse.json(user);
}
