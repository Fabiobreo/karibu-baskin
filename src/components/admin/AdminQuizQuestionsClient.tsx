"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import QuizPublishDialog from "@/components/admin/QuizPublishDialog";
import QuizStateChip, { QuestionStateChip } from "@/components/admin/QuizStateChip";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/admin/RowActions";
import QuizQuestionDialog, { type AdminQuizQuestion } from "@/components/admin/QuizQuestionDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import { TOUCH_FIELD_ON_PHONE, TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import { QUIZ_TOPICS, type QuizTopic } from "@/lib/content/baskinQuiz";
import {
  canEnableQuiz,
  correctRate,
  countQuestions,
  hasEnglish,
  MIN_SHOWN_FOR_STATS,
  missingToEnableText,
  needsReview,
} from "@/lib/games/quizRules";
import type { GameVisibility } from "@prisma/client";

type StatusFilter = "all" | "DRAFT" | "APPROVED" | "review";

interface AdminQuizQuestionsClientProps {
  quiz: { id: string; title: string; visibility: GameVisibility };
  questions: AdminQuizQuestion[];
}

const LEVEL_LABEL = { EASY: "Facile", MEDIUM: "Media" } as const;

/**
 * Domande di un quiz (UX-67), solo admin: la revisione del club. Ogni domanda
 * nasce o arriva "in prova"; nel gioco entrano solo le approvate. Le
 * statistiche dicono quante volte è uscita e quante risposte giuste, mai chi.
 */
