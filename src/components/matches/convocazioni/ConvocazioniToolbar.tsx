"use client";
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ROLE_COLORS, ROLES } from "@/lib/constants";

/** Toolbar sticky: conteggio convocati, copertura ruoli e azioni Tutti/Nessuno/Salva. */
export default function ConvocazioniToolbar({
  totalSelectedActive,
  isMulti,
  activeTeamName,
  coverage,
  saving,
  onSelectAll,
  onClearAll,
  onSave,
}: {
  totalSelectedActive: number;
  isMulti: boolean;
  activeTeamName: string;
  coverage: Map<number, number>;
  saving: boolean;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSave: () => void;
}) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 2,
        p: 1.5,
        mb: 2,
        bgcolor: "background.paper",
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        alignItems: "center",
      }}
    >
      <Chip
        icon={<CheckCircleIcon sx={{ fontSize: "16px !important" }} />}
        label={`${totalSelectedActive} convocati${isMulti ? ` per ${activeTeamName}` : ""}`}
        color="primary"
        sx={{ fontWeight: 700 }}
      />

      {/* Copertura ruoli */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Typography
          variant="caption"
          color="text.disabled"
          fontWeight={700}
          sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mr: 0.5 }}
        >
          Copertura:
        </Typography>
        {ROLES.map((r) => {
          const count = coverage.get(r) ?? 0;
          return (
            <Chip
              key={r}
              label={`R${r}: ${count}`}
              size="small"
              sx={{
                bgcolor: count > 0 ? ROLE_COLORS[r] : "transparent",
                color: count > 0 ? "common.white" : "text.disabled",
                fontWeight: 700,
                fontSize: "0.7rem",
                border: `1px solid ${count > 0 ? ROLE_COLORS[r] : "transparent"}`,
              }}
            />
          );
        })}
      </Stack>

      <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
        <Button size="small" onClick={onSelectAll}>
          Tutti
        </Button>
        <Button size="small" color="inherit" onClick={onClearAll}>
          Nessuno
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : undefined}
        >
          Salva{isMulti ? " entrambe" : ""}
        </Button>
      </Box>
    </Paper>
  );
}
