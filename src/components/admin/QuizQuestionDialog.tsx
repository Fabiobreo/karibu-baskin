"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Collapse,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { QUIZ_TOPICS, type QuizTopic } from "@/lib/content/baskinQuiz";
import { hasEnglish, type QuizQuestionRow } from "@/lib/games/quizRules";

/** Una domanda nel pannello: i campi del database più i numeri. */
export interface AdminQuizQuestion extends QuizQuestionRow {
  shown: number;
  correctCount: number;
}

interface QuizQuestionDialogProps {
  quizId: string;
  /** Domanda da modificare; null = nuova (nasce in prova, salvo "Salva e approva"). */
  question: AdminQuizQuestion | null;
  onClose: () => void;
  onSaved: () => void;
}

const POSITIONS = ["Prima", "Seconda", "Terza"];
const three = (a: string[] | undefined) => [0, 1, 2].map((i) => a?.[i] ?? "");

/**
 * Nuova domanda o modifica (UX-67). Tre risposte e quella giusta, una
 * spiegazione breve, livello e argomento.
 * L'inglese è facoltativo ma tutto o niente.
 */
export default function QuizQuestionDialog({
  quizId,
  question,
  onClose,
  onSaved,
}: QuizQuestionDialogProps) {
  const { showToast } = useToast();
  const [text, setText] = useState(question?.text ?? "");
  const [answers, setAnswers] = useState(three(question?.answers));
  const [correct, setCorrect] = useState<number | null>(question?.correct ?? null);
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [level, setLevel] = useState<"EASY" | "MEDIUM">(question?.level ?? "EASY");
  const [topic, setTopic] = useState<string>(question?.topic ?? "");
  const [textEn, setTextEn] = useState(question?.textEn ?? "");
  const [answersEn, setAnswersEn] = useState(three(question?.answersEn));
  const [explanationEn, setExplanationEn] = useState(question?.explanationEn ?? "");
  const [showEn, setShowEn] = useState(!!question && hasEnglish(question));
  const [error, setError] = useState<string | null>(null);
  const approved = question?.status === "APPROVED";

  const save = useMutation({
    mutationFn: async (approve: boolean) => {
      const body = {
        level,
        topic,
        text,
        answers,
        correct,
        explanation,
        textEn,
        answersEn,
        explanationEn,
        approve,
      };
      const res = await fetch(
        question
          ? `/api/admin/quiz-questions/${question.id}`
          : `/api/admin/quizzes/${quizId}/questions`,
        {
          method: question ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error(await readError(res));
      return approve;
    },
    onSuccess: (approve) => {
      showToast({
        message: approve && !approved ? "Domanda salvata e approvata" : "Domanda salvata",
        severity: "success",
      });
      onSaved();
    },
    onError: (err) => setError(err.message),
  });

  function submit(approve: boolean) {
    setError(null);
    if (correct === null) {
      setError("Scegli la risposta giusta");
      return;
    }
    save.mutate(approve);
  }

  const setAt = (list: string[], set: (v: string[]) => void, i: number, v: string) =>
    set(list.map((x, j) => (j === i ? v : x)));

  return (
    <ResponsiveDialog open onClose={() => !save.isPending && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>
        {question ? "Modifica domanda" : "Nuova domanda"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          <TextField
            label="Domanda"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            multiline
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          {answers.map((a, i) => (
            <TextField
              key={i}
              label={`Risposta ${i + 1}`}
              value={a}
              onChange={(e) => setAt(answers, setAnswers, i, e.target.value)}
              required
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
          ))}
          <FormControl>
            <FormLabel id="question-correct">Quella giusta è la</FormLabel>
            <RadioGroup
              row
              aria-labelledby="question-correct"
              value={correct === null ? "" : String(correct)}
              onChange={(e) => setCorrect(Number(e.target.value))}
            >
              {POSITIONS.map((label, i) => (
                <FormControlLabel
                  key={label}
                  value={String(i)}
                  control={<Radio />}
                  label={label}
                  sx={{ minHeight: 44, mr: 3 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
          <TextField
            label="Spiegazione"
            helperText="Due righe al massimo: si legge dopo la risposta, giusta o no"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            required
            multiline
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
          <FormControl>
            <FormLabel id="question-level">Livello</FormLabel>
            <RadioGroup
              row
              aria-labelledby="question-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as "EASY" | "MEDIUM")}
            >
              <FormControlLabel
                value="EASY"
                control={<Radio />}
                label="Facile"
                sx={{ minHeight: 44, mr: 3 }}
              />
              <FormControlLabel
                value="MEDIUM"
                control={<Radio />}
                label="Media"
                sx={{ minHeight: 44 }}
              />
            </RadioGroup>
          </FormControl>
          <FormControl required>
            <InputLabel id="question-topic" shrink>
              Argomento
            </InputLabel>
            <Select
              labelId="question-topic"
              label="Argomento"
              notched
              displayEmpty
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <MenuItem value="" disabled>
                Scegli…
              </MenuItem>
              {(Object.keys(QUIZ_TOPICS) as QuizTopic[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {QUIZ_TOPICS[k]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Button
              onClick={() => setShowEn((v) => !v)}
              aria-expanded={showEn}
              aria-controls="question-en"
              endIcon={
                <ExpandMoreIcon
                  sx={{
                    transform: showEn ? "rotate(180deg)" : "none",
                    transition: "transform .2s",
                  }}
                />
              }
              sx={{ minHeight: 44 }}
            >
              In inglese (facoltativo)
            </Button>
            <Collapse in={showEn}>
              <Box
                id="question-en"
                sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Tutto o niente: senza traduzione completa la domanda non esce a chi legge in
                  inglese. La risposta giusta è nella stessa posizione.
                </Typography>
                <TextField
                  label="Domanda in inglese"
                  value={textEn}
                  onChange={(e) => setTextEn(e.target.value)}
                  multiline
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
                {answersEn.map((a, i) => (
                  <TextField
                    key={i}
                    label={`Risposta ${i + 1} in inglese`}
                    value={a}
                    onChange={(e) => setAt(answersEn, setAnswersEn, i, e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 120 } }}
                  />
                ))}
                <TextField
                  label="Spiegazione in inglese"
                  value={explanationEn}
                  onChange={(e) => setExplanationEn(e.target.value)}
                  multiline
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                />
              </Box>
            </Collapse>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={save.isPending}>
          Annulla
        </Button>
        <Button
          variant={approved ? "contained" : "outlined"}
          onClick={() => submit(false)}
          disabled={save.isPending}
        >
          Salva
        </Button>
        {!approved && (
          <Button variant="contained" onClick={() => submit(true)} disabled={save.isPending}>
            Salva e approva
          </Button>
        )}
      </DialogActions>
    </ResponsiveDialog>
  );
}
