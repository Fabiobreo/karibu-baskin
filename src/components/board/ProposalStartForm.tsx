"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { proposalEditPath } from "@/lib/board/proposals";
import { RADIUS } from "@/lib/radius";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";
import { proposalError } from "./proposalErrors";

type Kind = "EXERCISE" | "WARMUP";
type Court = "FULL" | "HALF";

/**
 * Primo passo di una proposta (UX-73): titolo, tipo (solo esercizi) e campo.
 * Crea la bozza dell'autore e apre l'editor.
 */
export default function ProposalStartForm() {
  const t = useTranslations("board");
  const tp = useTranslations("board.proposal");
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("EXERCISE");
  const [court, setCourt] = useState<Court>("HALF");

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/drills/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, kind, court }),
      });
      if (!res.ok) throw new Error(await proposalError(res, tp));
      return (await res.json()) as { id: string };
    },
    onSuccess: ({ id }) => router.replace(proposalEditPath(id)),
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) create.mutate();
      }}
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: RADIUS.lg, display: "grid", gap: 2.5 }}
    >
      <TextField
        label={tp("titleLabel")}
        placeholder={tp("titlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        fullWidth
        slotProps={{ htmlInput: { maxLength: 80 } }}
      />
      <FormControl>
        <FormLabel id="proposal-kind" sx={{ mb: 0.75 }}>
          {tp("kindLabel")}
        </FormLabel>
        <ToggleButtonGroup
          exclusive
          value={kind}
          onChange={(_, v: Kind | null) => v && setKind(v)}
          aria-labelledby="proposal-kind"
          sx={{ "& .MuiToggleButton-root": { minHeight: TOUCH_TARGET_SIZE, flex: 1 } }}
        >
          <ToggleButton value="EXERCISE">{t("kinds.EXERCISE")}</ToggleButton>
          <ToggleButton value="WARMUP">{t("kinds.WARMUP")}</ToggleButton>
        </ToggleButtonGroup>
      </FormControl>
      <FormControl>
        <FormLabel id="proposal-court" sx={{ mb: 0.75 }}>
          {tp("courtLabel")}
        </FormLabel>
        <ToggleButtonGroup
          exclusive
          value={court}
          onChange={(_, v: Court | null) => v && setCourt(v)}
          aria-labelledby="proposal-court"
          sx={{ "& .MuiToggleButton-root": { minHeight: TOUCH_TARGET_SIZE, flex: 1 } }}
        >
          <ToggleButton value="HALF">{t("courts.HALF")}</ToggleButton>
          <ToggleButton value="FULL">{t("courts.FULL")}</ToggleButton>
        </ToggleButtonGroup>
      </FormControl>
      <Box>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!title.trim() || create.isPending}
        >
          {tp("start")}
        </Button>
      </Box>
    </Paper>
  );
}
