"use client";
import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import MatchSectionTitle from "@/components/matches/sections/MatchSectionTitle";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { loginHref } from "@/lib/loginReturn";
import {
  PREDICTION_OUTCOMES,
  type PredictionOutcome,
  type PredictionRow,
} from "@/lib/games/prediction";
import { MAX_PREDICTED_SCORE } from "@/lib/schemas/games";
import { RADIUS } from "@/lib/radius";

interface MatchPredictionCardProps {
  matchId: string;
  /** Percorso della pagina, per tornarci dopo l'accesso. */
  path: string;
  teamName: string;
  opponentName: string;
  viewer: "member" | "guest" | "anonymous";
  /** `notYet`: apre più avanti (`opensAt` è già scritto per la lingua). */
  window: "open" | "notYet";
  opensAt: string;
  initial: PredictionRow | null;
}

/** "Vince Kapuleti", "Pareggio", "Vince Thiene". */
export function usePredictionChoiceLabel(teamName: string, opponentName: string) {
  const t = useTranslations("pages.games.prediction");
  return (outcome: PredictionOutcome) =>
    outcome === "WIN"
      ? t("optionWin", { team: teamName })
      : outcome === "LOSS"
        ? t("optionLoss", { team: opponentName })
        : t("optionDraw");
}

function parseScore(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= MAX_PREDICTED_SCORE ? n : NaN;
}

/**
 * Pronostico della partita futura (UX-61), sotto "Dove e quando": chi vince
 * (gruppo di radio) e, se si vuole, il punteggio. Solo per i tesserati; senza
 * livello stimato, probabilità o "favorito", che rovinerebbero il gioco.
 */
export default function MatchPredictionCard({
  matchId,
  path,
  teamName,
  opponentName,
  viewer,
  window,
  opensAt,
  initial,
}: MatchPredictionCardProps) {
  const t = useTranslations("pages.games.prediction");
  const choiceLabel = usePredictionChoiceLabel(teamName, opponentName);
  const { showToast } = useToast();
  const [saved, setSaved] = useState<PredictionRow | null>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [outcome, setOutcome] = useState<PredictionOutcome | null>(initial?.outcome ?? null);
  const [withScore, setWithScore] = useState(initial?.ourScore != null);
  const [our, setOur] = useState(initial?.ourScore != null ? String(initial.ourScore) : "");
  const [their, setTheir] = useState(initial?.theirScore != null ? String(initial.theirScore) : "");
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (body: PredictionRow) => {
      const res = await fetch(`/api/matches/${matchId}/prediction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: { prediction: PredictionRow } = await res.json();
      return data.prediction;
    },
    onSuccess: (prediction) => {
      setSaved(prediction);
      setEditing(false);
      showToast({ message: t("savedToast"), severity: "success" });
    },
    onError: (err) => {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    },
  });

  function submit() {
    if (!outcome) return;
    const ourScore = withScore ? parseScore(our) : null;
    const theirScore = withScore ? parseScore(their) : null;
    if (
      Number.isNaN(ourScore) ||
      Number.isNaN(theirScore) ||
      (ourScore === null) !== (theirScore === null)
    ) {
      setFormError(t("scoreBoth"));
      return;
    }
    if (ourScore !== null && theirScore !== null) {
      const fromScore = ourScore > theirScore ? "WIN" : ourScore < theirScore ? "LOSS" : "DRAW";
      if (fromScore !== outcome) {
        setFormError(t("scoreMismatch"));
        return;
      }
    }
    setFormError(null);
    save.mutate({ outcome, ourScore, theirScore });
  }

  let body: React.ReactNode;
  if (viewer === "anonymous") {
    body = (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="body1">{t("anonymous")}</Typography>
        <Button href={loginHref(`${path}#pronostico`)} variant="outlined">
          {t("login")}
        </Button>
      </Box>
    );
  } else if (viewer === "guest") {
    body = <Typography variant="body1">{t("guest")}</Typography>;
  } else if (window === "notYet") {
    body = <Typography variant="body1">{t("notYet", { when: opensAt })}</Typography>;
  } else if (saved && !editing) {
    body = (
      <Box role="status">
        <Typography variant="body1">
          {saved.ourScore !== null && saved.theirScore !== null
            ? t("savedScore", {
                choice: choiceLabel(saved.outcome),
                our: saved.ourScore,
                their: saved.theirScore,
              })
            : t("saved", { choice: choiceLabel(saved.outcome) })}
        </Typography>
        <Button variant="outlined" onClick={() => setEditing(true)} sx={{ mt: 1.5 }}>
          {t("change")}
        </Button>
      </Box>
    );
  } else {
    body = (
      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormControl component="fieldset" sx={{ width: "100%" }}>
          <FormLabel
            component="legend"
            sx={{ color: "text.primary", "&.Mui-focused": { color: "text.primary" }, mb: 1 }}
          >
            <Typography variant="subtitle1" component="span">
              {t("question")}
            </Typography>
          </FormLabel>
          <RadioGroup
            value={outcome ?? ""}
            onChange={(e) => setOutcome(e.target.value as PredictionOutcome)}
          >
            <Stack spacing={1}>
              {PREDICTION_OUTCOMES.map((o) => (
                <FormControlLabel
                  key={o}
                  value={o}
                  control={<Radio />}
                  label={choiceLabel(o)}
                  sx={{
                    m: 0,
                    minHeight: 48,
                    px: 1,
                    border: "1px solid",
                    borderColor: outcome === o ? "primary.main" : "divider",
                    borderRadius: RADIUS.md,
                  }}
                />
              ))}
            </Stack>
          </RadioGroup>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          {withScore ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t("scoreHint")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <TextField
                  label={t("scoreOf", { team: teamName })}
                  value={our}
                  onChange={(e) => setOur(e.target.value)}
                  type="number"
                  slotProps={{
                    htmlInput: { inputMode: "numeric", min: 0, max: MAX_PREDICTED_SCORE },
                  }}
                  sx={{ flex: "1 1 140px" }}
                />
                <TextField
                  label={t("scoreOf", { team: opponentName })}
                  value={their}
                  onChange={(e) => setTheir(e.target.value)}
                  type="number"
                  slotProps={{
                    htmlInput: { inputMode: "numeric", min: 0, max: MAX_PREDICTED_SCORE },
                  }}
                  sx={{ flex: "1 1 140px" }}
                />
              </Box>
            </>
          ) : (
            <Button variant="text" onClick={() => setWithScore(true)}>
              {t("scoreToggle")}
            </Button>
          )}
        </Box>

        <Box role="alert" sx={{ mt: formError ? 1.5 : 0 }}>
          {formError && (
            <Typography variant="body2" color="error">
              {formError}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, mt: 2.5, flexWrap: "wrap" }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!outcome || save.isPending}
          >
            {t("save")}
          </Button>
          {saved && (
            <Button variant="text" size="large" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          )}
        </Box>
      </Box>
    );
  }

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
        {body}
      </Paper>
    </Box>
  );
}
