"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Paper, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/admin/RowActions";
import QuizFormDialog, { type AdminQuizRow } from "@/components/admin/QuizFormDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import { GAME_VISIBILITY_LABELS } from "@/lib/games/gameSettings";
import { quizPath } from "@/lib/games/quiz";
import { canEnableQuiz, isPlayableIn, missingToEnableText } from "@/lib/games/quizRules";

interface AdminQuizListClientProps {
  quizzes: AdminQuizRow[];
  /** Giorni contati nella riga delle partite. */
  windowDays: number;
}

/**
 * Quiz del club (UX-67), solo admin: un quiz per riga, con chi lo vede, le
 * domande approvate e le partite recenti. "Domande" apre la revisione.
 */
export default function AdminQuizListClient({ quizzes, windowDays }: AdminQuizListClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<AdminQuizRow | "new" | null>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

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

  const move = (quiz: AdminQuizRow, direction: "up" | "down") =>
    request(
      `/api/admin/quizzes/${quiz.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move: direction }),
      },
      "Ordine salvato"
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 3, md: 4 } }}>
      <PageHeader
        title="Quiz"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Giochi", href: "/admin/giochi" },
          { label: "Quiz" },
        ]}
        action={
          <Button
            ref={newButtonRef}
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditing("new")}
            sx={{ minHeight: 44 }}
          >
            Nuovo quiz
          </Button>
        }
      />

      <Typography variant="body2" color="text.secondary">
        Un quiz nasce spento e si accende con almeno 8 domande approvate. Nel gioco entrano solo le
        domande approvate; in inglese solo quelle tradotte.
      </Typography>

      {quizzes.length === 0 ? (
        <Typography variant="body1">Nessun quiz.</Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
          {quizzes.map((quiz, i) => {
            const { counts } = quiz;
            const warning =
              quiz.visibility === "OFF"
                ? canEnableQuiz(counts)
                  ? null
                  : `${missingToEnableText(counts)} per accenderlo.`
                : !isPlayableIn(counts, "it")
                  ? "Acceso, ma con meno di 5 domande approvate: non si vede sul sito."
                  : !canEnableQuiz(counts)
                    ? "Acceso con meno di 8 domande approvate: le partite si ripetono presto."
                    : null;
            return (
              <Paper
                component="li"
                key={quiz.id}
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: RADIUS.lg,
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
              >
                <Box sx={{ minWidth: 0, flex: "1 1 220px" }}>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: FONT_WEIGHT.semibold, overflowWrap: "anywhere" }}
                  >
                    {quiz.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {GAME_VISIBILITY_LABELS[quiz.visibility]} · {counts.approved} approvate su{" "}
                    {counts.total} · in inglese {counts.approvedEn}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Partite negli ultimi {windowDays} giorni: {quiz.plays}
                    {quiz.toReview > 0 &&
                      ` · ${quiz.toReview} ${quiz.toReview === 1 ? "domanda" : "domande"} da rileggere`}
                  </Typography>
                  {warning && (
                    <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                      {warning}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ ml: "auto" }}>
                  <RowActions
                    subject={quiz.title}
                    primary={{ label: "Domande", href: `/admin/giochi/quiz/${quiz.id}` }}
                    items={[
                      { label: "Modifica…", onClick: () => setEditing(quiz) },
                      ...(i > 0
                        ? [{ label: "Sposta su", onClick: () => void move(quiz, "up") }]
                        : []),
                      ...(i < quizzes.length - 1
                        ? [{ label: "Sposta giù", onClick: () => void move(quiz, "down") }]
                        : []),
                      {
                        label: quiz.visibility === "OFF" ? "Prova in anteprima" : "Apri il quiz",
                        href: quizPath(quiz.slug),
                        external: true,
                      },
                    ]}
                    onDelete={() =>
                      request(
                        `/api/admin/quizzes/${quiz.id}`,
                        { method: "DELETE" },
                        "Quiz eliminato"
                      )
                    }
                    deleteLabel="Elimina quiz…"
                    deleteConfirm={{
                      title: "Eliminare il quiz?",
                      message: `“${quiz.title}” sparisce dal sito con tutte le sue ${counts.total} domande, le statistiche e le migliori partite. Non si può annullare.`,
                    }}
                    focusAfterDelete={newButtonRef}
                  />
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {editing && (
        <QuizFormDialog
          open
          quiz={editing === "new" ? null : editing}
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
