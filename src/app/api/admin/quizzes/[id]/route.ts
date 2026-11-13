import { NextRequest, NextResponse } from "next/server";
import { adminActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { afterQuizWrite } from "@/lib/games/quizAdmin";
import { canEnableQuiz, countQuestions, missingToEnableText } from "@/lib/games/quizRules";
import { QuizUpdateSchema } from "@/lib/schemas/quiz";

type Params = { params: Promise<{ id: string }> };

/**
 * PUT — modifica un quiz (UX-67), solo admin: titolo e descrizione, chi lo
 * vede (si accende solo con abbastanza domande approvate) e il posto
 * nell'elenco.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const who = await adminActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  const parsed = QuizUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { move, visibility, titleEn, descriptionEn, ...fields } = parsed.data;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        visibility: true,
        questions: { select: { status: true, textEn: true, answersEn: true, explanationEn: true } },
      },
    });
    if (!quiz) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

    if (visibility && visibility !== "OFF" && visibility !== quiz.visibility) {
      const counts = countQuestions(quiz.questions);
      if (!canEnableQuiz(counts)) {
        return NextResponse.json({ error: missingToEnableText(counts) }, { status: 409 });
      }
    }

    if (move) {
      // Le posizioni si rinumerano da capo: dopo un'eliminazione restano buchi.
      const all = await prisma.quiz.findMany({
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      const ids = all.map((q) => q.id);
      const from = ids.indexOf(id);
      const to = move === "up" ? from - 1 : from + 1;
      if (to >= 0 && to < ids.length) {
        [ids[from], ids[to]] = [ids[to], ids[from]];
        await prisma.$transaction(
          ids.map((qid, position) => prisma.quiz.update({ where: { id: qid }, data: { position } }))
        );
      }
    }

    const data = {
      ...fields,
      ...(visibility ? { visibility } : {}),
      ...(titleEn !== undefined ? { titleEn: titleEn || null } : {}),
      ...(descriptionEn !== undefined ? { descriptionEn: descriptionEn || null } : {}),
    };
    const updated =
      Object.keys(data).length > 0
        ? await prisma.quiz.update({ where: { id }, data, select: { id: true } })
        : quiz;

    afterQuizWrite({
      actorId: who.actorId,
      action: "UPDATE_QUIZ",
      targetType: "Quiz",
      targetId: updated.id,
      before: visibility ? { visibility: quiz.visibility } : null,
      after: { ...data, ...(move ? { move } : {}) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quiz] modifica", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

/** DELETE — elimina un quiz con le sue domande, statistiche e migliori partite. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const who = await adminActor();
  if ("error" in who) return who.error;
  const { id } = await params;
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { questions: true } } },
    });
    if (!quiz) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    await prisma.quiz.delete({ where: { id } });
    afterQuizWrite({
      actorId: who.actorId,
      action: "DELETE_QUIZ",
      targetType: "Quiz",
      targetId: id,
      before: { title: quiz.title, questions: quiz._count.questions },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[quiz] elimina", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
