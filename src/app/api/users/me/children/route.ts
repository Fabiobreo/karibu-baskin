import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// GET /api/users/me/children — figli collegati al genitore loggato
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const links = await prisma.parentChild.findMany({
    where: { parentId: session.user.id },
    include: {
      child: { select: { id: true, name: true, email: true, image: true, appRole: true } },
    },
  });

  return NextResponse.json(links.map((l) => l.child));
}

// POST /api/users/me/children — collega un figlio tramite email
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { childEmail } = await req.json();
  if (!childEmail) {
    return NextResponse.json({ error: "Email richiesta" }, { status: 400 });
  }

  const child = await prisma.user.findUnique({ where: { email: childEmail } });
  if (!child) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }
  if (child.id === session.user.id) {
    return NextResponse.json({ error: "Non puoi collegare te stesso" }, { status: 400 });
  }

  try {
    const link = await prisma.parentChild.create({
      data: { parentId: session.user.id, childId: child.id },
      include: { child: { select: { id: true, name: true, email: true, appRole: true } } },
    });
    return NextResponse.json(link.child, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Collegamento già esistente" }, { status: 409 });
  }
}
