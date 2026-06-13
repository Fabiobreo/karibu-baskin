"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  TextField,
  CircularProgress,
  Stack,
  Chip,
} from "@mui/material";
import SportsMartialArtsIcon from "@mui/icons-material/SportsMartialArts";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import { useToast } from "@/context/ToastContext";
import type {
  OpponentProfile,
  CategoryAssessment,
  OpponentStrength,
  OpponentPhysicality,
} from "@/lib/schemas/match";
import { OPPONENT_MU_PRESETS } from "@/lib/matches/matchQuality";

const ROLE_LABELS: Record<number, string> = {
  1: "Ruolo 1",
  2: "Ruolo 2",
  3: "Ruolo 3",
  4: "Ruolo 4",
  5: "Ruolo 5",
};

const STRENGTH_LABELS: Record<OpponentStrength, string> = {
  WEAK: "Debole",
  MEDIUM: "Media",
  STRONG: "Forte",
};

const PHYSICALITY_LABELS: Record<OpponentPhysicality, string> = {
  LOW: "Bassa",
  MEDIUM: "Media",
  HIGH: "Alta",
};

const STRENGTH_COLORS: Record<OpponentStrength, "success" | "warning" | "error"> = {
  WEAK: "success",
  MEDIUM: "warning",
  STRONG: "error",
};

const PHYSICALITY_COLORS: Record<OpponentPhysicality, "success" | "warning" | "error"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "error",
};

/** Mappa preset nome → μ per-giocatore. */
const STRENGTH_PRESET_LABELS: Record<string, string> = {
  WEAK: "Debole",
  MEDIUM: "Media",
  STRONG: "Forte",
};
const STRENGTH_PRESET_COLORS: Record<string, "success" | "warning" | "error"> = {
  WEAK: "success",
  MEDIUM: "warning",
  STRONG: "error",
};

/** Converti un μ numerico nel preset più vicino (WEAK/MEDIUM/STRONG/null). */
function muToPreset(mu: number | null | undefined): string | null {
  if (mu == null) return null;
  const diffs = Object.entries(OPPONENT_MU_PRESETS).map(([k, v]) => ({
    key: k,
    diff: Math.abs(mu - v),
  }));
  diffs.sort((a, b) => a.diff - b.diff);
  return diffs[0]?.key ?? null;
}

interface OpponentProfileDialogProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  /** ID della squadra avversaria (OpposingTeam) — per aggiornarne il ratingMu. */
  opponentId: string;
  opponentName: string;
  /** μ attuale dell'avversario (null = non impostato). */
  opponentRatingMu: number | null;
  /** Profilo corrente (null se non ancora compilato). */
  currentProfile: OpponentProfile | null;
  onSaved: (profile: OpponentProfile, newOpponentMu: number | null) => void;
}

function emptyCategoryAssessment(): CategoryAssessment {
  return { strength: "MEDIUM", physicality: "MEDIUM" };
}

function parseProfile(current: OpponentProfile | null): Record<string, CategoryAssessment> {
  if (!current) return {};
  return { ...current.categories };
}

