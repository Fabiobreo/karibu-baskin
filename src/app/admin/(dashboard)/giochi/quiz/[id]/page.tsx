import { notFound } from "next/navigation";
import AdminQuizQuestionsClient from "@/components/admin/AdminQuizQuestionsClient";
import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";

// Sempre dal database: qui si rivede quello appena salvato.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

/** Domande di un quiz (UX-67), solo admin: revisione, approvazione e statistiche. */
export default async function AdminQuizQuestionsPage({ params }: Props) {
  await requireAdminPage("/admin/giochi");
  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      visibility: true,
      questionCount: true,
      questions: {
        // In prova prima, poi nell'ordine in cui sono state scritte.
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          status: true,
          level: true,
          topic: true,
          text: true,
          answers: true,
          correct: true,
          explanation: true,
          textEn: true,
          answersEn: true,
          explanationEn: true,
          shown: true,
          correctCount: true,
        },
      },
    },
  });
  if (!quiz) notFound();
  const { questions, ...rest } = quiz;
  return <AdminQuizQuestionsClient quiz={rest} questions={questions} />;
}
