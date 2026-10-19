import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { inBackground } from "@/lib/background";
import { deliverNotices } from "@/lib/notifications/matchNotify";
import { noteNotices } from "@/lib/suggestions/suggestionNotify";
import { SuggestionNoteCreateSchema } from "@/lib/schemas/suggestion";

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
  const isReply = parsed.data.kind === "REPLY";
  const writerId = session.user.id;

  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, notes: { select: { authorId: true } } },
    });
    if (!suggestion) {
      return NextResponse.json({ error: "Suggerimento non trovato" }, { status: 404 });
    }
    if (isReply && suggestion.userId === null) {
      return NextResponse.json(
        {
          error:
            "Chi ha scritto il suggerimento non ha più un account: puoi solo lasciare una nota interna",
        },
        { status: 409 }
      );
    }

    // Scrivere su un suggerimento nuovo vuol dire che è stato letto.
    const [note] = await prisma.$transaction([
      prisma.suggestionNote.create({
        data: { suggestionId: id, authorId: writerId, body: parsed.data.body, isReply },
        select: {
          id: true,
          body: true,
          isReply: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true, customImage: true } },
        },
      }),
      ...(suggestion.status === "NUOVO"
        ? [prisma.suggestion.update({ where: { id }, data: { status: "LETTO" } })]
        : []),
    ]);
    const status = suggestion.status === "NUOVO" ? "LETTO" : suggestion.status;

    inBackground(
      deliverNotices(
        noteNotices({
          suggestionId: id,
          suggestionAuthorId: suggestion.userId,
          writerId,
          writerName: session.user.name ?? null,
          previousNoteAuthorIds: suggestion.notes.map((n) => n.authorId),
          body: parsed.data.body,
          isReply,
        }),
        "suggestion note"
      ),
      "notification suggestion note"
    );

    return NextResponse.json({ note, status }, { status: 201 });
  } catch (err) {
    console.error("[suggestions] nota non salvata", err);
    return NextResponse.json({ error: "Nota non salvata" }, { status: 500 });
  }
}
