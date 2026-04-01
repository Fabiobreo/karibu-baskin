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
    select: { userId: true },
  });

  if (!registration) {
    return NextResponse.json({ error: "Iscrizione non trovata" }, { status: 404 });
  }

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const isOwner = currentUserId && registration.userId === currentUserId;
  const isStaff = await isCoachOrAdmin();

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  await prisma.registration.delete({ where: { id: regId } });
  return new NextResponse(null, { status: 204 });
}
