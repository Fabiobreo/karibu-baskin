import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isMemberRole } from "@/lib/authRoles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { QuizBestSchema } from "@/lib/schemas/games";

/**
 * PUT — migliore partita del quiz del Baskin (UX-61), solo per i tesserati.
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
  const { score } = parsed.data;
  const userId = session.user.id;

  try {
    // Solo se più alto: la condizione sta nell'update, così due partite
    // finite insieme non si sovrascrivono a vicenda.
    await prisma.user.updateMany({
      where: { id: userId, OR: [{ quizBest: null }, { quizBest: { lt: score } }] },
      data: { quizBest: score },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quizBest: true },
    });
    return NextResponse.json({ best: user?.quizBest ?? score });
  } catch (err) {
    console.error("[games] quiz best", err);
    return NextResponse.json({ error: "Errore nel salvataggio" }, { status: 500 });
  }
}
