"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { GameVisibility } from "@prisma/client";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import { MAX_QUIZ_LENGTH, MIN_QUIZ_LENGTH } from "@/lib/games/quiz";
import { minApprovedToEnable } from "@/lib/games/quizRules";
import { TOUCH_FIELD_ON_PHONE } from "@/lib/touchTarget";

interface QuizLengthControlProps {
  quizId: string;
  /** Domande per partita salvate (`Quiz.questionCount`). */
  value: number;
  visibility: GameVisibility;
  /** Domande approvate: su un quiz acceso non si sceglie un numero che non regge. */
  approved: number;
}

const LENGTHS = Array.from(
  { length: MAX_QUIZ_LENGTH - MIN_QUIZ_LENGTH + 1 },
  (_, i) => MIN_QUIZ_LENGTH + i
);

/**
 * Domande per partita di un quiz (UX-67), scelte dalla pagina delle domande:
 * si salva subito, dopo una conferma, perché le migliori partite ripartono da
 * zero. Su un quiz acceso i numeri che le domande approvate non reggono sono
 * spenti (l'API li rifiuta con 409).
 */
export default function QuizLengthControl({
  quizId,
  value,
  visibility,
  approved,
}: QuizLengthControlProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [current, setCurrent] = useState(value);

  const save = useMutation({
    mutationFn: async (questionCount: number) => {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionCount }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return questionCount;
    },
    onSuccess: (n) => {
      setCurrent(n);
      showToast({ message: `Ora ${n} domande per partita`, severity: "success" });
      router.refresh();
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  function choose(n: number) {
    if (n === current) return;
    openConfirm(
      `${n} domande per partita?`,
      "Le prossime partite avranno questo numero di domande. Le migliori partite salvate ripartono da zero, perché erano su un altro numero di domande.",
      () => save.mutate(n),
      { confirmLabel: "Cambia", confirmColor: "primary" }
    );
  }

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 200, ...TOUCH_FIELD_ON_PHONE }}>
        <InputLabel id={`quiz-length-${quizId}`}>Domande per partita</InputLabel>
        <Select
          labelId={`quiz-length-${quizId}`}
          label="Domande per partita"
          value={current}
          disabled={save.isPending}
          onChange={(e) => choose(Number(e.target.value))}
        >
          {LENGTHS.map((n) => {
            const needed = minApprovedToEnable(n);
            const blocked = visibility !== "OFF" && n !== current && approved < needed;
            return (
              <MenuItem key={n} value={n} disabled={blocked}>
                {blocked ? `${n} (servono ${needed} approvate)` : n}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      {ConfirmDialog}
    </>
  );
}
