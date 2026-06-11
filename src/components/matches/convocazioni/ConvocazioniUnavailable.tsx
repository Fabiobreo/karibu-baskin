"use client";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { ROLE_COLORS, ROLES } from "@/lib/constants";
import type { ConvocazioneStatRow } from "@/hooks/useConvocazioniSelection";

/** Giocatori che hanno dichiarato "non disponibile": chip compatti per ruolo, non selezionabili. */
export default function ConvocazioniUnavailable({ rows }: { rows: ConvocazioneStatRow[] }) {
  if (rows.length === 0) return null;

  const chipSx = {
    fontSize: "0.72rem",
    height: 22,
    fontWeight: 600,
    bgcolor: (theme: Theme) => alpha(theme.palette.match.loss, 0.06),
    color: "text.secondary",
    border: (theme: Theme) => `1px solid ${alpha(theme.palette.match.loss, 0.25)}`,
    "& .MuiChip-label": { px: 1 },
  };

  const noRole = rows.filter((row) => row.candidate.sportRole == null);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="overline"
        color="error"
        fontWeight={800}
        sx={{ letterSpacing: "0.08em", display: "block", mb: 1 }}
      >
        Non disponibili ({rows.length})
      </Typography>
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
                  bgcolor: ROLE_COLORS[r],
                  color: "common.white",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  height: 18,
                  minWidth: 32,
                }}
              />
              {inRole.map((row) => (
                <Chip
                  key={`unavail-${row.candidate.kind}-${row.candidate.id}`}
                  label={row.candidate.name}
                  size="small"
                  sx={chipSx}
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
                bgcolor: "grey.400",
                color: "common.white",
                fontWeight: 700,
                fontSize: "0.68rem",
                height: 18,
                minWidth: 32,
              }}
            />
            {noRole.map((row) => (
              <Chip
                key={`unavail-${row.candidate.kind}-${row.candidate.id}`}
                label={row.candidate.name}
                size="small"
                sx={chipSx}
              />
            ))}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
