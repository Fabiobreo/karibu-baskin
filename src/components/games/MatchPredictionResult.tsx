import { Box, Paper, Stack, Typography } from "@mui/material";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getTranslations } from "next-intl/server";
import MatchSectionTitle from "@/components/matches/sections/MatchSectionTitle";
import {
  PREDICTION_OUTCOMES,
  type PredictionOutcome,
  type PredictionRow,
  type PredictionTotals,
  type PredictionVerdict,
} from "@/lib/games/prediction";
import { RADIUS } from "@/lib/radius";

interface MatchPredictionResultProps {
  teamName: string;
  opponentName: string;
  prediction: PredictionRow | null;
  /** `null` finché la partita non ha un risultato. */
  verdict: PredictionVerdict | null;
  totals: PredictionTotals;
}

/**
 * Il pronostico a partita iniziata (UX-61): cosa avevi detto, se ci hai preso
 * e quante persone hanno detto cosa. Solo numeri, mai i nomi di chi ha
 * pronosticato (decisione del committente). Solo per i tesserati: chi la
 * chiama ha già controllato.
 */
export default async function MatchPredictionResult({
  teamName,
  opponentName,
  prediction,
  verdict,
  totals,
}: MatchPredictionResultProps) {
  const t = await getTranslations("pages.games.prediction");
  if (!prediction && totals.total === 0) return null;
  const choice = (o: PredictionOutcome) =>
    o === "WIN"
      ? t("optionWin", { team: teamName })
      : o === "LOSS"
        ? t("optionLoss", { team: opponentName })
        : t("optionDraw");

  return (
    <Box
      component="section"
      aria-labelledby="pronostico-title"
      id="pronostico"
      sx={{ scrollMarginTop: 80 }}
    >
      <MatchSectionTitle id="pronostico-title" icon={<ScoreboardIcon />}>
        {t("title")}
      </MatchSectionTitle>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: RADIUS.lg }}>
        {prediction ? (
          <Box>
            <Typography variant="body1">
              {prediction.ourScore !== null && prediction.theirScore !== null
                ? t("saidScore", {
                    choice: choice(prediction.outcome),
                    our: prediction.ourScore,
                    their: prediction.theirScore,
                  })
                : t("said", { choice: choice(prediction.outcome) })}
            </Typography>
            {verdict && (
              <Typography
                variant="subtitle1"
                component="p"
                sx={{
                  mt: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  color: verdict.right ? "success.main" : "text.primary",
                }}
              >
                {verdict.right && <CheckCircleIcon fontSize="small" aria-hidden />}
                {verdict.right ? t("right") : t("wrong")}
              </Typography>
            )}
            {verdict?.score && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {verdict.score.exact ? t("exact") : t("gap", { gap: verdict.score.gap })}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary">
            {t("notMade")}
          </Typography>
        )}

        {totals.total > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" component="p" sx={{ mb: 1 }}>
              {t("totalsTitle", { total: totals.total })}
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
              {PREDICTION_OUTCOMES.map((o) => (
                <Typography key={o} component="li" variant="body2">
                  {t("totalsRow", { choice: choice(o), count: totals[o] })}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
