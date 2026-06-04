import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin, isAdminUser } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";

type Params = { params: Promise<{ id: string; noteId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const { noteId } = await params;
  const note = await prisma.suggestionNote.findUnique({
    where: { id: noteId },
    select: { authorId: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }
  // Solo l'autore della nota o un ADMIN possono eliminarla.
  if (note.authorId !== session.user.id && !(await isAdminUser())) {
    return NextResponse.json({ error: "Puoi eliminare solo le tue note" }, { status: 403 });
  }
  await prisma.suggestionNote.delete({ where: { id: noteId } });
  return new NextResponse(null, { status: 204 });
}
