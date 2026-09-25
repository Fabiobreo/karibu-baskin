"use client";
import { Box, Paper, TextField, Typography } from "@mui/material";
import RoleBadge from "@/components/common/RoleBadge";
import StatStepper from "@/components/matches/StatStepper";
import type { StatField } from "@/lib/schemas/match";

type StatValues = Record<StatField, string>;

export interface MobileStatRow extends StatValues {
  key: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  notes: string;
}

interface MatchStatsMobileCardsProps {
  rows: MobileStatRow[];
  cols: { key: StatField; title: string }[];
  isAllowed: (role: number | null, field: StatField) => boolean;
  points: (row: MobileStatRow) => number;
  onChange: (key: string, field: StatField, value: string) => void;
  onNote: (key: string, value: string) => void;
}

// Ordine a bordo campo: prima i canestri, poi i falli (UX-13).
const MOBILE_ORDER: StatField[] = [
  "twoPointers",
  "threePointers",
  "freeThrows",
  "fouls",
  "illegalFouls",
  "shotsAttempted",
];

/**
 * Statistiche da telefono (UX-13): una card per giocatore con contatori −/+
 * da 44px al posto della tabella di campi minuscoli. Solo i campi ammessi dal
 * ruolo del giocatore.
 */
export default function MatchStatsMobileCards({
  rows,
  cols,
  isAllowed,
  points,
  onChange,
  onNote,
}: MatchStatsMobileCardsProps) {
  const ordered = MOBILE_ORDER.map((k) => cols.find((c) => c.key === k)).filter(
    (c): c is { key: StatField; title: string } => !!c
  );
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
      {rows.map((row) => (
        <Paper component="li" key={row.key} variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            {row.sportRole && <RoleBadge role={row.sportRole} variant={row.sportRoleVariant} />}
            <Typography variant="subtitle1" component="h3" fontWeight={700} sx={{ flex: 1 }}>
              {row.name}
            </Typography>
            <Typography variant="h6" component="p" sx={{ typography: "stat" }}>
              {points(row)}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 0.5 }}
              >
                pt
              </Typography>
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gap: 1 }}>
            {ordered
              .filter((c) => isAllowed(row.sportRole, c.key))
              .map((c) => (
                <StatStepper
                  key={c.key}
                  label={c.title}
                  playerName={row.name}
                  value={row[c.key]}
                  onChange={(v) => onChange(row.key, c.key, v)}
                />
              ))}
            <TextField
              value={row.notes}
              onChange={(e) => onNote(row.key, e.target.value)}
              placeholder="Note (opzionale)"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 500, "aria-label": `Note, ${row.name}` } }}
            />
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
