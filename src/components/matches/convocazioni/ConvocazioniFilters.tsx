"use client";
import { Box, Chip, Paper, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ROLE_COLORS, ROLES } from "@/lib/constants";

export type ConvocazioniSortKey = "role" | "presences" | "lastCallup" | "seasonCallups" | "name";

/** Filtro per ruolo + ordinamento della tabella candidati. */
export default function ConvocazioniFilters({
  roleFilter,
  onRoleFilterChange,
  sortKey,
  onSortKeyChange,
}: {
  roleFilter: number | null;
  onRoleFilterChange: (role: number | null) => void;
  sortKey: ConvocazioniSortKey;
  onSortKeyChange: (key: ConvocazioniSortKey) => void;
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
          color="text.disabled"
          fontWeight={700}
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
          sx={{ fontWeight: 600, cursor: "pointer", fontSize: "0.72rem" }}
        />
        {ROLES.map((r) => (
          <Chip
            key={r}
            label={`R${r}`}
            size="small"
            onClick={() => onRoleFilterChange(r)}
            sx={{
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.72rem",
              bgcolor: roleFilter === r ? ROLE_COLORS[r] : "transparent",
              color: roleFilter === r ? "common.white" : "text.primary",
              border: `1px solid ${roleFilter === r ? ROLE_COLORS[r] : "transparent"}`,
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
        <Typography
          variant="caption"
          color="text.disabled"
          fontWeight={700}
          sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mr: 0.5 }}
        >
          Ordina:
        </Typography>
        <ToggleButtonGroup
          size="small"
          value={sortKey}
          exclusive
          onChange={(_, v) => v && onSortKeyChange(v as ConvocazioniSortKey)}
          sx={{
            "& .MuiToggleButton-root": {
              fontSize: "0.7rem",
              textTransform: "none",
              py: 0.25,
              px: 1,
            },
          }}
        >
          <ToggleButton value="role">Ruolo</ToggleButton>
          <ToggleButton value="presences">Più presenze</ToggleButton>
          <ToggleButton value="lastCallup">Fermo da più</ToggleButton>
          <ToggleButton value="seasonCallups">Meno partite</ToggleButton>
          <ToggleButton value="name">Nome</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Paper>
  );
}
