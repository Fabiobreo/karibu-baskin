import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import BaskinQuiz from "@/components/games/BaskinQuiz";
import PreviewChip from "@/components/games/PreviewChip";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { columnSx } from "@/lib/layout";
import { loadQuizBank, loadQuizPreviewBank, loadQuizSummaries } from "@/lib/games/loadGameSettings";
import { parseChallengeCode, parseChallengeScore, quizPath } from "@/lib/games/quiz";
import { gameAccess } from "@/lib/games/gameSettings";
import { isPlayableIn, quizAccess } from "@/lib/games/quizRules";
import { loginHref } from "@/lib/loginReturn";
import { RADIUS } from "@/lib/radius";
import { buildMetadata } from "@/lib/seo";

interface QuizPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sfida?: string | string[]; p?: string | string[] }>;
}

export async function generateMetadata({ params }: QuizPageProps) {
  const [{ slug }, quizzes] = await Promise.all([params, loadQuizSummaries()]);
  const quiz = quizzes.find((q) => q.slug === slug);
  return buildMetadata({
    title: quiz?.title ?? "Quiz",
    description: quiz?.description ?? "",
    path: quizPath(slug),
    // Indicizzato solo un quiz per tutti con una partita intera (UX-67).
    noindex: !quiz || quiz.visibility !== "PUBLIC" || !isPlayableIn(quiz.counts, "it"),
  });
}

// Un quiz del club (UX-61, UX-67). Chi lo vede lo decide l'admin quiz per
// quiz in `/admin/giochi/quiz`: spento (solo anteprima dello staff), solo
// tesserati o per tutti. Chi è tesserato ha in più la sua migliore partita.
export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const [{ slug }, session, quizzes, t, tGames, locale, sp] = await Promise.all([
    params,
    auth(),
    loadQuizSummaries(),
    getTranslations("pages.games.quiz"),
    getTranslations("pages.games"),
    getLocale(),
    searchParams,
  ]);
  const quiz = quizzes.find((q) => q.slug === slug);
  if (!quiz) notFound();
  const role = session?.user?.appRole;
  const access = quizAccess(quiz, role, locale);
  const en = locale === "en";
  const title = (en ? quiz.titleEn : null) ?? quiz.title;

  // Link di sfida (`?sfida=<codice>&p=<punteggio>`): stesse 5 domande di chi l'ha mandato.
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const challengeCode = parseChallengeCode(first(sp.sfida));
  const challenge = challengeCode
    ? { code: challengeCode, score: parseChallengeScore(first(sp.p)) }
    : null;

  const preview = access === "preview";
  // Anteprima dello staff: un chip sulla fascia, non una frase (UX-70).
  const hero = (
    <PageHero
      column="main"
      title={title}
      action={preview ? <PreviewChip label={tGames("previewChip")} /> : undefined}
    />
  );
  const notice = (children: React.ReactNode) => (
    <>
      {hero}
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Paper
          variant="outlined"
          sx={{ ...columnSx("main"), p: { xs: 2.5, md: 3 }, borderRadius: RADIUS.lg }}
        >
          {children}
        </Paper>
      </Container>
    </>
  );

  if (access === "hidden") {
    // Acceso, ma senza abbastanza domande tradotte: lo si dice, non un 404
    // (chi arriva da una sfida in italiano deve capire perché).
    const inOtherLanguage =
      en && gameAccess(quiz.visibility, role) !== "hidden" && isPlayableIn(quiz.counts, "it");
    if (!inOtherLanguage) notFound();
    return notice(
      <>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {t("notInLanguage")}
        </Typography>
        <Button href="/giochi" variant="outlined">
          {t("backToGames")}
        </Button>
      </>
    );
  }

  // Quiz dei tesserati e chi guarda non lo è: niente domande nel payload.
  if (access === "members") {
    const query = new URLSearchParams();
    if (challenge) {
      query.set("sfida", challenge.code);
      if (challenge.score !== null) query.set("p", String(challenge.score));
    }
    const back = query.size > 0 ? `${quizPath(slug)}?${query.toString()}` : quizPath(slug);
    return notice(
      <>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {t("membersOnly")}
        </Typography>
        {session?.user ? (
          <Typography variant="body1">{t("membersGuest")}</Typography>
        ) : (
          <Button href={loginHref(back)} variant="contained" size="large">
            {t("membersLogin")}
          </Button>
        )}
      </>
    );
  }

  const userId = session?.user?.id;
  const member = isMemberRole(role) && !!userId;
  const [bank, best] = await Promise.all([
    preview ? loadQuizPreviewBank(quiz.id, locale) : loadQuizBank(quiz.id, locale),
    member
      ? prisma.quizBest
          .findUnique({
            where: { userId_quizId: { userId: userId!, quizId: quiz.id } },
            select: { best: true },
          })
          .then((r) => r?.best ?? null)
      : Promise.resolve(null),
  ]);
  if (bank.length === 0) {
    return notice(<Typography variant="body1">{t("notInLanguage")}</Typography>);
  }

  return (
    <>
      {hero}
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("main")}>
          <BaskinQuiz
            quizId={quiz.id}
            slug={quiz.slug}
            title={title}
            bank={bank}
            member={member}
            initialBest={best}
            challenge={challenge}
            membersOnly={quiz.visibility === "MEMBERS"}
            preview={preview}
            art={quiz.art}
          />
        </Box>
      </Container>
    </>
  );
}
