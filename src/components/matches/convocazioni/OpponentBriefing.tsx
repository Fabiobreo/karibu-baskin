"use client";

import { useState } from "react";
import { Alert, Box, Button, Collapse, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { formatRome } from "@/lib/dateUtils";
import { it } from "date-fns/locale";
import {
  hasOpponentSheet,
  matchNoteHeading,
  playerNoteLabel,
  strengthFromMu,
  OPPONENT_STRENGTH_LABELS,
  type OpponentMatchNote,
  type OpponentSheet,
} from "@/lib/matches/opponentSheet";
import { roleSummary, type RoleHint } from "@/lib/matches/opponentBriefing";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** L'ultima partita giocata contro questa avversaria. */
export interface OpponentPreviousMatch {
  date: Date | string;
  teamName: string;
  ourScore: number;
  theirScore: number;
}

interface OpponentBriefingProps {
  opponentName: string;
  sheet: OpponentSheet;
  /** Suggerimenti per ruolo (`roleHints`): nessuno a partita iniziata. */
  hints: RoleHint[];
  onHint: (hint: RoleHint) => void;
  onEdit: () => void;
  /** La nota di partita più recente, se c'è. */
  latestNote?: OpponentMatchNote;
  previous?: OpponentPreviousMatch | null;
}

// Il riquadro si disegna anche sul server: il giorno è quello di Roma da entrambe le parti.
const day = (date: Date | string) => formatRome(new Date(date), "d MMM yyyy", { locale: it });

/**
 * Il riquadro "Avversaria" in cima alle convocazioni: cosa dice la scheda e
 * dove conviene guardare. La scheda informa, non decide: i suggerimenti portano
 * all'elenco di un ruolo e non cambiano la formazione consigliata.
 */
export default function OpponentBriefing({
  opponentName,
  sheet,
  hints,
  onHint,
  onEdit,
  latestNote,
  previous,
}: OpponentBriefingProps) {
  const theme = useTheme();
  // Su telefono i dettagli partono chiusi: prima viene l'elenco da spuntare.
  const isWide = useMediaQuery(theme.breakpoints.up("sm"));
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? isWide;

  const compiled = hasOpponentSheet(sheet);
  const strength = strengthFromMu(sheet.ratingMu);
  const profile = sheet.scoutingProfile;
  const roles = Object.keys(profile?.categories ?? {})
    .sort()
    .flatMap((role) => {
      const assessment = profile!.categories[role]!;
      const summary = roleSummary(assessment);
      return summary ? [{ role, summary, players: assessment.players ?? [] }] : [];
    });
  const hasDetails = roles.length > 0 || !!profile?.notes || !!latestNote || !!previous;

  return (
    <Box
      component="section"
      aria-label={`Avversaria: ${opponentName}`}
      sx={{
        mb: 2,
        px: 2,
        py: 1.5,
        borderRadius: RADIUS.md,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
          <Typography component="h2" variant="subtitle2">
            Avversaria: {opponentName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {compiled
              ? `Forza: ${strength ? OPPONENT_STRENGTH_LABELS[strength] : "non impostata"}` +
                (sheet.scoutingUpdatedAt
                  ? ` · scheda aggiornata il ${day(sheet.scoutingUpdatedAt)}`
                  : "")
              : "Nessuna scheda: compilala per stimare l'equilibrio della partita e avere suggerimenti per ruolo."}
          </Typography>
        </Box>
        {hasDetails && (
          <Button size="small" onClick={() => setUserOpen(!open)} aria-expanded={open}>
            {open ? "Nascondi dettagli" : "Mostra dettagli"}
          </Button>
        )}
        <Button size="small" variant={compiled ? "text" : "outlined"} onClick={onEdit}>
          {compiled ? "Modifica scheda" : "Compila la scheda"}
        </Button>
      </Box>

      {hints.length > 0 && (
        <Stack gap={1} sx={{ mt: 1.5 }}>
          {hints.map((hint) => (
            <Alert
              key={`${hint.role}-${hint.kind}`}
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={() => onHint(hint)}>
                  {hint.action}
                </Button>
              }
            >
              {hint.text}
            </Alert>
          ))}
        </Stack>
      )}

      {hasDetails && (
        <Collapse in={open}>
          <Stack gap={1.5} sx={{ mt: 1.5 }}>
            {roles.length > 0 && (
              <Box>
                {roles.map(({ role, summary, players }) => (
                  <Box key={role} sx={{ mb: 0.5 }}>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                        Ruolo {role}:
                      </Box>{" "}
                      {summary}
                    </Typography>
                    {players.map((p, i) => (
                      <Typography
                        key={i}
                        variant="body2"
                        color="text.secondary"
                        sx={{ pl: 1.5, whiteSpace: "pre-wrap" }}
                      >
                        {playerNoteLabel(p)}: {p.note}
                      </Typography>
                    ))}
                  </Box>
                ))}
              </Box>
            )}
            {profile?.notes && (
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                <Box component="span" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                  Note sulla squadra:
                </Box>{" "}
                {profile.notes}
              </Typography>
            )}
            {latestNote && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Ultima nota di partita · {matchNoteHeading(latestNote, day(latestNote.date))}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {latestNote.note}
                </Typography>
              </Box>
            )}
            {previous && (
              <Typography variant="body2" color="text.secondary">
                Ultimo precedente: {matchNoteHeading(previous, day(previous.date))}
              </Typography>
            )}
          </Stack>
        </Collapse>
      )}
    </Box>
  );
}
