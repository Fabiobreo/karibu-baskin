import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// DELETE /api/users/me/children/[childId] — rimuove il collegamento con un figlio
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { childId } = await params;

  await prisma.parentChild.deleteMany({
    where: { parentId: session.user.id, childId },
  });

  return NextResponse.json({ ok: true });
}
