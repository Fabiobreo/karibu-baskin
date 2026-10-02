"use client";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { ROLES } from "@/lib/constants";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** Filtro per ruolo della tabella candidati (l'ordinamento sta nelle intestazioni). */
export default function ConvocazioniFilters({
  roleFilter,
  onRoleFilterChange,
}: {
  roleFilter: number | null;
  onRoleFilterChange: (role: number | null) => void;
}) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ p: 1.5, mb: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
    >
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={FONT_WEIGHT.semibold}
          sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mr: 0.5 }}
        >
          Ruolo:
        </Typography>
        <Chip
          label="Tutti"
          size="small"
          variant={roleFilter === null ? "filled" : "outlined"}
          color={roleFilter === null ? "primary" : "default"}
          onClick={() => onRoleFilterChange(null)}
          sx={{ cursor: "pointer", fontSize: TYPE_SCALE.xs }}
        />
        {ROLES.map((r) => (
          <Chip
            key={r}
            label={`R${r}`}
            size="small"
            onClick={() => onRoleFilterChange(r)}
            // Filtro selezionato = stato attivo standard (UX-29), non il colore del ruolo.
            color={roleFilter === r ? "primary" : "default"}
            sx={{ cursor: "pointer", fontSize: TYPE_SCALE.xs }}
          />
        ))}
      </Box>
    </Paper>
  );
}
