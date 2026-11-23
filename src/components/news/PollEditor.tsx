"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Button,
  Divider,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

export interface PollDraft {
  question: string;
  multiSelect: boolean;
  closesAt: string | null;
  options: { id?: string; text: string; order: number }[];
}

/** Chi ha già votato: l'editor lo dice e non lascia cambiare il tipo di voto. */
export interface PollVotesInfo {
  voterCount: number;
  byOption: Record<string, number>;
}

interface PollEditorProps {
  value: PollDraft;
  onChange: (draft: PollDraft) => void;
  votes?: PollVotesInfo | null;
}

export default function PollEditor({ value, onChange, votes }: PollEditorProps) {
  const voterCount = votes?.voterCount ?? 0;

  function update(patch: Partial<PollDraft>) {
    onChange({ ...value, ...patch });
  }

  function updateOption(index: number, text: string) {
    const options = value.options.map((o, i) => (i === index ? { ...o, text } : o));
    update({ options });
  }

  function addOption() {
    if (value.options.length >= 8) return;
    update({
      options: [...value.options, { text: "", order: value.options.length }],
    });
  }

  function removeOption(index: number) {
    if (value.options.length <= 2) return;
    update({
      options: value.options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i })),
    });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {voterCount > 0 && (
        <Alert severity="info">
          {voterCount === 1 ? "Ha già votato 1 persona" : `Hanno già votato ${voterCount} persone`}.
          I voti restano: correggi pure i refusi, ma non cambiare il senso delle opzioni.
        </Alert>
      )}
      <TextField
        label="Domanda del sondaggio"
        value={value.question}
        onChange={(e) => update({ question: e.target.value })}
        fullWidth
        required
        inputProps={{ maxLength: 500 }}
        size="small"
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Opzioni (min 2, max 8)
        </Typography>
        {value.options.map((opt, i) => (
          <Box key={opt.id ?? `new-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DragIndicatorIcon fontSize="small" sx={{ color: "text.secondary", flexShrink: 0 }} />
            <TextField
              value={opt.text}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Opzione ${i + 1}`}
              size="small"
              fullWidth
              inputProps={{ maxLength: 200 }}
              helperText={
                opt.id && votes?.byOption[opt.id]
                  ? `${votes.byOption[opt.id]} ${votes.byOption[opt.id] === 1 ? "voto" : "voti"}`
                  : undefined
              }
            />
            <Tooltip title="Rimuovi opzione">
              <span>
                <IconButton
                  size="small"
                  onClick={() => removeOption(i)}
                  disabled={value.options.length <= 2}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addOption}
          disabled={value.options.length >= 8}
          sx={{ alignSelf: "flex-start" }}
        >
          Aggiungi opzione
        </Button>
      </Box>

      <Divider />

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <FormControlLabel
          control={
            <Switch
              checked={value.multiSelect}
              onChange={(e) => update({ multiSelect: e.target.checked })}
              size="small"
              disabled={voterCount > 0}
            />
          }
          label={
            voterCount > 0
              ? "Selezione multipla (non si cambia dopo il primo voto)"
              : "Selezione multipla"
          }
        />

        <TextField
          label="Chiusura sondaggio (opzionale)"
          type="datetime-local"
          value={value.closesAt ?? ""}
          onChange={(e) => update({ closesAt: e.target.value || null })}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 220 }}
        />
      </Box>
    </Box>
  );
}
