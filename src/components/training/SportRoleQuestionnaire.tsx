"use client";
import { useState } from "react";
import { Box, Typography, Paper, Button, LinearProgress, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessibleIcon from "@mui/icons-material/Accessible";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { RADIUS } from "@/lib/radius";

export interface SportRoleResult {
  role: number;
  variant?: string;
}

type StepId =
  | "mobility"
  | "chair_autonomy"
  | "chair_ball"
  | "walk_speed"
  | "run_quality"
  | "run_dribble"
  | "experience";

interface Option {
  /** Chiave i18n dell'opzione dentro trainings.questionnaire.<step> */
  labelKey: string;
  /** Chiave i18n del sottotitolo (opzionale) */
  sublabelKey?: string;
  /** Pittogramma per chi legge poco (UX-17): solo sulle opzioni di movimento. */
  icon?: React.ReactNode;
  next: StepId | null;
  result?: SportRoleResult;
}

interface Question {
  options: Option[];
}

// Le stringhe vivono nei dizionari next-intl (trainings.questionnaire.*);
// qui restano solo le chiavi e la logica di branching → risultato (ruolo 1-5 + variante).
const QUESTIONS: Record<StepId, Question> = {
  mobility: {
    options: [
      { labelKey: "wheelchair", icon: <AccessibleIcon fontSize="large" />, next: "chair_autonomy" },
      { labelKey: "walk", icon: <DirectionsWalkIcon fontSize="large" />, next: "walk_speed" },
      { labelKey: "run", icon: <DirectionsRunIcon fontSize="large" />, next: "run_quality" },
    ],
  },
  chair_autonomy: {
    options: [
      { labelKey: "bothHands", next: "chair_ball" },
      { labelKey: "oneArm", next: null, result: { role: 2, variant: "T" } },
      { labelKey: "assistance", next: null, result: { role: 1 } },
    ],
  },
  chair_ball: {
    options: [
      { labelKey: "yes", next: null, result: { role: 2 } },
      { labelKey: "difficulty", next: null, result: { role: 2, variant: "P" } },
    ],
  },
  walk_speed: {
    options: [
      { labelKey: "no", next: null, result: { role: 2 } },
      { labelKey: "aBit", next: null, result: { role: 2, variant: "R" } },
    ],
  },
  run_quality: {
    options: [
      { labelKey: "slow", sublabelKey: "slowSub", next: null, result: { role: 3 } },
      { labelKey: "normal", sublabelKey: "normalSub", next: "run_dribble" },
    ],
  },
  run_dribble: {
    options: [
      { labelKey: "no", next: null, result: { role: 3 } },
      { labelKey: "basic", sublabelKey: "basicSub", next: null, result: { role: 4 } },
      { labelKey: "well", sublabelKey: "wellSub", next: "experience" },
    ],
  },
  experience: {
    options: [
      { labelKey: "little", next: null, result: { role: 4 } },
      { labelKey: "years", next: null, result: { role: 5 } },
    ],
  },
};

// Profondità massima stimata per la progress bar
const MAX_DEPTH = 4;

interface Props {
  onResult: (result: SportRoleResult) => void;
  initialSuggested?: SportRoleResult;
  /**
   * Nome di chi e' valutato quando non e' chi compila (un figlio): le domande
   * passano alla terza persona ("Come si muove Giulia?").
   */
  subjectName?: string;
}

export default function SportRoleQuestionnaire({ onResult, initialSuggested, subjectName }: Props) {
  const t = useTranslations("trainings.questionnaire");
  const tCommon = useTranslations("common");
  const { sportRoleLabel } = useEntityLabels();
  const [history, setHistory] = useState<StepId[]>(["mobility"]);

  const currentStep = history[history.length - 1];
  const question = QUESTIONS[currentStep];
  const progress = Math.min(((history.length - 1) / MAX_DEPTH) * 100, 90);
  // Solo il nome proprio: "Come si muove Giulia?", non "Giulia Rossi".
  const firstName = subjectName?.trim().split(/\s+/)[0];
  const who = firstName ? { who: "child", name: firstName } : { who: "self", name: "" };

  function handleOption(opt: Option) {
    if (opt.result) {
      onResult(opt.result);
      return;
    }
    if (opt.next) {
      setHistory((prev) => [...prev, opt.next as StepId]);
    }
  }

  function handleBack() {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
    }
  }

  return (
    <Box>
      {/* Cornice introduttiva: perché chiediamo e che fine fanno le risposte */}
      {history.length === 1 && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("intro", who)}
        </Typography>
      )}
      {initialSuggested && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: RADIUS.md,
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {t("previousAnswer", {
              role: sportRoleLabel(initialSuggested.role, initialSuggested.variant ?? null),
            })}
          </Typography>
        </Box>
      )}

      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label={t("progressLabel")}
        sx={{ height: 3, borderRadius: RADIUS.pill, mb: 2.5, bgcolor: "action.hover" }}
      />

      <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
        {t(`${currentStep}.question`, who)}
      </Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        {question.options.map((opt, i) => (
          <Paper
            key={i}
            variant="outlined"
            role="button"
            tabIndex={0}
            onClick={() => handleOption(opt)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOption(opt);
              }
            }}
            sx={(theme) => ({
              p: 1.5,
              cursor: "pointer",
              transition: "all 0.15s",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            })}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {opt.icon && (
                <Box aria-hidden sx={{ display: "flex", color: "text.secondary" }}>
                  {opt.icon}
                </Box>
              )}
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {t(`${currentStep}.${opt.labelKey}`, who)}
                </Typography>
                {opt.sublabelKey && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t(`${currentStep}.${opt.sublabelKey}`, who)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>

      {history.length > 1 && (
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ color: "text.secondary" }}
        >
          {tCommon("back")}
        </Button>
      )}
    </Box>
  );
}
