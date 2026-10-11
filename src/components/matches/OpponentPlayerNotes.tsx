"use client";

import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import {
  OPPONENT_PLAYER_NOTE_MAX_LENGTH,
  OPPONENT_PLAYER_NOTES_MAX,
  type OpponentPlayerNote,
} from "@/lib/schemas/match";
import { cleanInitials, cleanJerseyNumber, playerNoteLabel } from "@/lib/matches/opponentSheet";
import { TOUCH_TARGET } from "@/lib/touchTarget";

interface OpponentPlayerNotesProps {
  /** Ruolo Baskin a cui appartengono: entra nei nomi accessibili dei campi. */
  role: number;
  players: OpponentPlayerNote[];
  onChange: (players: OpponentPlayerNote[]) => void;
}

/**
 * Giocatori avversari da segnalare dentro un ruolo: numero di maglia, iniziali
 * e una nota. Mai il nome intero: sono persone di altre società, e il campo
 * delle iniziali non lo lascia scrivere.
 */
export default function OpponentPlayerNotes({ role, players, onChange }: OpponentPlayerNotesProps) {
  function update(index: number, patch: Partial<OpponentPlayerNote>) {
    onChange(players.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      {players.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Numero di maglia e iniziali, mai il nome intero. Solo cose di gioco.
        </Typography>
      )}
      <Stack gap={1.5}>
        {players.map((p, i) => {
          const who = playerNoteLabel(p) || `giocatore ${i + 1}`;
          return (
            <Box
              key={i}
              sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "flex-start" }}
            >
              <TextField
                label="N."
                size="small"
                value={p.number ?? ""}
                onChange={(e) => update(i, { number: cleanJerseyNumber(e.target.value) })}
                inputProps={{
                  inputMode: "numeric",
                  "aria-label": `N. di maglia, ruolo ${role}, ${who}`,
                }}
                sx={{ width: 72 }}
              />
              <TextField
                label="Iniziali"
                size="small"
                value={p.initials ?? ""}
                onChange={(e) => update(i, { initials: cleanInitials(e.target.value) })}
                inputProps={{ "aria-label": `Iniziali, ruolo ${role}, ${who}` }}
                sx={{ width: 96 }}
              />
              <TextField
                label="Nota"
                size="small"
                value={p.note}
                onChange={(e) => update(i, { note: e.target.value })}
                multiline
                inputProps={{
                  maxLength: OPPONENT_PLAYER_NOTE_MAX_LENGTH,
                  "aria-label": `Nota, ruolo ${role}, ${who}`,
                }}
                placeholder="Es. cerca il contatto, tira bene da fuori…"
                // Su telefono la nota va a capo sotto numero e iniziali.
                sx={{ flex: "1 1 200px", order: { xs: 1, sm: 0 } }}
              />
              <IconButton
                aria-label={`Togli ${who} dal ruolo ${role}`}
                onClick={() => onChange(players.filter((_, j) => j !== i))}
                sx={TOUCH_TARGET}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Stack>
      {players.length < OPPONENT_PLAYER_NOTES_MAX && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onChange([...players, { note: "" }])}
          sx={{ mt: players.length > 0 ? 1 : 0 }}
        >
          Segnala un giocatore
        </Button>
      )}
    </Box>
  );
}
