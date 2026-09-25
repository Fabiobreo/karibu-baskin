"use client";
import { Box, IconButton, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

interface StatStepperProps {
  label: string;
  /** Nome del giocatore, per le etichette dei bottoni lette dal lettore di schermo. */
  playerName: string;
  value: string;
  onChange: (value: string) => void;
}

const SIZE = 44;

/**
 * Contatore con − e + da 44px per le statistiche da telefono (UX-13): a bordo
 * campo si tocca "+" a ogni canestro invece di scrivere in un campo minuscolo.
 * Il numero resta modificabile a mano.
 */
export default function StatStepper({ label, playerName, value, onChange }: StatStepperProps) {
  const n = parseInt(value || "0", 10) || 0;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
        {label}
      </Typography>
      <IconButton
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        disabled={n === 0}
        aria-label={`Togli 1: ${label}, ${playerName}`}
        sx={{ width: SIZE, height: SIZE, border: "1px solid", borderColor: "divider" }}
      >
        <RemoveIcon />
      </IconButton>
      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        slotProps={{
          htmlInput: {
            inputMode: "numeric",
            pattern: "[0-9]*",
            maxLength: 3,
            "aria-label": `${label}, ${playerName}`,
          },
        }}
        sx={{
          width: 64,
          "& .MuiOutlinedInput-root": { height: SIZE },
          "& input": { textAlign: "center", fontWeight: 800 },
        }}
      />
      <IconButton
        onClick={() => onChange(String(n + 1))}
        aria-label={`Aggiungi 1: ${label}, ${playerName}`}
        sx={{
          width: SIZE,
          height: SIZE,
          bgcolor: "primary.fill",
          color: "common.white",
          "&:hover": { bgcolor: "primary.dark" },
        }}
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
}
