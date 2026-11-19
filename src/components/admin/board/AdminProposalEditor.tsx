"use client";
import { useReducer, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import DrillCanvasEditor from "@/components/board/DrillCanvasEditor";
import { drillHistoryReducer } from "@/components/board/drillHistory";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import type { DrillContent } from "@/lib/board/content";
import type { AdminProposal } from "@/lib/board/loadProposals";
import { DRILL_KIND_LABELS } from "@/lib/board/labels";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";

type Kind = "EXERCISE" | "WARMUP";

export interface ProposalPatch {
  title: string;
  description: string | null;
  kind: Kind;
  content: DrillContent;
}

interface AdminProposalEditorProps {
  proposal: AdminProposal;
  onSaved: (patch: ProposalPatch) => void;
  onCancel: () => void;
}

/**
 * Lo staff corregge una proposta prima di adottarla (UX-73): titolo,
 * descrizione, tipo (solo esercizi) e disegno, con lo stesso editor delle
 * proposte e degli schemi. "Mostra il mio nome" resta una scelta dell'autore,
 * che vede le correzioni aprendo la sua proposta.
 */
export default function AdminProposalEditor({
  proposal: p,
  onSaved,
  onCancel,
}: AdminProposalEditorProps) {
  const { showToast } = useToast();
  const [history, dispatch] = useReducer(drillHistoryReducer, {
    content: p.content,
    past: [],
    future: [],
  });
  const [title, setTitle] = useState(p.title);
  const [description, setDescription] = useState(p.description ?? "");
  const [kind, setKind] = useState<Kind>(p.kind === "WARMUP" ? "WARMUP" : "EXERCISE");

  const save = useMutation({
    mutationFn: async () => {
      const patch: ProposalPatch = {
        title: title.trim(),
        description: description.trim() || null,
        kind,
        content: history.content,
      };
      const res = await fetch(`/api/drills/proposals/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, description: patch.description ?? "" }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return patch;
    },
    onSuccess: (patch) => {
      showToast({ message: "Proposta corretta", severity: "success" });
      onSaved(patch);
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <TextField
        label="Titolo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        fullWidth
        slotProps={{ htmlInput: { maxLength: 80 } }}
      />
      <FormControl>
        <FormLabel id="admin-proposal-kind" sx={{ mb: 0.75 }}>
          Tipo
        </FormLabel>
        <ToggleButtonGroup
          exclusive
          value={kind}
          onChange={(_, v: Kind | null) => v && setKind(v)}
          aria-labelledby="admin-proposal-kind"
          sx={{ "& .MuiToggleButton-root": { minHeight: TOUCH_TARGET_SIZE } }}
        >
          <ToggleButton value="EXERCISE">{DRILL_KIND_LABELS.EXERCISE}</ToggleButton>
          <ToggleButton value="WARMUP">{DRILL_KIND_LABELS.WARMUP}</ToggleButton>
        </ToggleButtonGroup>
      </FormControl>
      <TextField
        label="Descrizione"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={3}
        maxRows={10}
        fullWidth
        slotProps={{ htmlInput: { maxLength: 600 } }}
      />
      <DrillCanvasEditor
        title={title || p.title}
        court={p.court}
        history={history}
        dispatch={dispatch}
      />
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          onClick={() => save.mutate()}
          disabled={save.isPending || !title.trim()}
        >
          Salva le correzioni
        </Button>
        <Button variant="text" color="inherit" onClick={onCancel} disabled={save.isPending}>
          Annulla
        </Button>
      </Box>
    </Box>
  );
}
