"use client";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { ROLES, roleColorSx } from "@/lib/constants";
import type { ConvocazioneStatRow } from "@/hooks/useConvocazioniSelection";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TOUCH_CHIP_ON_PHONE } from "@/lib/touchTarget";

interface ConvocazioniUnavailableProps {
  rows: ConvocazioneStatRow[];
  /**
   * Tocco su un nome: lo staff segna la disponibilità al posto del giocatore
   * (di solito gli ha detto a voce che c'è). La conferma la chiede il padre.
   */
  onPick?: (row: ConvocazioneStatRow) => void;
}

/**
 * Giocatori che hanno dichiarato "non disponibile": chip compatti per ruolo.
 * Non si convocano da qui: toccando un nome lo staff ne segna prima la
 * disponibilità, così la risposta e la convocazione non si contraddicono.
 */
export default function ConvocazioniUnavailable({ rows, onPick }: ConvocazioniUnavailableProps) {
  if (rows.length === 0) return null;

  const chipSx = {
    fontSize: "0.75rem",
    height: 22,
    fontWeight: FONT_WEIGHT.semibold,
    bgcolor: (theme: Theme) => alpha(theme.palette.error.main, 0.06),
    color: "text.secondary",
    border: (theme: Theme) => `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
    "& .MuiChip-label": { px: 1 },
    ...(onPick && {
      cursor: "pointer",
      // Si tocca: bordo arancio al passaggio, come ogni elemento cliccabile.
      "&:hover, &:focus-visible": { borderColor: "primary.main", color: "text.primary" },
      ...TOUCH_CHIP_ON_PHONE,
    }),
  };

  const noRole = rows.filter((row) => row.candidate.sportRole == null);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="overline"
        color="error"
        fontWeight={FONT_WEIGHT.bold}
        sx={{ display: "block", mb: 1 }}
      >
        Non disponibili ({rows.length})
      </Typography>
      {onPick && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Qualcuno ti ha detto che invece c&apos;è? Tocca il nome e segna la sua disponibilità.
        </Typography>
      )}
      <Stack spacing={0.75}>
        {ROLES.map((r) => {
          const inRole = rows.filter((row) => row.candidate.sportRole === r);
          if (inRole.length === 0) return null;
          return (
            <Box
              key={`unavail-role-${r}`}
              sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
            >
              <Chip
                label={`R${r}`}
                size="small"
                sx={{
                  ...roleColorSx(r),
                  fontSize: TYPE_SCALE.xs,
                  height: 20,
                  minWidth: 32,
                }}
              />
              {inRole.map((row) => (
                <Chip
                  key={`unavail-${row.candidate.kind}-${row.candidate.id}`}
                  label={row.candidate.name}
                  size="small"
                  sx={chipSx}
                  {...(onPick && { onClick: () => onPick(row) })}
                />
              ))}
            </Box>
          );
        })}
        {noRole.length > 0 && (
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
            key="unavail-role-none"
          >
            <Chip
              label="—"
              size="small"
              sx={{
                // Senza ruolo: chip contornato neutro, non un grigio pieno.
                bgcolor: "transparent",
                color: "text.secondary",
                border: "1px solid",
                borderColor: "divider",
                fontSize: TYPE_SCALE.xs,
                height: 20,
                minWidth: 32,
              }}
            />
            {noRole.map((row) => (
              <Chip
                key={`unavail-${row.candidate.kind}-${row.candidate.id}`}
                label={row.candidate.name}
                size="small"
                sx={chipSx}
                {...(onPick && { onClick: () => onPick(row) })}
              />
            ))}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
