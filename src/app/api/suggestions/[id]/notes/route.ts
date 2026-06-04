import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { SuggestionNoteCreateSchema } from "@/lib/schemas/suggestion";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = SuggestionNoteCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { id } = await params;
  try {
    const note = await prisma.suggestionNote.create({
      data: { suggestionId: id, authorId: session.user.id, body: parsed.data.body },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true, customImage: true } },
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    // P2003 = foreign key violation (suggerimento inesistente)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: "Suggerimento non trovato" }, { status: 404 });
    }
    throw err;
  }
}
