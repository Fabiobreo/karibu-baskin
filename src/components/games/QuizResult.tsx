"use client";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import ShareSection from "@/components/common/ShareSection";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import { challengePath, QUIZ_LENGTH, scoreTone } from "@/lib/games/quiz";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface QuizResultProps {
  questions: QuizQuestion[];
  picks: (number | null)[];
  code: string;
  /** Punteggio di chi ha mandato la sfida, se l'ha messo nel link. */
  challengerScore: number | null;
  /** Migliore partita di un tesserato; `null` per chi gioca senza accesso. */
  best: number | null;
  onPlayAgain: () => void;
}

/**
 * Fine del quiz (UX-61): il punteggio detto bene (lo 0 è "5 cose nuove"), le
 * spiegazioni delle risposte sbagliate e "Sfida un amico" con le stesse 5
 * domande. Nessun confronto con altre persone oltre a chi ha sfidato, se ha
 * scelto di mettere il punteggio nel link.
 */
export default function QuizResult({
  questions,
  picks,
  code,
  challengerScore,
  best,
  onPlayAgain,
}: QuizResultProps) {
  const t = useTranslations("pages.games.quiz");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [withScore, setWithScore] = useState(true);
  const score = questions.filter((q, i) => picks[i] === q.correct).length;
  const wrong = questions.filter((q, i) => picks[i] !== q.correct);
  const tone = scoreTone(score);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Stack spacing={4}>
      <Box>
        <Typography
          ref={headingRef}
          tabIndex={-1}
          variant="h4"
          component="h2"
          sx={{ outline: "none", mb: 1 }}
        >
          {t("resultTitle", { score, total: QUIZ_LENGTH })}
        </Typography>
        <Typography variant="body1">
          {tone === "perfect"
            ? t("tonePerfect")
            : tone === "good"
              ? t("toneGood")
              : t("toneLearned", { count: QUIZ_LENGTH - score })}
        </Typography>
        {challengerScore !== null && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {t("challengerScore", { score: challengerScore, total: QUIZ_LENGTH })}
          </Typography>
        )}
        {best !== null && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {t("best", { best, total: QUIZ_LENGTH })}
          </Typography>
        )}
        <Button variant="contained" size="large" onClick={onPlayAgain} sx={{ mt: 2.5 }}>
          {t("playAgain")}
        </Button>
      </Box>

      {wrong.length > 0 && (
        <Box component="section" aria-labelledby="quiz-review-title">
          <Typography id="quiz-review-title" variant="h5" component="h3" sx={{ mb: 1.5 }}>
            {t("reviewTitle")}
          </Typography>
          <Stack spacing={1.5}>
            {wrong.map((q) => (
              <Paper key={q.id} variant="outlined" sx={{ p: 2, borderRadius: RADIUS.lg }}>
                <Typography variant="subtitle1" component="p">
                  {q.text}
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {t("correctIs", { answer: q.answers[q.correct] })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {q.explanation}
                </Typography>
                <MuiLink
                  href={q.source}
                  sx={{ display: "inline-block", mt: 1, fontWeight: FONT_WEIGHT.semibold }}
                >
                  {t("learnMore")}
                </MuiLink>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      <Paper
        component="section"
        aria-labelledby="quiz-challenge-title"
        variant="outlined"
        sx={{ p: { xs: 2, md: 2.5 }, borderRadius: RADIUS.lg }}
      >
        <Typography id="quiz-challenge-title" variant="h5" component="h3">
          {t("challengeTitle")}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
          {t("challengeBody")}
        </Typography>
        <FormControlLabel
          control={
            <Checkbox checked={withScore} onChange={(e) => setWithScore(e.target.checked)} />
          }
          label={t("challengeWithScore")}
          sx={{ mb: 1.5, minHeight: 44 }}
        />
        <ShareSection
          kind="quiz"
          title={t("title")}
          path={challengePath(code, withScore ? score : null)}
          message={withScore ? t("waWithScore", { score, total: QUIZ_LENGTH }) : t("waNoScore")}
        />
      </Paper>

      <Box>
        <Button href="/giochi" variant="text">
          {t("backToGames")}
        </Button>
      </Box>
    </Stack>
  );
}