export default function AdminQuizQuestionsClient({
  quiz,
  questions,
}: AdminQuizQuestionsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [level, setLevel] = useState<"" | "EASY" | "MEDIUM">("");
  const [topic, setTopic] = useState("");
  const [editing, setEditing] = useState<AdminQuizQuestion | "new" | null>(null);
  const [publishing, setPublishing] = useState(false);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  const counts = countQuestions(questions);
  const toReview = questions.filter((q) => needsReview(q.shown, q.correctCount)).length;
  const shown = useMemo(
    () =>
      questions.filter(
        (q) =>
          (status === "all" ||
            (status === "review" ? needsReview(q.shown, q.correctCount) : q.status === status)) &&
          (!level || q.level === level) &&
          (!topic || q.topic === topic)
      ),
    [questions, status, level, topic]
  );

  async function request(url: string, init: RequestInit, done: string): Promise<boolean> {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(await readError(res));
      showToast({ message: done, severity: "success" });
      router.refresh();
      return true;
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
      return false;
    }
  }

  const act = (q: AdminQuizQuestion, action: "approve" | "draft" | "resetStats", done: string) =>
    request(
      `/api/admin/quiz-questions/${q.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
      done
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 3, md: 4 } }}>
      <PageHeader
        title={quiz.title}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Giochi", href: "/admin/giochi" },
          { label: "Quiz", href: "/admin/giochi/quiz" },
          { label: quiz.title },
        ]}
        action={
          <Button
            ref={newButtonRef}
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditing("new")}
            sx={{ minHeight: 44 }}
          >
            Nuova domanda
          </Button>
        }
      />

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 0.5 }}>
          <QuizStateChip visibility={quiz.visibility} />
          <Typography variant="body1">
            {counts.approved} approvate su {counts.total} · in inglese {counts.approvedEn}
          </Typography>
          {quiz.visibility === "OFF" && canEnableQuiz(counts) && (
            <Button variant="outlined" onClick={() => setPublishing(true)} sx={{ minHeight: 44 }}>
              Pubblica
            </Button>
          )}
          {quiz.visibility !== "OFF" && (
            <Button
              variant="text"
              onClick={() =>
                void request(
                  `/api/admin/quizzes/${quiz.id}`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ visibility: "OFF" }),
                  },
                  "Quiz spento"
                )
              }
              sx={{ minHeight: 44 }}
            >
              Spegni
            </Button>
          )}
        </Box>
        {!canEnableQuiz(counts) && (
          <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
            {missingToEnableText(counts)} per accenderlo.
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          La percentuale di risposte giuste compare da {MIN_SHOWN_FOR_STATS} uscite. Sotto il 25% la
          domanda è “da rileggere”: troppo difficile o scritta male.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={status}
          onChange={(_e, v: StatusFilter | null) => v && setStatus(v)}
          aria-label="Stato"
        >
          <ToggleButton value="all" sx={TOUCH_TARGET_ON_PHONE}>
            Tutte
          </ToggleButton>
          <ToggleButton value="DRAFT" sx={TOUCH_TARGET_ON_PHONE}>
            In prova
          </ToggleButton>
          <ToggleButton value="APPROVED" sx={TOUCH_TARGET_ON_PHONE}>
            Approvate
          </ToggleButton>
          <ToggleButton value="review" sx={TOUCH_TARGET_ON_PHONE}>
            Da rileggere ({toReview})
          </ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 140, ...TOUCH_FIELD_ON_PHONE }}>
          <InputLabel id="filter-level" shrink>
            Livello
          </InputLabel>
          <Select
            labelId="filter-level"
            label="Livello"
            notched
            displayEmpty
            value={level}
            onChange={(e) => setLevel(e.target.value as "" | "EASY" | "MEDIUM")}
          >
            <MenuItem value="">Tutti</MenuItem>
            <MenuItem value="EASY">Facile</MenuItem>
            <MenuItem value="MEDIUM">Media</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180, ...TOUCH_FIELD_ON_PHONE }}>
          <InputLabel id="filter-topic" shrink>
            Argomento
          </InputLabel>
          <Select
            labelId="filter-topic"
            label="Argomento"
            notched
            displayEmpty
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <MenuItem value="">Tutti</MenuItem>
            {(Object.keys(QUIZ_TOPICS) as QuizTopic[]).map((k) => (
              <MenuItem key={k} value={k}>
                {QUIZ_TOPICS[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {shown.length} {shown.length === 1 ? "domanda" : "domande"}
        </Typography>
      </Box>

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
        {shown.map((q) => {
          const rate = correctRate(q.shown, q.correctCount);
          const review = needsReview(q.shown, q.correctCount);
          const draft = q.status === "DRAFT";
          return (
            <Paper
              component="li"
              key={q.id}
              elevation={0}
              sx={{
                // In prova: bordo tratteggiato e fondo appena grigio; approvata: carta piena.
                border: draft ? "1px dashed" : "1px solid",
                borderColor: draft ? "text.secondary" : "divider",
                bgcolor: draft ? "action.hover" : "background.paper",
                borderRadius: RADIUS.lg,
                p: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                flexWrap: { xs: "wrap", sm: "nowrap" },
              }}
            >
              <Box sx={{ minWidth: 0, flex: "1 1 240px" }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.75 }}
                >
                  <QuestionStateChip status={q.status} />
                  <Typography variant="caption" color="text.secondary">
                    {LEVEL_LABEL[q.level]} · {QUIZ_TOPICS[q.topic as QuizTopic] ?? q.topic}
                    {!hasEnglish(q) && " · senza inglese"} ·{" "}
                    {rate === null
                      ? `uscita ${q.shown} ${q.shown === 1 ? "volta" : "volte"}`
                      : `${Math.round(rate * 100)}% giuste su ${q.shown}`}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                  {q.text}
                </Typography>
                {/* Le tre risposte in vista, la giusta segnata (UX-71). */}
                <Box component="ol" sx={{ listStyle: "none", m: 0, mt: 0.75, p: 0 }}>
                  {q.answers.map((a, n) => {
                    const right = n === q.correct;
                    return (
                      <Box
                        component="li"
                        key={n}
                        sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, py: 0.25 }}
                      >
                        {right ? (
                          <CheckCircleIcon
                            fontSize="small"
                            sx={{ color: "success.main", mt: "2px" }}
                            aria-hidden
                          />
                        ) : (
                          <RadioButtonUncheckedIcon
                            fontSize="small"
                            sx={{ color: "text.secondary", mt: "2px" }}
                            aria-hidden
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: right ? "text.primary" : "text.secondary",
                            fontWeight: right ? FONT_WEIGHT.semibold : undefined,
                          }}
                        >
                          {a}
                          {right && (
                            <Box component="span" sx={{ color: "success.main" }}>
                              {" "}
                              · giusta
                            </Box>
                          )}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {q.explanation}
                </Typography>
                {review && (
                  <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold, mt: 0.5 }}>
                    Da rileggere: la sbagliano quasi tutti.
                  </Typography>
                )}
              </Box>
              <Box sx={{ ml: "auto" }}>
                <RowActions
                  subject={q.text}
                  primary={
                    draft
                      ? {
                          label: "Approva",
                          onClick: () => void act(q, "approve", "Domanda approvata"),
                        }
                      : { label: "Modifica", onClick: () => setEditing(q), emphasis: "outlined" }
                  }
                  items={[
                    ...(draft ? [{ label: "Modifica…", onClick: () => setEditing(q) }] : []),
                    ...(!draft
                      ? [
                          {
                            label: "Rimetti in prova",
                            onClick: () => void act(q, "draft", "Domanda rimessa in prova"),
                          },
                        ]
                      : []),
                    ...(q.shown > 0
                      ? [
                          {
                            label: "Azzera statistiche",
                            onClick: () => void act(q, "resetStats", "Statistiche azzerate"),
                          },
                        ]
                      : []),
                  ]}
                  onDelete={() =>
                    request(
                      `/api/admin/quiz-questions/${q.id}`,
                      { method: "DELETE" },
                      "Domanda eliminata"
                    )
                  }
                  deleteLabel="Elimina domanda…"
                  deleteConfirm={{
                    title: "Eliminare la domanda?",
                    message: "La domanda e le sue statistiche spariscono. Non si può annullare.",
                  }}
                  focusAfterDelete={newButtonRef}
                />
              </Box>
            </Paper>
          );
        })}
      </Box>

      {publishing && (
        <QuizPublishDialog
          quiz={{ id: quiz.id, title: quiz.title, approved: counts.approved }}
          onClose={() => setPublishing(false)}
          onDone={() => {
            setPublishing(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <QuizQuestionDialog
          quizId={quiz.id}
          question={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </Box>
  );
}
