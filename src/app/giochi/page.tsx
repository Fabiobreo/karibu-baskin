import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import { auth } from "@/lib/authjs";
import { canPlay, gameAccess, gamesAreIndexable } from "@/lib/games/gameSettings";
import { loadGameSettings, loadQuizSummaries } from "@/lib/games/loadGameSettings";
import { quizAccess } from "@/lib/games/quizRules";
import { quizPath } from "@/lib/games/quiz";
import { loadNextPredictionMatch } from "@/lib/games/loadPredictions";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import { columnSx } from "@/lib/layout";
import { RADIUS } from "@/lib/radius";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await loadGameSettings();
  return buildMetadata({
    title: "Giochi",
    description:
      "I giochi del Karibu Baskin: il quiz sul baskin e il pronostico della prossima partita.",
    path: "/giochi",
    // In sitemap e indicizzata solo con il quiz per tutti (UX-66).
    noindex: !gamesAreIndexable(settings),
  });
}

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

// Giochi del club (UX-61): il quiz del Baskin, il pronostico della prossima
// partita e la sfida fra le nostre squadre. Per divertirsi: niente classifiche.
// Chi vede cosa lo decide l'admin in `/admin/giochi` (UX-66); un gioco spento
// lo vedono solo allenatori e admin, in anteprima.
export default async function GiochiPage() {
  const now = new Date();
  const [t, locale, session, settings, quizzes] = await Promise.all([
    getTranslations("pages.games"),
    getLocale(),
    auth(),
    loadGameSettings(),
    loadQuizSummaries(),
  ]);
  const role = session?.user?.appRole;
  // Una card per quiz (UX-67), nell'ordine del pannello.
  const quizCards = quizzes
    .map((q) => ({ ...q, access: quizAccess(q, role, locale) }))
    .filter((q) => q.access !== "hidden");
  const prediction = gameAccess(settings.prediction, role);
  const simulator = gameAccess(settings.simulator, role);
  // Nessun gioco per chi guarda: la pagina non esiste.
  if (quizCards.length === 0 && prediction === "hidden" && simulator === "hidden") notFound();
  const en = locale === "en";
  const nextMatch = prediction === "hidden" ? null : await loadNextPredictionMatch(now);
  const dateLocale = getDateFnsLocale(locale);
  const preview = (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      {t("gamePreview")}
    </Typography>
  );

  return (
    <>
      <PageHero column="main" title={t("title")} subtitle={t("subtitle")} />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={2.5} sx={columnSx("main")}>
          {quizCards.map((q, i) => (
            <GameCard key={q.id} icon={<QuizIcon />} title={(en ? q.titleEn : null) ?? q.title}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {(en ? q.descriptionEn : null) ?? q.description}
              </Typography>
              {q.access === "preview" && preview}
              <Button
                href={quizPath(q.slug)}
                variant={i === 0 ? "contained" : "outlined"}
                size="large"
              >
                {t("quizCardCta")}
              </Button>
            </GameCard>
          ))}

          {prediction !== "hidden" && (
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
                      when: formatRome(nextMatch.date, "EEEE d MMMM, HH:mm", {
                        locale: dateLocale,
                      }),
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
              {prediction === "preview" && <Box sx={{ mt: 2 }}>{preview}</Box>}
            </GameCard>
          )}

          {/* Sfida fra le nostre squadre (UX-66): rose vere, solo tesserati. */}
          {canPlay(simulator) && (
            <GameCard icon={<SportsKabaddiIcon />} title={t("simulatorCardTitle")}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {t("simulatorCardBody")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("simulatorCardWho")}
              </Typography>
              {simulator === "preview" && preview}
              <Button href="/giochi/sfida" variant="outlined" size="large">
                {t("simulatorCardCta")}
              </Button>
            </GameCard>
          )}
        </Stack>
      </Container>
    </>
  );
}
