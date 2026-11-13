"use client";
import { useEffect, useRef } from "react";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Link as MuiLink,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useTranslations } from "next-intl";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface QuizQuestionStepProps {
  question: QuizQuestion;
  index: number;
  total: number;
  pick: number | null;
  confirmed: boolean;
  onPick: (answer: number) => void;
  onConfirm: () => void;
  onBack: (() => void) | null;
  onNext: () => void;
  isLast: boolean;
}

/**
 * Una domanda del quiz (UX-61): tre risposte come gruppo di radio, "Conferma",
 * poi l'esito con la spiegazione, letto dal lettore di schermo. Niente tempo.
 * Il verde e il rosso qui sono valenza (UX-29), sempre con icona e parola.
 */
export default function QuizQuestionStep({
  question,
  index,
  total,
  pick,
  confirmed,
  onPick,
  onConfirm,
  onBack,
  onNext,
  isLast,
}: QuizQuestionStepProps) {
  const t = useTranslations("pages.games.quiz");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const isRight = confirmed && pick === question.correct;
  const labelId = `quiz-q-${question.id}`;

  // Domanda nuova: il fuoco va sul suo testo, così il lettore di schermo la legge.
  useEffect(() => {
    headingRef.current?.focus();
  }, [question.id]);

  // Dopo "Conferma" il bottone sparisce: il fuoco passa ad "Avanti" (l'esito lo
  // legge la regione live). Solo al passaggio, non tornando a una domanda fatta.
  const wasConfirmed = useRef(confirmed);
  useEffect(() => {
    if (confirmed && !wasConfirmed.current) nextRef.current?.focus();
    wasConfirmed.current = confirmed;
  }, [confirmed]);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
        {t("progress", { current: index + 1, total })} · {t(`level${question.level}`)}
      </Typography>

      <FormControl component="fieldset" sx={{ width: "100%" }}>
        <FormLabel
          component="legend"
          id={labelId}
          sx={{ color: "text.primary", "&.Mui-focused": { color: "text.primary" } }}
        >
          <Typography
            ref={headingRef}
            tabIndex={-1}
            variant="h5"
            component="h2"
            sx={{ mb: 2, outline: "none" }}
          >
            {question.text}
          </Typography>
        </FormLabel>
        <RadioGroup
          aria-labelledby={labelId}
          value={pick === null ? "" : String(pick)}
          onChange={(e) => onPick(Number(e.target.value))}
        >
          <Stack spacing={1}>
            {question.answers.map((answer, i) => {
              const isCorrect = i === question.correct;
              const isPicked = i === pick;
              const mark = confirmed && (isCorrect || isPicked);
              return (
                <Box
                  key={i}
                  sx={{
                    border: "1px solid",
                    borderColor: !confirmed
                      ? isPicked
                        ? "primary.main"
                        : "divider"
                      : isCorrect
                        ? "success.main"
                        : isPicked
                          ? "error.main"
                          : "divider",
                    borderWidth: mark || (!confirmed && isPicked) ? 2 : 1,
                    borderRadius: RADIUS.md,
                    px: 1,
                  }}
                >
                  <FormControlLabel
                    value={String(i)}
                    disabled={confirmed}
                    control={<Radio />}
                    sx={{
                      m: 0,
                      width: "100%",
                      minHeight: 48,
                      // Disabilitate solo per non cambiare la risposta: il
                      // testo resta leggibile (mai text.disabled, 2,67:1).
                      "& .MuiFormControlLabel-label.Mui-disabled": { color: "text.primary" },
                    }}
                    label={
                      <Box
                        component="span"
                        sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}
                      >
                        <span>{answer}</span>
                        {mark && (
                          <Box
                            component="span"
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              ml: "auto",
                              typography: "caption",
                              fontWeight: FONT_WEIGHT.semibold,
                              color: isCorrect ? "success.main" : "error.main",
                            }}
                          >
                            {isCorrect ? (
                              <CheckCircleIcon fontSize="small" aria-hidden />
                            ) : (
                              <CancelIcon fontSize="small" aria-hidden />
                            )}
                            {isCorrect ? t("rightAnswer") : t("yourAnswer")}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </Box>
              );
            })}
          </Stack>
        </RadioGroup>
      </FormControl>

      {/* Sempre nella pagina: il lettore di schermo legge l'esito appena compare. */}
      <Box role="status" aria-live="polite" sx={{ mt: confirmed ? 2.5 : 0 }}>
        {confirmed && (
          <Box
            sx={{
              p: 2,
              borderRadius: RADIUS.lg,
              border: "1px solid",
              borderColor: isRight ? "success.main" : "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography
              variant="h6"
              component="p"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: isRight ? "success.main" : "text.primary",
              }}
            >
              {isRight ? <CheckCircleIcon aria-hidden /> : <CancelIcon aria-hidden color="error" />}
              {isRight ? t("right") : t("wrong")}
            </Typography>
            {!isRight && (
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {t("correctIs", { answer: question.answers[question.correct] })}
              </Typography>
            )}
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {question.explanation}
            </Typography>
            {question.source && (
              <MuiLink
                href={question.source}
                target="_blank"
                rel="noopener"
                sx={{ display: "inline-block", mt: 1, fontWeight: FONT_WEIGHT.semibold }}
              >
                {t("learnMore")}
              </MuiLink>
            )}
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mt: 3, flexWrap: "wrap" }}>
        {onBack && (
          <Button variant="text" size="large" onClick={onBack}>
            {t("back")}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {confirmed ? (
          <Button ref={nextRef} variant="contained" size="large" onClick={onNext}>
            {isLast ? t("seeResult") : t("next")}
          </Button>
        ) : (
          <Button variant="contained" size="large" onClick={onConfirm} disabled={pick === null}>
            {t("confirm")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
