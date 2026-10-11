"use client";

import { Box, TextField, Typography } from "@mui/material";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MATCH_OPPONENT_NOTE_MAX_LENGTH } from "@/lib/schemas/match";
import { matchNoteHeading, type OpponentSheetMatch } from "@/lib/matches/opponentSheet";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface OpponentMatchNoteFieldProps {
  match: OpponentSheetMatch;
  value: string;
  onChange: (value: string) => void;
}

/**
 * La nota sull'avversaria per la partita da cui si è aperta la scheda: cosa si
 * è visto quel giorno. Sta in cima, prima della scheda, che resta com'era
 * finché non la si tocca.
 */
export default function OpponentMatchNoteField({
  match,
  value,
  onChange,
}: OpponentMatchNoteFieldProps) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box
        sx={{
          p: 1.5,
          borderRadius: RADIUS.md,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" component="h3">
          Nota di questa partita
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          {matchNoteHeading(match, format(new Date(match.date), "d MMM yyyy", { locale: it }))}
        </Typography>
        <TextField
          label="Com'era l'avversaria? (facoltativa)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          inputProps={{ maxLength: MATCH_OPPONENT_NOTE_MAX_LENGTH }}
          placeholder="Es. mancava il loro 5 titolare, hanno un 3 nuovo molto veloce…"
          helperText="Per i singoli giocatori usa numero di maglia e iniziali, mai il nome intero."
        />
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 2, fontWeight: FONT_WEIGHT.semibold }}
      >
        La scheda qui sotto è ancora così? Cambia solo quello che è cambiato.
      </Typography>
    </Box>
  );
}
