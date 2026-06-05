"use client";
import { useState } from "react";
import {
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
  options: { text: string; order: number }[];
}

interface PollEditorProps {
  value: PollDraft;
  onChange: (draft: PollDraft) => void;
}

export default function PollEditor({ value, onChange }: PollEditorProps) {
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
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DragIndicatorIcon fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
            <TextField
              value={opt.text}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Opzione ${i + 1}`}
              size="small"
              fullWidth
              inputProps={{ maxLength: 200 }}
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
            />
          }
          label="Selezione multipla"
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
