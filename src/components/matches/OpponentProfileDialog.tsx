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
import {
  buildScoutingProfile,
  muFromStrength,
  playerNotesError,
  strengthFromMu,
  OPPONENT_STRENGTH_LABELS as STRENGTH_LABELS,
  type OpponentMatchNote,
  type OpponentSheet,
  type OpponentSheetMatch,
} from "@/lib/matches/opponentSheet";
import OpponentPlayerNotes from "@/components/matches/OpponentPlayerNotes";
import OpponentMatchNoteField from "@/components/matches/OpponentMatchNoteField";
import OpponentMatchNoteHistory from "@/components/matches/OpponentMatchNoteHistory";
import { readError } from "@/lib/fetchJson";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

import { errorText } from "@/lib/networkError";
const ROLE_LABELS: Record<number, string> = {
  1: "Ruolo 1",
  2: "Ruolo 2",
  3: "Ruolo 3",
  4: "Ruolo 4",
  5: "Ruolo 5",
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

interface OpponentProfileDialogProps {
  open: boolean;
  onClose: () => void;
  /** ID della squadra avversaria (OpposingTeam): la scheda si salva lì. */
  opponentId: string;
  opponentName: string;
  /** La scheda com'è ora (campi vuoti se non è mai stata compilata). */
  sheet: OpponentSheet;
  onSaved: (sheet: OpponentSheet) => void;
  /**
   * La partita da cui si è aperta la scheda, se è già iniziata: in cima c'è la
   * sua nota. Senza (da `/admin/avversarie`, o prima di giocare) solo la scheda.
   */
  match?: OpponentSheetMatch | null;
  /** Le note delle partite contro questa avversaria: il diario della scheda. */
  matchNotes?: OpponentMatchNote[];
  onMatchNoteSaved?: (matchId: string, note: string | null) => void;
}

/** La scheda com'è salvata, nella stessa forma in cui la costruisce il modulo. */
function sheetSnapshot(profile: OpponentProfile, strength: OpponentStrength | null): string {
  return JSON.stringify([strength, profile]);
}

function emptyCategoryAssessment(): CategoryAssessment {
  return { strength: "MEDIUM", physicality: "MEDIUM" };
}

function parseProfile(current: OpponentProfile | null): Record<string, CategoryAssessment> {
  if (!current) return {};
  return { ...current.categories };
}

/**
 * Scheda di un'avversaria: forza complessiva, valutazione per ruolo e nota.
 * Sta sulla squadra, quindi si apre da `/admin/avversarie` e da qualunque
 * partita contro di lei, giocata o no. Aperta da una partita giocata, in cima
 * c'è la nota di quella partita; la scheda si salva solo se la si è toccata,
 * così "aggiornata il" dice davvero quando è cambiata.
 */
export default function OpponentProfileDialog({
  open,
  onClose,
  opponentId,
  opponentName,
  sheet,
  onSaved,
  match = null,
  matchNotes = [],
  onMatchNoteSaved,
}: OpponentProfileDialogProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Record<string, CategoryAssessment>>(() =>
    parseProfile(sheet.scoutingProfile)
  );
  const [notes, setNotes] = useState(sheet.scoutingProfile?.notes ?? "");
  const [strengthPreset, setStrengthPreset] = useState<OpponentStrength | null>(() =>
    strengthFromMu(sheet.ratingMu)
  );
  const [matchNote, setMatchNote] = useState(match?.note ?? "");

  // Reset lo stato quando il dialog si apre (o cambia avversaria)
  const handleOpen = () => {
    setCategories(parseProfile(sheet.scoutingProfile));
    setNotes(sheet.scoutingProfile?.notes ?? "");
    setStrengthPreset(strengthFromMu(sheet.ratingMu));
    setMatchNote(match?.note ?? "");
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
      const playersError = playerNotesError(categories);
      if (playersError) throw new Error(playersError);
      const scoutingProfile = buildScoutingProfile(categories, notes);
      const before = buildScoutingProfile(
        parseProfile(sheet.scoutingProfile),
        sheet.scoutingProfile?.notes ?? ""
      );
      const sheetChanged =
        sheetSnapshot(scoutingProfile, strengthPreset) !==
        sheetSnapshot(before, strengthFromMu(sheet.ratingMu));
      const noteChanged = !!match && matchNote.trim() !== (match.note ?? "");

      // Prima la nota della partita: se poi la scheda non si salva, il modulo
      // resta aperto e la nota è già al sicuro.
      if (match && noteChanged) {
        const res = await fetch(`/api/matches/${match.matchId}/opponent-note`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: matchNote }),
        });
        if (!res.ok) throw new Error(await readError(res));
        const saved = (await res.json()) as { note: string | null };
        onMatchNoteSaved?.(match.matchId, saved.note);
      }
      if (sheetChanged) {
        const ratingMu = muFromStrength(strengthPreset);
        const res = await fetch(`/api/opposing-teams/${opponentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ratingMu, scoutingProfile }),
        });
        if (!res.ok) throw new Error(await readError(res));
        const saved = (await res.json()) as { scoutingUpdatedAt: string | null };
        onSaved({ ratingMu, scoutingProfile, scoutingUpdatedAt: saved.scoutingUpdatedAt });
      }
      if (sheetChanged || noteChanged) {
        showToast({
          message: !sheetChanged
            ? "Nota della partita salvata"
            : noteChanged
              ? "Scheda e nota della partita salvate"
              : "Scheda avversario salvata",
          severity: "success",
        });
      }
      onClose();
    } catch (err) {
      showToast({
        message: errorText(err, "Errore"),
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
              Scheda avversario
            </Typography>
            <Typography variant="body2" color="text.secondary" display="block">
              {opponentName}
              {sheet.scoutingUpdatedAt &&
                ` · aggiornata il ${format(new Date(sheet.scoutingUpdatedAt), "d MMM yyyy", { locale: it })}`}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {match && (
          <OpponentMatchNoteField match={match} value={matchNote} onChange={setMatchNote} />
        )}

        {/* Sezione forza complessiva stimata → aggiorna OpposingTeam.ratingMu */}
        <Box
          sx={{
            mb: 2.5,
            p: 1.5,
            borderRadius: RADIUS.md,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            fontWeight={FONT_WEIGHT.semibold}
            color="text.secondary"
            display="block"
            mb={1}
          >
            Forza dell&apos;avversaria (serve a stimare quanto sarà equilibrata la partita)
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
                color={strengthPreset === preset ? STRENGTH_COLORS[preset] : undefined}
                sx={{ px: 2, fontSize: TYPE_SCALE.xs }}
              >
                {STRENGTH_LABELS[preset]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {strengthPreset === null && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
              Non impostata: contro questa squadra non si può stimare l&apos;equilibrio della
              partita.
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="body2" color="text.secondary" mb={2}>
          Scegli i ruoli che l&apos;avversaria schiera e valuta forza e fisicità di ciascuno. Vale
          anche un&apos;impressione da fuori, senza averci giocato. Lascia spento un ruolo se non ha
          giocatori o non sai ancora valutarlo.
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
                    sx={{ minWidth: 80 }}
                  />
                  {!isActive && (
                    <Typography variant="caption" color="text.secondary">
                      non valutato
                    </Typography>
                  )}
                </Stack>

                {isActive && assessment && (
                  <Box sx={{ pl: 1.5, borderLeft: 2, borderColor: "divider" }}>
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
                            sx={{ px: 1.5, py: 0.5, fontSize: TYPE_SCALE.xs }}
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
                            sx={{ px: 1.5, py: 0.5, fontSize: TYPE_SCALE.xs }}
                          >
                            {PHYSICALITY_LABELS[p]}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Stack>

                    <OpponentPlayerNotes
                      role={role}
                      players={assessment.players ?? []}
                      onChange={(players) => setField(role, "players", players)}
                    />
                  </Box>
                )}

                {role < 5 && <Divider sx={{ mt: isActive ? 2 : 1 }} />}
              </Box>
            );
          })}
        </Stack>

        <TextField
          label="Note sulla squadra (opzionale)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={2}
          fullWidth
          inputProps={{ maxLength: 500 }}
          sx={{ mt: 3 }}
          placeholder="Es. forte in area, attacca da sinistra…"
        />

        <OpponentMatchNoteHistory
          notes={matchNotes.filter((n) => n.matchId !== match?.matchId)}
          others={!!match}
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
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
