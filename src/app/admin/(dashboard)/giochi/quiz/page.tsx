import AdminQuizListClient from "@/components/admin/AdminQuizListClient";
import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import { countQuestions, needsReview } from "@/lib/games/quizRules";
import { loadGameMetrics } from "@/lib/metrics/loadGameMetrics";

// Lo stato dei quiz si legge dal database, non dalla cache del sito: qui conta
// quello appena salvato.
export const dynamic = "force-dynamic";

/** Giorni delle partite contate in ogni riga. */
const WINDOW_DAYS = 30;

/** Quiz del club (UX-67), solo admin: l'elenco, da cui si apre la revisione delle domande. */
export default async function AdminQuizPage() {
  await requireAdminPage("/admin/giochi");
  const [quizzes, metrics] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        titleEn: true,
        descriptionEn: true,
        visibility: true,
        questions: {
          select: {
            status: true,
            textEn: true,
            answersEn: true,
            explanationEn: true,
            shown: true,
            correctCount: true,
          },
        },
      },
    }),
    loadGameMetrics(WINDOW_DAYS),
  ]);

  return (
    <AdminQuizListClient
      windowDays={WINDOW_DAYS}
      quizzes={quizzes.map(({ questions, ...q }) => ({
        ...q,
        counts: countQuestions(questions),
        toReview: questions.filter((x) => needsReview(x.shown, x.correctCount)).length,
        plays: metrics.quizPlaysById[q.id] ?? 0,
      }))}
    />
  );
}
