import { Box, Paper, Typography } from "@mui/material";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import { getTranslations } from "next-intl/server";
import { loadSeasonPredictionRecord } from "@/lib/games/loadPredictions";
import { loadGameSettings } from "@/lib/games/loadGameSettings";
import { RADIUS } from "@/lib/radius";

interface PredictionRecordLineProps {
  userId: string;
  season: string;
}

/**
 * "Pronostici giusti in questa stagione: 7 su 10" nel profilo (UX-61). Solo
 * di chi guarda, nessun confronto con gli altri; senza partite giocate con un
 * suo pronostico non c'è.
 */
export default async function PredictionRecordLine({ userId, season }: PredictionRecordLineProps) {
  const [t, record, settings] = await Promise.all([
    getTranslations("pages.games.prediction"),
    loadSeasonPredictionRecord(userId, season),
    loadGameSettings(),
  ]);
  // Pronostico spento dall'admin (UX-66): la riga sparisce, i dati restano.
  if (record.total === 0 || settings.prediction === "OFF") return null;
  return (
    <Paper variant="outlined" sx={{ borderRadius: RADIUS.lg, p: { xs: 2, md: 2.5 }, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ScoreboardIcon sx={{ color: "primary.main" }} aria-hidden />
        <Typography variant="body1">{t("record", record)}</Typography>
      </Box>
    </Paper>
  );
}
