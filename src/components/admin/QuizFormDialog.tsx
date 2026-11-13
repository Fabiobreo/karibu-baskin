"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { GameVisibility } from "@prisma/client";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import GameArt from "@/components/games/GameArt";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { DEFAULT_QUIZ_ART, QUIZ_ARTS, QUIZ_ART_LABELS, type QuizArt } from "@/lib/games/gameArt";
import { GAME_RULES, GAME_VISIBILITY_LABELS } from "@/lib/games/gameSettings";
import { RADIUS } from "@/lib/radius";
import { canEnableQuiz, missingToEnableText, type QuizCounts } from "@/lib/games/quizRules";

/** Un quiz nell'elenco del pannello. */
export interface AdminQuizRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  titleEn: string | null;
  descriptionEn: string | null;
  visibility: GameVisibility;
  /** Disegno della card in Giochi (UX-68). */
  art: QuizArt;
  counts: QuizCounts;
  /** Domande "da rileggere" (troppe risposte sbagliate). */
  toReview: number;
  plays: number;
}

interface QuizFormDialogProps {
  open: boolean;
  /** Quiz da modificare; null = nuovo quiz (nasce spento). */
  quiz: AdminQuizRow | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Nuovo quiz o modifica (UX-67): titolo e descrizione (anche in inglese,
 * facoltativo) e, per un quiz che c'è già, chi lo vede. Si accende solo con
 * abbastanza domande approvate; "Per tutti" chiede una conferma esplicita.
 */
export default function QuizFormDialog({ open, quiz, onClose, onSaved }: QuizFormDialogProps) {
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [titleEn, setTitleEn] = useState(quiz?.titleEn ?? "");
  const [descriptionEn, setDescriptionEn] = useState(quiz?.descriptionEn ?? "");
  const [art, setArt] = useState<QuizArt>(quiz?.art ?? DEFAULT_QUIZ_ART);
  const [visibility, setVisibility] = useState<GameVisibility>(quiz?.visibility ?? "OFF");
  const [error, setError] = useState<string | null>(null);
  const enableable = !quiz || canEnableQuiz(quiz.counts);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title,
        description,
        titleEn,
        descriptionEn,
        art,
        ...(quiz && visibility !== quiz.visibility ? { visibility } : {}),
      };
      const res = await fetch(quiz ? `/api/admin/quizzes/${quiz.id}` : "/api/admin/quizzes", {
        method: quiz ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: () => {
      showToast({ message: quiz ? "Quiz salvato" : "Quiz creato, spento", severity: "success" });
      onSaved();
    },
    onError: (err) => setError(err.message),
  });

  function submit() {
    setError(null);
    if (quiz && visibility === "PUBLIC" && quiz.visibility !== "PUBLIC") {
      openConfirm(
        `${quiz.title} per tutti?`,
        "Lo potrà giocare anche chi non ha un account, e comparirà nel menu e su Google.",
        () => save.mutate(),
        { confirmLabel: "Apri a tutti", confirmColor: "primary" }
      );
      return;
    }
    save.mutate();
  }

  return (
    <ResponsiveDialog
      open={open}
      onClose={() => !save.isPending && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>
        {quiz ? "Modifica quiz" : "Nuovo quiz"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          <TextField
            label="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            label="Descrizione"
            helperText="Una riga corta, sotto il titolo nella card di Giochi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <TextField
            label="Titolo in inglese (facoltativo)"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
          <TextField
            label="Descrizione in inglese (facoltativa)"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <FormControl>
            <FormLabel id="quiz-art" sx={{ mb: 1 }}>
              Disegno della card
            </FormLabel>
            <ToggleButtonGroup
              exclusive
              aria-labelledby="quiz-art"
              value={art}
              onChange={(_, v: QuizArt | null) => v && setArt(v)}
              sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1 }}
            >
              {QUIZ_ARTS.map((a) => (
                <ToggleButton
                  key={a}
                  value={a}
                  sx={{
                    p: 0.75,
                    flexDirection: "column",
                    gap: 0.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: `${RADIUS.md} !important`,
                    textTransform: "none",
                    "&.Mui-selected": { borderColor: "primary.main", borderWidth: 2 },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 10",
                      borderRadius: RADIUS.sm,
                      overflow: "hidden",
                      background: (theme) => theme.palette.heroGradient.cardHead,
                    }}
                  >
                    <GameArt kind="quiz" art={a} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                    {QUIZ_ART_LABELS[a]}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </FormControl>
          {quiz && (
            <FormControl>
              <FormLabel id="quiz-visibility">Chi lo vede</FormLabel>
              <RadioGroup
                row
                aria-labelledby="quiz-visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as GameVisibility)}
              >
                {GAME_RULES.quiz.allowed.map((v) => (
                  <FormControlLabel
                    key={v}
                    value={v}
                    control={<Radio />}
                    label={GAME_VISIBILITY_LABELS[v]}
                    disabled={v !== "OFF" && v !== quiz.visibility && !enableable}
                    sx={{ minHeight: 44, mr: 3 }}
                  />
                ))}
              </RadioGroup>
              {!enableable && (
                <FormHelperText>{missingToEnableText(quiz.counts)} per accenderlo.</FormHelperText>
              )}
            </FormControl>
          )}
          {!quiz && (
            <FormHelperText>
              Il quiz nasce spento: lo accendi quando ha almeno 8 domande approvate.
            </FormHelperText>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>
          Annulla
        </Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {quiz ? "Salva" : "Crea quiz"}
        </Button>
      </DialogActions>
      {ConfirmDialog}
    </ResponsiveDialog>
  );
}
