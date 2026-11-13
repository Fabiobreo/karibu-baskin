import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { quizGameKey, recordGamePlay } from "@/lib/games/gameStats";
import { scoreAnswers } from "@/lib/games/quizRules";
import { QuizPlayedSchema } from "@/lib/schemas/games";

/**
 * POST — una partita di un quiz è finita (UX-61, UX-67). Nessuna
 * autenticazione (un quiz può essere per tutti) e nessun dato di chi gioca: si
 * aggiunge uno al contatore del giorno e, per ogni domanda, una uscita e
 * (se la risposta era giusta) una risposta giusta. Le risposte le ricontrolla
 * il server, sulle sole domande approvate di quel quiz.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "quiz-played", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }
  const parsed = QuizPlayedSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }
  const { quizId, answers } = parsed.data;

  try {
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId, status: "APPROVED", id: { in: answers.map((a) => a.id) } },
      select: { id: true, correct: true },
    });
    // Un quiz che non esiste (o senza domande approvate) non conta niente.
    if (questions.length === 0) return new NextResponse(null, { status: 204 });
    const scored = scoreAnswers(answers, questions);
    const right = scored.filter((a) => a.right).map((a) => a.id);
    const wrong = scored.filter((a) => !a.right).map((a) => a.id);
    await prisma.$transaction([
      prisma.quizQuestion.updateMany({
        where: { id: { in: right } },
        data: { shown: { increment: 1 }, correctCount: { increment: 1 } },
      }),
      prisma.quizQuestion.updateMany({
        where: { id: { in: wrong } },
        data: { shown: { increment: 1 } },
      }),
    ]);
    await recordGamePlay(quizGameKey(quizId));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[games] quiz played", err);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
