import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import { getLocale, getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import { auth } from "@/lib/authjs";
import { isStaffRole } from "@/lib/authRoles";
import { QUIZ_READY } from "@/lib/content/baskinQuiz";
import { loadNextPredictionMatch } from "@/lib/games/loadPredictions";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import { columnSx } from "@/lib/layout";
import { RADIUS } from "@/lib/radius";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Giochi",
  description:
    "I giochi del Karibu Baskin: il quiz sul baskin e il pronostico della prossima partita.",
  path: "/giochi",
  // In sitemap e indicizzata solo quando il quiz è online.
  noindex: !QUIZ_READY,
});

/** Una card per gioco: icona, nome, una riga di spiegazione, un bottone. */
function GameCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ p: { xs: 2.5, md: 3 }, borderRadius: RADIUS.lg }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <Box aria-hidden sx={{ color: "primary.main", display: "flex" }}>
          {icon}
        </Box>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
      </Box>
      {children}
    </Paper>
  );
}

// Giochi del club (UX-61): il quiz del Baskin, per tutti, e il pronostico
// della prossima partita, per i tesserati. Per divertirsi: niente classifiche.
export default async function GiochiPage() {
  const now = new Date();
  const [t, locale, session, nextMatch] = await Promise.all([
    getTranslations("pages.games"),
    getLocale(),
    auth(),
    loadNextPredictionMatch(now),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  // Prima della revisione del club il quiz lo vede solo lo staff, in anteprima.
  const showQuiz = QUIZ_READY || isStaffRole(session?.user?.appRole);

  return (
    <>
      <PageHero column="main" title={t("title")} subtitle={t("subtitle")} />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={2.5} sx={columnSx("main")}>
          {showQuiz && (
            <GameCard icon={<QuizIcon />} title={t("quizCardTitle")}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {t("quizCardBody")}
              </Typography>
              {!QUIZ_READY && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t("quizPreview")}
                </Typography>
              )}
              <Button href="/giochi/quiz" variant="contained" size="large">
                {t("quizCardCta")}
              </Button>
            </GameCard>
          )}

          <GameCard icon={<ScoreboardIcon />} title={t("predictionCardTitle")}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {t("predictionCardBody")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("predictionCardWho")}
            </Typography>
            {nextMatch ? (
              <>
                <Typography variant="subtitle1" component="p" sx={{ mb: 2 }}>
                  {t("predictionCardMatch", {
                    match: nextMatch.isHome
                      ? `${nextMatch.teamName} – ${nextMatch.opponentName}`
                      : `${nextMatch.opponentName} – ${nextMatch.teamName}`,
                    when: formatRome(nextMatch.date, "EEEE d MMMM, HH:mm", { locale: dateLocale }),
                  })}
                </Typography>
                <Button
                  href={`/partite/${nextMatch.slug ?? nextMatch.id}#pronostico`}
                  variant="outlined"
                  size="large"
                >
                  {t("predictionCardCta")}
                </Button>
              </>
            ) : (
              <Typography variant="body1">{t("predictionCardNone")}</Typography>
            )}
          </GameCard>
        </Stack>
      </Container>
    </>
  );
}
