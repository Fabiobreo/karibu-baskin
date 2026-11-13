import { NextRequest, NextResponse } from "next/server";
import { adminActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { afterQuizWrite } from "@/lib/games/quizAdmin";
import { QuizQuestionActionSchema, QuizQuestionSchema } from "@/lib/schemas/quiz";

type Params = { params: Promise<{ id: string }> };

/**
 * PUT — una domanda di un quiz (UX-67), solo admin. Con `action` si approva,
 * si rimette in prova o se ne azzerano le statistiche (dopo averla riscritta);
 * altrimenti il corpo è la domanda intera. Modificare una domanda approvata non
 * la rimette in prova: la modifica la fa l'admin, che approva.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const who = await adminActor();
  if ("error" in who) return who.error;
  const { id } = await params;
  const raw: unknown = await req.json().catch(() => null);

  try {
    const before = await prisma.quizQuestion.findUnique({
      where: { id },
      select: { id: true, text: true, status: true, shown: true, correctCount: true },
    });
    if (!before) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

    const action = QuizQuestionActionSchema.safeParse(raw);
    if (action.success) {
      const data =
        action.data.action === "approve"
          ? { status: "APPROVED" as const, approvedAt: new Date() }
          : action.data.action === "draft"
            ? { status: "DRAFT" as const, approvedAt: null }
            : { shown: 0, correctCount: 0 };
      const question = await prisma.quizQuestion.update({ where: { id }, data });
      afterQuizWrite({
        actorId: who.actorId,
        action: "UPDATE_QUIZ_QUESTION",
        targetType: "QuizQuestion",
        targetId: id,
        before: { status: before.status, shown: before.shown, correct: before.correctCount },
        after: { action: action.data.action },
      });
      return NextResponse.json(question);
    }

    const parsed = QuizQuestionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
        { status: 400 }
      );
    }
    const { approve, ...fields } = parsed.data;
    const question = await prisma.quizQuestion.update({
      where: { id },
      data: {
        ...fields,
        ...(approve && before.status !== "APPROVED"
          ? { status: "APPROVED" as const, approvedAt: new Date() }
          : {}),
      },
    });
    afterQuizWrite({
      actorId: who.actorId,
      action: "UPDATE_QUIZ_QUESTION",
      targetType: "QuizQuestion",
      targetId: id,
      before: { text: before.text, status: before.status },
      after: { text: question.text, status: question.status },
    });
    return NextResponse.json(question);
  } catch (err) {
    console.error("[quiz] modifica domanda", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

/** DELETE — elimina una domanda con le sue statistiche. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const who = await adminActor();
  if ("error" in who) return who.error;
  const { id } = await params;
  try {
    const question = await prisma.quizQuestion.findUnique({
      where: { id },
      select: { quizId: true, text: true },
    });
    if (!question) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    await prisma.quizQuestion.delete({ where: { id } });
    afterQuizWrite({
      actorId: who.actorId,
      action: "DELETE_QUIZ_QUESTION",
      targetType: "QuizQuestion",
      targetId: id,
      before: question,
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[quiz] elimina domanda", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
