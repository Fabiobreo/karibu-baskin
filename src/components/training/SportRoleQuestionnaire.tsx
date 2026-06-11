"use client";
import { useState } from "react";
import { Box, Typography, Paper, Button, LinearProgress, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";

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
      { labelKey: "wheelchair", next: "chair_autonomy" },
      { labelKey: "walk", next: "walk_speed" },
      { labelKey: "run", next: "run_quality" },
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
}

export default function SportRoleQuestionnaire({ onResult, initialSuggested }: Props) {
  const t = useTranslations("trainings.questionnaire");
  const tCommon = useTranslations("common");
  const { sportRoleLabel } = useEntityLabels();
  const [history, setHistory] = useState<StepId[]>(["mobility"]);

  const currentStep = history[history.length - 1];
  const question = QUESTIONS[currentStep];
  const progress = Math.min(((history.length - 1) / MAX_DEPTH) * 100, 90);

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
      {initialSuggested && (
        <Box
          sx={(theme) => ({
            mb: 2,
            p: 1.5,
            bgcolor: alpha(theme.palette.info.main, 0.08),
            border: "1px solid",
            borderColor: alpha(theme.palette.info.main, 0.3),
            borderRadius: 1,
          })}
        >
          <Typography variant="caption" color="info.main" fontWeight={600}>
            {t("previousAnswer", {
              role: sportRoleLabel(initialSuggested.role, initialSuggested.variant ?? null),
            })}
          </Typography>
        </Box>
      )}

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 3, borderRadius: 2, mb: 2.5, bgcolor: "action.hover" }}
      />

      <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
        {t(`${currentStep}.question`)}
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
            <Typography variant="body2" fontWeight={600}>
              {t(`${currentStep}.${opt.labelKey}`)}
            </Typography>
            {opt.sublabelKey && (
              <Typography variant="caption" color="text.secondary" display="block">
                {t(`${currentStep}.${opt.sublabelKey}`)}
              </Typography>
            )}
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
