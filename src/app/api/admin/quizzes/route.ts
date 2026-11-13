import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { adminActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugUtils";
import { afterQuizWrite } from "@/lib/games/quizAdmin";
import { QuizCreateSchema } from "@/lib/schemas/quiz";

/**
 * POST — nuovo quiz (UX-67), solo admin. Nasce spento e in fondo all'elenco:
 * si accende quando ha abbastanza domande approvate.
 */
export async function POST(req: NextRequest) {
  const who = await adminActor();
  if ("error" in who) return who.error;

  const parsed = QuizCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  try {
    const base = slugify(parsed.data.title) || "quiz";
    const [taken, last] = await Promise.all([
      prisma.quiz.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } }),
      prisma.quiz.aggregate({ _max: { position: true } }),
    ]);
    const used = new Set(taken.map((q) => q.slug));
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

    const quiz = await prisma.quiz.create({
      data: { ...parsed.data, slug, visibility: "OFF", position: (last._max.position ?? -1) + 1 },
      select: { id: true, slug: true, title: true },
    });
    afterQuizWrite({
      actorId: who.actorId,
      action: "CREATE_QUIZ",
      targetType: "Quiz",
      targetId: quiz.id,
      after: { title: quiz.title, slug: quiz.slug },
    });
    return NextResponse.json(quiz, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Esiste già un quiz con questo titolo" }, { status: 409 });
    }
    console.error("[quiz] crea", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
