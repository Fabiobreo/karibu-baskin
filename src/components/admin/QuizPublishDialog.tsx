"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";

type PublishTo = "MEMBERS" | "PUBLIC";

interface QuizPublishDialogProps {
  quiz: { id: string; title: string; approved: number };
  onClose: () => void;
  onDone: () => void;
}

/**
 * "Pubblica" di un quiz spento (UX-71): si sceglie a chi (tesserati di
 * partenza, oppure tutti) e si accende in un passo. La regola delle 8 domande
 * approvate la controlla la PUT: chi chiama mostra il bottone solo se basta.
 */
export default function QuizPublishDialog({ quiz, onClose, onDone }: QuizPublishDialogProps) {
  const { showToast } = useToast();
  const [to, setTo] = useState<PublishTo>("MEMBERS");
  const [error, setError] = useState<string | null>(null);

  const publish = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: to }),
      });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: () => {
      showToast({
        message: to === "PUBLIC" ? "Quiz pubblicato per tutti" : "Quiz pubblicato per i tesserati",
        severity: "success",
      });
      onDone();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <ResponsiveDialog open onClose={() => !publish.isPending && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Pubblica “{quiz.title}”</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Entrano nel gioco le {quiz.approved} domande approvate. Chi lo vede?
        </Typography>
        <RadioGroup value={to} onChange={(e) => setTo(e.target.value as PublishTo)}>
          <FormControlLabel
            value="MEMBERS"
            control={<Radio />}
            label="Solo tesserati"
            sx={{ minHeight: 44 }}
          />
          <FormControlLabel
            value="PUBLIC"
            control={<Radio />}
            label="Per tutti, anche senza account (compare su Google)"
            sx={{ minHeight: 44 }}
          />
        </RadioGroup>
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={publish.isPending}>
          Annulla
        </Button>
        <Button variant="contained" onClick={() => publish.mutate()} disabled={publish.isPending}>
          Pubblica
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
