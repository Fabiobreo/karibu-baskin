import { NextRequest, NextResponse } from "next/server";
import { adminActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { afterQuizWrite } from "@/lib/games/quizAdmin";
import { QuizQuestionSchema } from "@/lib/schemas/quiz";

type Params = { params: Promise<{ id: string }> };

/** POST — nuova domanda di un quiz (UX-67), solo admin. Nasce in prova, salvo "Salva e approva". */
export async function POST(req: NextRequest, { params }: Params) {
  const who = await adminActor();
  if ("error" in who) return who.error;
  const { id: quizId } = await params;

  const parsed = QuizQuestionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { approve, ...fields } = parsed.data;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
    if (!quiz) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    const question = await prisma.quizQuestion.create({
      data: {
        ...fields,
        quizId,
        status: approve ? "APPROVED" : "DRAFT",
        approvedAt: approve ? new Date() : null,
      },
    });
    afterQuizWrite({
      actorId: who.actorId,
      action: "CREATE_QUIZ_QUESTION",
      targetType: "QuizQuestion",
      targetId: question.id,
      after: { quizId, text: question.text, status: question.status },
    });
    return NextResponse.json(question, { status: 201 });
  } catch (err) {
    console.error("[quiz] nuova domanda", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
