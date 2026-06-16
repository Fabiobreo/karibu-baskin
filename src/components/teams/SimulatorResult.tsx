"use client";

import { Box, Paper, Typography, Button, Chip, Stack } from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import IosShareIcon from "@mui/icons-material/IosShare";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useTranslations } from "next-intl";
import type { SimResult } from "@/lib/rating/matchSimulator";

interface SimulatorResultProps {
  result: SimResult;
  nameA: string;
  nameB: string;
  onRematch: () => void;
  onShare: () => void;
}

/**
 * Card esito della simulazione: punteggione, vincitore evidenziato, barra delle
 * probabilità A/B e azioni Rivincita/Condividi. Colori fissi del tema
 * (primary = A, secondary = B), coerenti con i grafici di confronto.
 */
export default function SimulatorResult({
  result,
  nameA,
  nameB,
  onRematch,
  onShare,
}: SimulatorResultProps) {
  const t = useTranslations("simulator");
  const { scoreA, scoreB, winner, winProbabilityA, label } = result;
  const pctA = Math.round(winProbabilityA * 100);
  const pctB = 100 - pctA;

  const labelText =
    label === "FavoritiA"
      ? t("favored", { team: nameA })
      : label === "FavoritiB"
        ? t("favored", { team: nameB })
        : t("balanced");

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, mt: 3 }}>
      <Box sx={{ textAlign: "center", mb: 1 }}>
        <Chip
          icon={<EmojiEventsIcon />}
          label={labelText}
          size="small"
          color={label === "Equilibrata" ? "default" : "primary"}
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {/* Punteggio */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: { xs: 1, md: 2 },
          py: 1,
        }}
      >
        <TeamScore name={nameA} score={scoreA} win={winner === "A"} colorToken="primary.main" />
        <Typography variant="h5" color="text.disabled" fontWeight={800}>
          –
        </Typography>
        <TeamScore name={nameB} score={scoreB} win={winner === "B"} colorToken="secondary.main" />
      </Box>

      {/* Barra probabilità */}
      <Box sx={{ mt: 2 }}>
        <Box
          sx={{
            display: "flex",
            height: 10,
            borderRadius: 5,
            overflow: "hidden",
            bgcolor: "action.hover",
          }}
        >
          <Box sx={{ width: `${pctA}%`, bgcolor: "primary.main" }} />
          <Box sx={{ width: `${pctB}%`, bgcolor: "secondary.main" }} />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {pctA}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("winChance")}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {pctB}%
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<ReplayIcon />}
          onClick={onRematch}
          sx={{ fontWeight: 700 }}
        >
          {t("rematch")}
        </Button>
        <Button
          variant="outlined"
          startIcon={<IosShareIcon />}
          onClick={onShare}
          sx={{ fontWeight: 700 }}
        >
          {t("share")}
        </Button>
      </Stack>
    </Paper>
  );
}

function TeamScore({
  name,
  score,
  win,
  colorToken,
}: {
  name: string;
  score: number;
  win: boolean;
  colorToken: string;
}) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 0 }}>
      <Typography
        variant="h2"
        fontWeight={900}
        sx={{
          color: win ? colorToken : "text.primary",
          opacity: win ? 1 : 0.55,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          fontSize: { xs: "2.6rem", md: "3.4rem" },
        }}
      >
        {score}
      </Typography>
      <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ mt: 0.5, color: colorToken }}>
        {name}
      </Typography>
    </Box>
  );
}
