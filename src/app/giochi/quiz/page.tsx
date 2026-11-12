import { Container, Box } from "@mui/material";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import BaskinQuiz from "@/components/games/BaskinQuiz";
import { auth } from "@/lib/authjs";
import { isMemberRole, isStaffRole } from "@/lib/authRoles";
import { getBaskinQuiz, QUIZ_READY } from "@/lib/content/baskinQuiz";
import { prisma } from "@/lib/db";
import { columnSx } from "@/lib/layout";
import { parseChallengeCode, parseChallengeScore } from "@/lib/games/quiz";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Quiz del Baskin",
  description:
    "Quanto ne sai di baskin? 5 domande sulle regole, sui ruoli e sul Karibu, con la spiegazione dopo ogni risposta.",
  path: "/giochi/quiz",
  noindex: !QUIZ_READY,
});

// Quiz del Baskin (UX-61): per tutti, anche senza account. Chi è tesserato
// e ha fatto l'accesso ha in più la sua migliore partita.
interface QuizPageProps {
  searchParams: Promise<{ sfida?: string | string[]; p?: string | string[] }>;
}

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const [session, t, locale, params] = await Promise.all([
    auth(),
    getTranslations("pages.games"),
    getLocale(),
    searchParams,
  ]);
  // Link di sfida (`?sfida=<codice>&p=<punteggio>`): stesse 5 domande di chi l'ha mandato.
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const challengeCode = parseChallengeCode(first(params.sfida));
  const challenge = challengeCode
    ? { code: challengeCode, score: parseChallengeScore(first(params.p)) }
    : null;
  // Prima della revisione del club: solo anteprima dello staff.
  if (!QUIZ_READY && !isStaffRole(session?.user?.appRole)) notFound();

  const member = isMemberRole(session?.user?.appRole) && !!session?.user?.id;
  const best = member
    ? ((
        await prisma.user.findUnique({
          where: { id: session!.user!.id },
          select: { quizBest: true },
        })
      )?.quizBest ?? null)
    : null;

  return (
    <>
      <PageHero column="main" title={t("quiz.title")} subtitle={t("quiz.subtitle")} />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("main")}>
          <BaskinQuiz
            bank={getBaskinQuiz(locale)}
            member={member}
            initialBest={best}
            challenge={challenge}
          />
        </Box>
      </Container>
    </>
  );
}
