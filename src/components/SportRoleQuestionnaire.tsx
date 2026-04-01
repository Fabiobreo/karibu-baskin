"use client";
import { useState } from "react";
import {
  Box, Typography, Paper, Button, LinearProgress, Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

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
  label: string;
  sublabel?: string;
  next: StepId | null;
  result?: SportRoleResult;
}

interface Question {
  question: string;
  options: Option[];
}

const QUESTIONS: Record<StepId, Question> = {
  mobility: {
    question: "Come ti muovi di solito durante un'attività fisica?",
    options: [
      { label: "Uso una sedia a rotelle", next: "chair_autonomy" },
      { label: "Cammino, ma non corro", next: "walk_speed" },
      { label: "Corro", next: "run_quality" },
    ],
  },
  chair_autonomy: {
    question: "Riesci a muovere la sedia a rotelle da solo/a?",
    options: [
      { label: "Sì, con entrambe le mani", next: "chair_ball" },
      { label: "Sì, ma solo con un braccio", next: null, result: { role: 2, variant: "T" } },
      { label: "No, ho bisogno di assistenza", next: null, result: { role: 1 } },
    ],
  },
  chair_ball: {
    question: "Riesci a lanciare una palla da basket?",
    options: [
      { label: "Sì", next: null, result: { role: 2 } },
      { label: "No, ho difficoltà con braccia o mani", next: null, result: { role: 2, variant: "P" } },
    ],
  },
  walk_speed: {
    question: "Riesci a fare qualche passo veloce o una piccola corsetta?",
    options: [
      { label: "No", next: null, result: { role: 2 } },
      { label: "Sì, un po'", next: null, result: { role: 2, variant: "R" } },
    ],
  },
  run_quality: {
    question: "Come descriveresti la tua corsa?",
    options: [
      {
        label: "Faticosa, lenta o poco coordinata",
        sublabel: "Faccio fatica a correre in modo fluido",
        next: null,
        result: { role: 3 },
      },
      {
        label: "Normale o veloce",
        sublabel: "Riesco a correre senza grossi problemi",
        next: "run_dribble",
      },
    ],
  },
  run_dribble: {
    question: "Sai palleggiare una palla da basket mentre corri?",
    options: [
      { label: "No, o a malapena", next: null, result: { role: 3 } },
      {
        label: "Sì, di base",
        sublabel: "Riesco, ma con qualche incertezza",
        next: null,
        result: { role: 4 },
      },
      {
        label: "Sì, bene e in modo continuo",
        sublabel: "Palleggio senza problemi anche in corsa",
        next: "experience",
      },
    ],
  },
  experience: {
    question: "Hai esperienza con il basket o altri sport con la palla?",
    options: [
      { label: "No, o poca esperienza", next: null, result: { role: 4 } },
      { label: "Sì, anni di pratica", next: null, result: { role: 5 } },
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
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor: "info.50",
            border: "1px solid",
            borderColor: "info.200",
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="info.main" fontWeight={600}>
            Hai già risposto in precedenza — risposta precedente: Ruolo {initialSuggested.role}
            {initialSuggested.variant ?? ""}. Puoi aggiornarlo qui sotto.
          </Typography>
        </Box>
      )}

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 3, borderRadius: 2, mb: 2.5, bgcolor: "grey.200" }}
      />

      <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
        {question.question}
      </Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        {question.options.map((opt, i) => (
          <Paper
            key={i}
            variant="outlined"
            onClick={() => handleOption(opt)}
            sx={{
              p: 1.5,
              cursor: "pointer",
              transition: "all 0.15s",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "primary.50",
              },
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {opt.label}
            </Typography>
            {opt.sublabel && (
              <Typography variant="caption" color="text.secondary" display="block">
                {opt.sublabel}
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
          Indietro
        </Button>
      )}
    </Box>
  );
}
