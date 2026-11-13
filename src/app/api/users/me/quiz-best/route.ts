import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isMemberRole } from "@/lib/authRoles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { QuizBestSchema } from "@/lib/schemas/games";

/**
 * PUT — migliore partita in un quiz (UX-61, UX-67), solo per i tesserati.
 * Salva il punteggio solo se è più alto di quello già salvato e risponde con
 * il migliore.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!isMemberRole(session.user.appRole)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const rl = checkRateLimit(getClientIp(req), "quiz-best", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = QuizBestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }
  const { quizId, score } = parsed.data;
  const userId = session.user.id;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, questionCount: true },
    });
    if (!quiz) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    // Mai più punti delle domande di una partita di quel quiz.
    if (score > quiz.questionCount) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    // Solo se più alto: la condizione sta nell'update, così due partite
    // finite insieme non si sovrascrivono a vicenda.
    const { count } = await prisma.quizBest.updateMany({
      where: { userId, quizId, best: { lt: score } },
      data: { best: score },
    });
    if (count === 0) {
      try {
        await prisma.quizBest.create({ data: { userId, quizId, best: score } });
      } catch (err) {
        // Esiste già, con un punteggio uguale o più alto: va bene così.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
          throw err;
        }
      }
    }
    const row = await prisma.quizBest.findUnique({
      where: { userId_quizId: { userId, quizId } },
      select: { best: true },
    });
    return NextResponse.json({ best: row?.best ?? score });
  } catch (err) {
    console.error("[games] quiz best", err);
    return NextResponse.json({ error: "Errore nel salvataggio" }, { status: 500 });
  }
}
