"use client";
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ROLES, roleColorSx } from "@/lib/constants";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";

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
      />

      {/* Copertura ruoli */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={FONT_WEIGHT.semibold}
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
                ...(count > 0
                  ? roleColorSx(r)
                  : { bgcolor: "transparent", color: "text.secondary" }),
                fontSize: TYPE_SCALE.xs,
                border: "1px solid",
                // Ruolo scoperto: chip vuoto con il bordo, non solo il colore.
                borderColor: count > 0 ? "transparent" : "divider",
              }}
            />
          );
        })}
      </Stack>

      <Box
        role="group"
        aria-label="Selezione dei convocati"
        sx={{ display: "flex", gap: 0.5, ml: "auto" }}
      >
        {/* "Tutti" e "Nessuno" sono azioni terziarie, dello stesso peso (UX-30):
            l'arancione e' di "Salva". */}
        <Button size="small" color="inherit" onClick={onSelectAll} sx={TOUCH_TARGET_ON_PHONE}>
          Tutti
        </Button>
        <Button size="small" color="inherit" onClick={onClearAll} sx={TOUCH_TARGET_ON_PHONE}>
          Nessuno
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onSave}
          sx={TOUCH_TARGET_ON_PHONE}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : undefined}
        >
          Salva{isMulti ? " entrambe" : ""}
        </Button>
      </Box>
    </Paper>
  );
}
