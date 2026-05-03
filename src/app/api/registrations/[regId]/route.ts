import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ regId: string }> }
) {
  const { regId } = await params;

  const registration = await prisma.registration.findUnique({
    where: { id: regId },
    select: { userId: true, childId: true },
  });

  if (!registration) {
    return NextResponse.json({ error: "Iscrizione non trovata" }, { status: 404 });
  }

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const isOwner = !!(currentUserId && registration.userId === currentUserId);
  const isStaff = await isCoachOrAdmin();

  let isAllowed = false;
  if (!isOwner && !isStaff && currentUserId) {
    if (registration.childId) {
      const child = await prisma.child.findUnique({
        where: { id: registration.childId },
        select: { parentId: true },
      });
      isAllowed = child?.parentId === currentUserId;
    } else if (registration.userId) {
      // Registrazione via userId: controlla se è un figlio del genitore loggato
      const childOfParent = await prisma.child.findFirst({
        where: { userId: registration.userId, parentId: currentUserId },
      });
      isAllowed = !!childOfParent;
    }
  }

  if (!isOwner && !isAllowed && !isStaff) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  await prisma.registration.delete({ where: { id: regId } });
  return new NextResponse(null, { status: 204 });
}
