"use client";
import { useEffect, useRef } from "react";
import { Box, Button, ButtonBase, Chip, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useTranslations } from "next-intl";
import GameArt from "@/components/games/GameArt";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import type { QuizArt } from "@/lib/games/gameArt";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, HERO_TEXT, OUTCOME } from "@/lib/palette";
import { RADIUS } from "@/lib/radius";

interface QuizQuestionStepProps {
  question: QuizQuestion;
  index: number;
  /** Esito delle domande già fatte (`null` = non ancora), per le tacche. */
  results: (boolean | null)[];
  pick: number | null;
  art: QuizArt;
  onPick: (answer: number) => void;
  onNext: () => void;
  isLast: boolean;
}

const LETTERS = ["A", "B", "C"];

/**
 * Una domanda del quiz (UX-61, UX-70): una card con la testata grafite (il
 * disegno del quiz e le tacche delle 5 domande), la domanda grande e tre
 * risposte da toccare. Un tocco è la risposta: si accende la giusta e, se
 * sbagliata, la propria; sotto la spiegazione e "Avanti". Niente tempo. Verde
 * e rosso sono valenza (UX-29), sempre con icona e parola.
 */
export default function QuizQuestionStep({
  question,
  index,
  results,
  pick,
  art,
  onPick,
  onNext,
  isLast,
}: QuizQuestionStepProps) {
  const t = useTranslations("pages.games.quiz");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const answered = pick !== null;
  const isRight = answered && pick === question.correct;
  const labelId = `quiz-q-${question.id}`;

  // Domanda nuova: il fuoco va sul suo testo, così il lettore di schermo la legge.
  useEffect(() => {
    headingRef.current?.focus();
  }, [question.id]);

  // Appena si risponde il fuoco passa ad "Avanti" (l'esito lo legge la regione live).
  const wasAnswered = useRef(answered);
  useEffect(() => {
    if (answered && !wasAnswered.current) nextRef.current?.focus();
    wasAnswered.current = answered;
  }, [answered]);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Testata: il disegno del quiz e le tacche. */}
      <Box
        sx={{
          position: "relative",
          height: { xs: 96, sm: 112 },
          background: (theme) => theme.palette.heroGradient.cardHead,
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, opacity: 0.18 }}>
          <GameArt kind="quiz" art={art} />
        </Box>
        {question.draft && (
          <Chip
            size="small"
            label={t("draftChip")}
            variant="outlined"
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              color: HERO_TEXT.primary,
              borderColor: HERO_TEXT.lineStrong,
              bgcolor: BRAND.dark,
              fontWeight: FONT_WEIGHT.semibold,
            }}
          />
        )}
        <Progress index={index} results={results} />
      </Box>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography
          id={labelId}
          ref={headingRef}
          tabIndex={-1}
          variant="h5"
          component="h2"
          sx={{ mb: 2.5, outline: "none" }}
        >
          {question.text}
        </Typography>

        <Box
          role="group"
          aria-labelledby={labelId}
          sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
        >
          {question.answers.map((answer, i) => {
            const isCorrect = i === question.correct;
            const isPicked = i === pick;
            const tone = !answered ? null : isCorrect ? "right" : isPicked ? "wrong" : "off";
            const color =
              tone === "right" ? "success.main" : tone === "wrong" ? "error.main" : undefined;
            return (
              <ButtonBase
                key={i}
                disabled={answered}
                onClick={() => onPick(i)}
                aria-pressed={isPicked}
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  gap: 1.5,
                  minHeight: 56,
                  px: 1.5,
                  py: 1,
                  borderRadius: RADIUS.md,
                  border: tone === "right" || tone === "wrong" ? "2px solid" : "1px solid",
                  borderColor: color ?? "divider",
                  bgcolor: "background.paper",
                  color: tone === "off" ? "text.secondary" : "text.primary",
                  typography: "body1",
                  transition: "border-color .15s",
                  "&:hover": { borderColor: answered ? undefined : "primary.main" },
                  "&.Mui-focusVisible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: "2px",
                  },
                  // Dopo la risposta il bottone non si tocca più, ma si legge bene.
                  "&.Mui-disabled": { color: tone === "off" ? "text.secondary" : "text.primary" },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 32,
                    height: 32,
                    flex: "none",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: FONT_WEIGHT.semibold,
                    border: "1px solid",
                    borderColor: color ?? "divider",
                    ...(color && { bgcolor: color, color: "common.white" }),
                  }}
                >
                  {tone === "right" ? (
                    <CheckIcon fontSize="small" />
                  ) : tone === "wrong" ? (
                    <CloseIcon fontSize="small" />
                  ) : (
                    LETTERS[i]
                  )}
                </Box>
                <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                  {answer}
                </Box>
                {(tone === "right" || tone === "wrong") && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ color, fontWeight: FONT_WEIGHT.semibold, flex: "none" }}
                  >
                    {tone === "right" ? t("rightAnswer") : t("yourAnswer")}
                  </Typography>
                )}
              </ButtonBase>
            );
          })}
        </Box>

        {/* Sempre nella pagina: il lettore di schermo legge l'esito appena compare. */}
        <Box role="status" aria-live="polite">
          {answered && (
            <Box sx={{ mt: 2.5 }}>
              <Typography
                variant="h6"
                component="p"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: isRight ? "success.main" : "error.main",
                }}
              >
                {isRight ? <CheckCircleIcon aria-hidden /> : <CancelIcon aria-hidden />}
                {isRight ? t("right") : t("wrong")}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                {question.explanation}
              </Typography>
            </Box>
          )}
        </Box>

        {answered && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button ref={nextRef} variant="contained" size="large" onClick={onNext}>
              {isLast ? t("seeResult") : t("next")}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Le 5 tacche: quella di adesso in arancio (stato attivo), le fatte verdi o
 * rosse con la spunta o la croce, le altre vuote. Per il lettore di schermo
 * "Domanda 2 di 5".
 */
function Progress({ index, results }: { index: number; results: (boolean | null)[] }) {
  const t = useTranslations("pages.games.quiz");
  return (
    <Box
      sx={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 14,
        display: "flex",
        gap: 0.75,
      }}
    >
      <Box component="span" sx={visuallyHidden}>
        {t("progress", { current: index + 1, total: results.length })}
      </Box>
      {results.map((r, i) => {
        const current = i === index && r === null;
        const fill =
          r === true
            ? OUTCOME.dark.win
            : r === false
              ? OUTCOME.dark.loss
              : current
                ? BRAND.orange
                : HERO_TEXT.surface;
        return (
          <Box
            key={i}
            aria-hidden
            sx={{
              flex: 1,
              height: 22,
              borderRadius: RADIUS.pill,
              display: "grid",
              placeItems: "center",
              bgcolor: fill,
              border: r === null && !current ? `1px solid ${HERO_TEXT.lineStrong}` : "none",
              color: OUTCOME.dark.onFill,
            }}
          >
            {r === true && <CheckIcon sx={{ fontSize: 16 }} />}
            {r === false && <CloseIcon sx={{ fontSize: 16 }} />}
          </Box>
        );
      })}
    </Box>
  );
}
