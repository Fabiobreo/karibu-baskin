"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslations } from "next-intl";
import GameArt from "@/components/games/GameArt";
import type { QuizArt } from "@/lib/games/gameArt";
import { HERO_TEXT, OUTCOME } from "@/lib/palette";
import { TYPE_SCALE } from "@/lib/typeScale";
import ShareSection from "@/components/common/ShareSection";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import {
  challengePath,
  pickVariant,
  scoreTone,
  SHARE_VARIANTS,
  TONE_VARIANTS,
} from "@/lib/games/quiz";
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
  /** Quiz solo per i tesserati (UX-66): il link della sfida funziona solo per loro. */
  membersOnly: boolean;
  /** Quiz giocato (UX-67): indirizzo e titolo per la sfida. */
  slug: string;
  title: string;
  /** Disegno del quiz, sul tabellone (UX-70). */
  art: QuizArt;
}

/**
 * Fine del quiz (UX-61): il punteggio detto bene (lo 0 è "hai imparato
 * qualcosa", con una frase a caso fra più varianti), le spiegazioni delle
 * risposte sbagliate e "Sfida un amico" con le stesse domande. Nessun confronto con altre persone oltre a chi ha sfidato, se ha
 * scelto di mettere il punteggio nel link.
 */
export default function QuizResult({
  questions,
  picks,
  code,
  challengerScore,
  best,
  onPlayAgain,
  membersOnly,
  slug,
  title,
  art,
}: QuizResultProps) {
  const t = useTranslations("pages.games.quiz");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [withScore, setWithScore] = useState(true);
  const score = questions.filter((q, i) => picks[i] === q.correct).length;
  const wrong = questions.filter((q, i) => picks[i] !== q.correct);
  const total = questions.length;
  const tone = scoreTone(score, total);
  // Frasi a caso fra più varianti, prese dal codice della partita: ricaricando
  // la pagina restano le stesse.
  const toneKey = `tone${tone === "perfect" ? "Perfect" : tone === "good" ? "Good" : "Learned"}${pickVariant(code, "tone", TONE_VARIANTS[tone])}`;
  const toneText = t(toneKey as "tonePerfect1", { total, count: total - score });
  const shareText = withScore
    ? t(`waWithScore${pickVariant(code, "wa", SHARE_VARIANTS.withScore)}` as "waWithScore1", {
        title,
        score,
        total,
      })
    : t(`waNoScore${pickVariant(code, "wa", SHARE_VARIANTS.noScore)}` as "waNoScore1", { title });

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Stack spacing={4}>
      <Box>
        {/* Il tabellone del risultato (UX-70): il punteggio grande sul disegno del quiz. */}
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: RADIUS.lg,
            background: (theme) => theme.palette.heroGradient.cardHead,
            color: HERO_TEXT.primary,
            px: 2,
            py: { xs: 3, md: 4 },
            mb: 2,
            textAlign: "center",
          }}
        >
          <Box sx={{ position: "absolute", inset: 0, opacity: 0.15 }}>
            <GameArt kind="quiz" art={art} />
          </Box>
          <Box sx={{ position: "relative" }}>
            <Typography ref={headingRef} tabIndex={-1} component="h2" sx={{ outline: "none" }}>
              <Box component="span" sx={visuallyHidden}>
                {t("resultTitle", { score, total: questions.length })}
              </Box>
              <Box
                component="span"
                aria-hidden
                sx={{
                  typography: "stat",
                  fontSize: { xs: TYPE_SCALE.xl7, sm: TYPE_SCALE.xl8 },
                  display: "block",
                }}
              >
                {score}
                <Box component="span" sx={{ color: HERO_TEXT.muted }}>
                  /{questions.length}
                </Box>
              </Box>
            </Typography>
            <Box aria-hidden sx={{ display: "flex", justifyContent: "center", gap: 0.75, mt: 2 }}>
              {questions.map((q, i) => {
                const ok = picks[i] === q.correct;
                return (
                  <Box
                    key={q.id}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: ok ? OUTCOME.dark.win : OUTCOME.dark.loss,
                      color: OUTCOME.dark.onFill,
                    }}
                  >
                    {ok ? <CheckIcon sx={{ fontSize: 18 }} /> : <CloseIcon sx={{ fontSize: 18 }} />}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
        <Typography variant="h6" component="p">
          {toneText}
        </Typography>
        {challengerScore !== null && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {t("challengerScore", { score: challengerScore, total })}
          </Typography>
        )}
        {best !== null && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {t("best", { best, total })}
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
        {membersOnly && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("challengeMembersNote")}
          </Typography>
        )}
        <FormControlLabel
          control={
            <Checkbox checked={withScore} onChange={(e) => setWithScore(e.target.checked)} />
          }
          label={t("challengeWithScore")}
          sx={{ mb: 1.5, minHeight: 44 }}
        />
        <ShareSection
          kind="quiz"
          title={title}
          path={challengePath(slug, code, withScore ? score : null)}
          message={shareText}
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
