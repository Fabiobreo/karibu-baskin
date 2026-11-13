import { redirect } from "next/navigation";
import { BASKIN_QUIZ_ID } from "@/lib/games/quizRules";
import { loadQuizSummaries } from "@/lib/games/loadGameSettings";
import { quizPath } from "@/lib/games/quiz";

// I quiz hanno un indirizzo ciascuno (UX-67). I link di sfida già condivisi
// (`/giochi/quiz?sfida=…&p=…`) erano tutti del quiz del Baskin: ci portano lì.
interface OldQuizPageProps {
  searchParams: Promise<{ sfida?: string | string[]; p?: string | string[] }>;
}

export default async function OldQuizPage({ searchParams }: OldQuizPageProps) {
  const [params, quizzes] = await Promise.all([searchParams, loadQuizSummaries()]);
  const baskin = quizzes.find((q) => q.id === BASKIN_QUIZ_ID);
  if (!baskin) redirect("/giochi");
  const query = new URLSearchParams();
  for (const key of ["sfida", "p"] as const) {
    const v = params[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `${quizPath(baskin.slug)}?${qs}` : quizPath(baskin.slug));
}