export default function OpponentProfileDialog({
  open,
  onClose,
  matchId,
  opponentId,
  opponentName,
  opponentRatingMu,
  currentProfile,
  onSaved,
}: OpponentProfileDialogProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Record<string, CategoryAssessment>>(() =>
    parseProfile(currentProfile)
  );
  const [notes, setNotes] = useState(currentProfile?.notes ?? "");
  const [strengthPreset, setStrengthPreset] = useState<string | null>(() =>
    muToPreset(opponentRatingMu)
  );

  // Reset lo stato quando il dialog si apre (o cambia partita)
  const handleOpen = () => {
    setCategories(parseProfile(currentProfile));
    setNotes(currentProfile?.notes ?? "");
    setStrengthPreset(muToPreset(opponentRatingMu));
  };

  function toggleCategory(role: number, enabled: boolean) {
    setCategories((prev) => {
      const next = { ...prev };
      if (enabled) {
        next[String(role)] = emptyCategoryAssessment();
      } else {
        delete next[String(role)];
      }
      return next;
    });
  }

  function setField<K extends keyof CategoryAssessment>(
    role: number,
    field: K,
    value: CategoryAssessment[K]
  ) {
    setCategories((prev) => ({
      ...prev,
      [String(role)]: { ...prev[String(role)]!, [field]: value },
    }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const profile: OpponentProfile =
        Object.keys(categories).length === 0
          ? null
          : {
              categories,
              notes: notes.trim() || undefined,
            };

      const newMu = strengthPreset ? (OPPONENT_MU_PRESETS[strengthPreset] ?? null) : null;

      // Salva profilo partita e rating avversario in parallelo
      const [matchRes, teamRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opponentProfile: profile }),
        }),
        fetch(`/api/opposing-teams/${opponentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ratingMu: newMu }),
        }),
      ]);
      if (!matchRes.ok) {
        const err = await matchRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore nel salvataggio del profilo");
      }
      if (!teamRes.ok) {
        const err = await teamRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Errore nel salvataggio della forza stimata");
      }
      onSaved(profile, newMu);
      showToast({ message: "Profilo avversario salvato", severity: "success" });
      onClose();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      TransitionProps={{ onEnter: handleOpen }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" gap={1}>
          <SportsMartialArtsIcon color="primary" />
          <Box>
            <Typography variant="h6" component="span">
              Profila avversario
            </Typography>
            <Typography variant="body2" color="text.secondary" display="block">
              {opponentName}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Sezione forza complessiva stimata → aggiorna OpposingTeam.ratingMu */}
        <Box
          sx={{
            mb: 2.5,
            p: 1.5,
            borderRadius: 1,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            display="block"
            mb={1}
          >
            Forza complessiva stimata (usata per il Match Quality Score)
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={strengthPreset}
            onChange={(_e, v) => setStrengthPreset(v)}
          >
            {(["WEAK", "MEDIUM", "STRONG"] as const).map((preset) => (
              <ToggleButton
                key={preset}
                value={preset}
                color={strengthPreset === preset ? STRENGTH_PRESET_COLORS[preset] : undefined}
                sx={{ px: 2, fontSize: "0.78rem" }}
              >
                {STRENGTH_PRESET_LABELS[preset]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {strengthPreset === null && (
            <Typography variant="caption" color="text.disabled" display="block" mt={0.75}>
              Non impostata — il Match Quality Score non sarà disponibile per questa squadra.
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="body2" color="text.secondary" mb={2}>
          Seleziona le categorie avversarie presenti e valuta la loro forza e fisicità. Lascia
          deselezionata una categoria se non aveva giocatori.
        </Typography>

        <Stack gap={2}>
          {([1, 2, 3, 4, 5] as const).map((role) => {
            const isActive = !!categories[String(role)];
            const assessment = categories[String(role)];
            return (
              <Box key={role}>
                <Stack direction="row" alignItems="center" gap={1} mb={isActive ? 1.5 : 0}>
                  <Chip
                    label={ROLE_LABELS[role]}
                    onClick={() => toggleCategory(role, !isActive)}
                    color={isActive ? "primary" : "default"}
                    variant={isActive ? "filled" : "outlined"}
                    sx={{ fontWeight: 600, minWidth: 80 }}
                  />
                  {!isActive && (
                    <Typography variant="caption" color="text.disabled">
                      nessun giocatore
                    </Typography>
                  )}
                </Stack>

                {isActive && assessment && (
                  <Box sx={{ pl: 1.5, borderLeft: 2, borderColor: "primary.main" }}>
                    {/* Forza */}
                    <Stack direction="row" alignItems="center" gap={1.5} mb={1}>
                      <SportsMartialArtsIcon fontSize="small" color="action" sx={{ width: 20 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                        Forza
                      </Typography>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={assessment.strength}
                        onChange={(_e, v) => v && setField(role, "strength", v as OpponentStrength)}
                      >
                        {(["WEAK", "MEDIUM", "STRONG"] as OpponentStrength[]).map((s) => (
                          <ToggleButton
                            key={s}
                            value={s}
                            color={assessment.strength === s ? STRENGTH_COLORS[s] : undefined}
                            sx={{ px: 1.5, py: 0.5, fontSize: "0.75rem" }}
                          >
                            {STRENGTH_LABELS[s]}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Stack>

                    {/* Fisicità */}
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <FitnessCenterIcon fontSize="small" color="action" sx={{ width: 20 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                        Fisicità
                      </Typography>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={assessment.physicality}
                        onChange={(_e, v) =>
                          v && setField(role, "physicality", v as OpponentPhysicality)
                        }
                      >
                        {(["LOW", "MEDIUM", "HIGH"] as OpponentPhysicality[]).map((p) => (
                          <ToggleButton
                            key={p}
                            value={p}
                            color={assessment.physicality === p ? PHYSICALITY_COLORS[p] : undefined}
                            sx={{ px: 1.5, py: 0.5, fontSize: "0.75rem" }}
                          >
                            {PHYSICALITY_LABELS[p]}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Stack>
                  </Box>
                )}

                {role < 5 && <Divider sx={{ mt: isActive ? 2 : 1 }} />}
              </Box>
            );
          })}
        </Stack>

        <TextField
          label="Note (opzionale)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={2}
          fullWidth
          inputProps={{ maxLength: 500 }}
          sx={{ mt: 3 }}
          placeholder="Es. forte in area, attacca da sinistra…"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annulla
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          Salva profilo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
