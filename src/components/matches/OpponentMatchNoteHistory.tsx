import { Box, Stack, Typography } from "@mui/material";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { matchNoteHeading, type OpponentMatchNote } from "@/lib/matches/opponentSheet";

interface OpponentMatchNoteHistoryProps {
  notes: OpponentMatchNote[];
  /** C'è già, sopra, la nota della partita da cui si è aperta la scheda. */
  others?: boolean;
}

/**
 * Il diario della scheda: le note scritte dopo le partite contro questa
 * avversaria, dalla più recente. Spiegano perché la scheda è cambiata nel tempo.
 */
export default function OpponentMatchNoteHistory({
  notes,
  others = false,
}: OpponentMatchNoteHistoryProps) {
  if (notes.length === 0) return null;
  const sorted = [...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" component="h3" mb={1}>
        {others ? "Note delle altre partite" : "Note delle partite"}
      </Typography>
      <Stack gap={1.5}>
        {sorted.map((n) => (
          <Box key={n.matchId} sx={{ pl: 1.5, borderLeft: 2, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {matchNoteHeading(n, format(new Date(n.date), "d MMM yyyy", { locale: it }))}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {n.note}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
