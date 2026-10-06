"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Grid2 as Grid,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useState, useEffect, useRef, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slugUtils";
import ImageUploader from "@/components/common/ImageUploader";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  CLUB_TEAM_TINT,
  TEAM_TINTS,
  TEAM_TINT_LABELS,
  suggestTeamTint,
  teamColor,
  teamTint,
  type TeamTint,
  teamFill,
} from "@/lib/teamColors";
import StatusPill from "@/components/common/StatusPill";
import { readError } from "@/lib/fetchJson";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TEAM_LABEL } from "@/lib/palette";
import RowActions, { type RowAction } from "@/components/admin/RowActions";
import { teamMenuEntries } from "@/lib/adminRowActions";
import { useToast } from "@/context/ToastContext";
import { TOUCH_CHIP_ON_PHONE, TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";

// ── Tinte squadra ──────────────────────────────────────────────────────────────

// Tinte che lo staff puo' scegliere (UX-29): la palette chiusa, tranne
// l'Ardesia, riservata alla squadra Karibu di stagione.
const PICKABLE_TINTS: readonly TeamTint[] = TEAM_TINTS.filter((t) => t !== CLUB_TEAM_TINT);

// ── Stagione corrente automatica ──────────────────────────────────────────────

function currentSeasonLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function seasonLabel(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

/** Stagione precedente ("2026-27" -> "2025-26"), o null se il formato non torna. */
function previousSeason(season: string): string | null {
  const start = parseInt(season.slice(0, 4), 10);
  return Number.isNaN(start) ? null : seasonLabel(start - 1);
}

// ── Tipi ──────────────────────────────────────────────────────────────────────

type Team = {
  id: string;
  name: string;
  season: string;
  championship: string | null;
  color: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Karibu di stagione (tutti i giocatori): vedi @/lib/matches/mixedTeam. */
  isMixed?: boolean;
  /** Solo per la Karibu: in questa stagione gioca il campionato. */
  playsLeague?: boolean;
  _count: { memberships: number; matches: number };
};

type SeasonRecord = { label: string; isCurrent: boolean };
type Props = {
  teams: Team[];
  /** Le Karibu di stagione gia' create (una per stagione, al massimo). */
  clubTeams: Team[];
  seasons: SeasonRecord[];
  /** Creare, modificare ed eliminare una squadra è dell'admin: l'API lo rifiuta all'allenatore. */
  isAdmin: boolean;
};

// ── Componente principale ─────────────────────────────────────────────────────

export default function AdminSquadreClient({
  teams: initialTeams,
  clubTeams: initialClubTeams,
  seasons: initialSeasons,
  isAdmin,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  // Dopo un'eliminazione il focus va sul titolo della stagione: la tessera non c'è più.
  const seasonHeadingRef = useRef<HTMLHeadingElement>(null);
  const [teams, setTeams] = useState(initialTeams);
  const [clubTeams, setClubTeams] = useState(initialClubTeams);
  const [savingClub, setSavingClub] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Stagioni
  const existingSeasons = Array.from(new Set(teams.map((t) => t.season))).sort((a, b) =>
    b.localeCompare(a)
  );
  const [extraSeasons, setExtraSeasons] = useState<string[]>([]);
  const [autoSeason, setAutoSeason] = useState<string>("");
  const allSeasons = Array.from(
    new Set([...existingSeasons, ...extraSeasons, ...(autoSeason ? [autoSeason] : [])])
  ).sort((a, b) => b.localeCompare(a));
  const [activeSeason, setActiveSeason] = useState<string>(
    initialSeasons.find((s) => s.isCurrent)?.label ?? existingSeasons[0] ?? ""
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeams(initialTeams);
  }, [initialTeams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClubTeams(initialClubTeams);
  }, [initialClubTeams]);

  // Calcola stagione corrente lato client (evita hydration mismatch con new Date())
  useEffect(() => {
    const cur = currentSeasonLabel();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoSeason(cur);
    if (!activeSeason) setActiveSeason(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stagione "in corso" (dal DB)
  const [seasons, setSeasons] = useState(initialSeasons);
  const [settingCurrent, setSettingCurrent] = useState(false);
  const currentSeasonLabel_ = seasons.find((s) => s.isCurrent)?.label ?? null;
  const activeIsCurrentSeason = activeSeason === currentSeasonLabel_;

  async function handleSetCurrentSeason() {
    setSettingCurrent(true);
    await fetch("/api/competitive-teams/seasons/current", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: activeSeason }),
    });
    setSeasons((prev) =>
      prev
        .map((s) => ({ ...s, isCurrent: s.label === activeSeason }))
        .concat(
          prev.some((s) => s.label === activeSeason)
            ? []
            : [{ label: activeSeason, isCurrent: true }]
        )
    );
    setSettingCurrent(false);
  }

  // Dialog nuova stagione
  const [newSeasonDialog, setNewSeasonDialog] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState(0);

  // Dialog crea/modifica squadra
  const [teamDialog, setTeamDialog] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState<{
    name: string;
    championship: string;
    /** Chiave della tinta; null solo per una squadra storica senza colore. */
    color: TeamTint | null;
    description: string;
    imageUrl: string | null;
  }>({
    name: "",
    championship: "",
    color: null,
    description: "",
    imageUrl: null,
  });
  // Lo staff ha scelto un colore a mano: da li' il nome non lo ricalcola piu'.
  const [colorTouched, setColorTouched] = useState(false);
  const [teamError, setTeamError] = useState("");

  // ── Stagioni ─────────────────────────────────────────────────────────────────

  function openNewSeason() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const startYear = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    setNewSeasonYear(startYear + 1);
    setNewSeasonDialog(true);
  }

  function confirmNewSeason() {
    const label = seasonLabel(newSeasonYear);
    if (!allSeasons.includes(label)) setExtraSeasons((prev) => [...prev, label]);
    setActiveSeason(label);
    setNewSeasonDialog(false);
  }

  // ── Squadre ───────────────────────────────────────────────────────────────────

  /** Squadre della stagione precedente a quella indicata. */
  function previousSeasonTeams(season: string) {
    const prev = previousSeason(season);
    return teams.filter((t) => t.season === prev);
  }

  /** Colori gia' usati nella stagione, esclusa la squadra che si modifica. */
  function sameSeasonColors(season: string, exceptId?: string) {
    return teams.filter((t) => t.season === season && t.id !== exceptId).map((t) => t.color);
  }

  function openCreate() {
    setTeamForm({
      name: "",
      championship: "",
      color: suggestTeamTint("", previousSeasonTeams(activeSeason), sameSeasonColors(activeSeason)),
      description: "",
      imageUrl: null,
    });
    setColorTouched(false);
    setEditTeam(null);
    setTeamError("");
    setTeamDialog(true);
  }

  function openEdit(team: Team) {
    setTeamForm({
      name: team.name,
      championship: team.championship ?? "",
      // Un vecchio hex si porta sulla tinta della palette: salvando, resta la chiave.
      color: teamTint(team.color),
      description: team.description ?? "",
      imageUrl: team.imageUrl ?? null,
    });
    setColorTouched(true);
    setEditTeam(team);
    setTeamError("");
    setTeamDialog(true);
  }

  /** In questa stagione il club gioca il campionato come Karibu, o no. */
  async function handleClubLeague(playsLeague: boolean) {
    setSavingClub(true);
    try {
      const res = await fetch("/api/competitive-teams/seasons/club-team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: activeSeason, playsLeague }),
      });
      if (!res.ok) {
        showToast({ message: await readError(res), severity: "error" });
        return;
      }
      const saved = (await res.json()) as { id: string; name: string; playsLeague: boolean };
      setClubTeams((prev) =>
        prev.some((t) => t.id === saved.id)
          ? prev.map((t) => (t.id === saved.id ? { ...t, playsLeague: saved.playsLeague } : t))
          : [
              ...prev,
              {
                id: saved.id,
                name: saved.name,
                season: activeSeason,
                championship: null,
                color: null,
                description: null,
                imageUrl: null,
                isMixed: true,
                playsLeague: saved.playsLeague,
                _count: { memberships: 0, matches: 0 },
              },
            ]
      );
      showToast({
        message: playsLeague
          ? "Karibu gioca il campionato in questa stagione"
          : "Karibu torna solo per amichevoli e tornei",
        severity: "success",
      });
      router.refresh();
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setSavingClub(false);
    }
  }

  async function handleSaveTeam() {
    setTeamError("");
    if (!teamForm.name.trim()) {
      setTeamError("Il nome è obbligatorio");
      return;
    }
    startTransition(async () => {
      const method = editTeam ? "PUT" : "POST";
      const url = editTeam ? `/api/competitive-teams/${editTeam.id}` : "/api/competitive-teams";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editTeam?.isMixed
            ? // Della Karibu si scrivono solo questi tre: il resto è dell'app.
              {
                championship: teamForm.championship,
                description: teamForm.description,
                imageUrl: teamForm.imageUrl,
              }
            : { ...teamForm, season: editTeam ? editTeam.season : activeSeason }
        ),
      });
      if (!res.ok) {
        setTeamError(await readError(res));
        return;
      }
      setTeamDialog(false);
      router.refresh();
    });
  }

  function handleNameChange(name: string) {
    setTeamForm((f) => ({
      ...f,
      name,
      // Squadra nuova, colore non ancora scelto a mano: propone la tinta
      // dell'omonima della stagione prima (o la prima libera).
      color:
        !editTeam && !colorTouched
          ? suggestTeamTint(name, previousSeasonTeams(activeSeason), sameSeasonColors(activeSeason))
          : f.color,
    }));
  }

  function pickColor(tint: TeamTint) {
    setColorTouched(true);
    setTeamForm((f) => ({ ...f, color: tint }));
  }

  async function handleDeleteTeam(teamId: string) {
    const res = await fetch(`/api/competitive-teams/${teamId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast({ message: await readError(res), severity: "error" });
      return false;
    }
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    showToast({ message: "Squadra eliminata", severity: "success" });
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const teamsInSeason = teams.filter((t) => t.season === activeSeason);
  const clubTeam = clubTeams.find((t) => t.season === activeSeason) ?? null;
  const clubPlaysLeague = !!clubTeam?.playsLeague;

  // Un'altra squadra della stessa stagione ha gia' la tinta scelta: avviso, non blocco.
  const formSeason = editTeam ? editTeam.season : activeSeason;
  const colorClash =
    teamForm.color != null
      ? teams.find(
          (t) =>
            t.season === formSeason && t.id !== editTeam?.id && teamTint(t.color) === teamForm.color
        )
      : undefined;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Una stagione nuova serve solo a crearci squadre, che sono dell'admin. */}
      {isAdmin && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openNewSeason}
            sx={TOUCH_TARGET_ON_PHONE}
          >
            Nuova stagione
          </Button>
        </Box>
      )}

      {/* Chip stagioni */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
        {allSeasons.map((season) => {
          const isCurrent = season === currentSeasonLabel_;
          return (
            <Chip
              key={season}
              label={`Stagione ${season}`}
              icon={isCurrent ? <StarIcon sx={{ fontSize: "14px !important" }} /> : undefined}
              onClick={() => setActiveSeason(season)}
              color={season === activeSeason ? "primary" : "default"}
              variant={season === activeSeason ? "filled" : "outlined"}
              sx={{ cursor: "pointer", ...TOUCH_CHIP_ON_PHONE }}
            />
          );
        })}
      </Box>

      {/* Intestazione stagione attiva */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              ref={seasonHeadingRef}
              tabIndex={-1}
              variant="h5"
              component="h2"
              sx={{ outline: "none" }}
            >
              Stagione {activeSeason}
            </Typography>
            {activeIsCurrentSeason && (
              <StatusPill label="In corso" variant="outlined" icon={<StarIcon />} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {teamsInSeason.length === 0
              ? "Nessuna squadra. Aggiungine una."
              : teamsInSeason.length >= 2
                ? "2/2 squadre: limite stagionale raggiunto"
                : `1/2 squadre in questa stagione`}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {!activeIsCurrentSeason && (
            <Button
              variant="outlined"
              size="small"
              startIcon={settingCurrent ? <CircularProgress size={14} /> : <StarBorderIcon />}
              onClick={handleSetCurrentSeason}
              disabled={settingCurrent}
              sx={TOUCH_TARGET_ON_PHONE}
            >
              Segna come in corso
            </Button>
          )}
          {isAdmin && (
            <Tooltip
              title={
                teamsInSeason.length >= 2 ? "Limite raggiunto: massimo 2 squadre per stagione" : ""
              }
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreate}
                  disabled={teamsInSeason.length >= 2}
                  sx={TOUCH_TARGET_ON_PHONE}
                >
                  Nuova squadra
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Stagione a squadra unica: il club gioca il campionato come Karibu */}
      {activeSeason && (
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={clubPlaysLeague}
                onChange={(e) => handleClubLeague(e.target.checked)}
                disabled={savingClub}
              />
            }
            label={
              <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
                In questa stagione giochiamo il campionato come Karibu
              </Typography>
            }
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {clubPlaysLeague
              ? "Karibu è una squadra sola con tutti i giocatori della stagione: ha la sua pagina pubblica, si iscrive ai gironi e gioca le partite di campionato. Le squadre qui sotto restano visibili come gruppi."
              : "Attivalo se il club si iscrive al campionato con una squadra sola. Spento, Karibu resta nascosta e gioca solo amichevoli e tornei."}
          </Typography>
          {clubPlaysLeague && clubTeam && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
              {isAdmin && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => openEdit(clubTeam)}
                  sx={TOUCH_TARGET_ON_PHONE}
                >
                  Campionato, descrizione e foto
                </Button>
              )}
              <Button
                size="small"
                href={`/squadre/${activeSeason.replace("-", "")}/${slugify(clubTeam.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={TOUCH_TARGET_ON_PHONE}
              >
                Pagina pubblica
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Griglia squadre */}
      {teamsInSeason.length === 0 ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 5,
            textAlign: "center",
            borderStyle: "dashed",
            borderColor: "divider",
            cursor: isAdmin && teamsInSeason.length < 2 ? "pointer" : "default",
            "&:hover":
              isAdmin && teamsInSeason.length < 2
                ? {
                    borderColor: "primary.main",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                  }
                : {},
          }}
          onClick={isAdmin && teamsInSeason.length < 2 ? openCreate : undefined}
        >
          {isAdmin && <AddIcon sx={{ fontSize: 36, color: "text.secondary", mb: 1 }} />}
          <Typography variant="body1" color="text.secondary">
            {isAdmin
              ? `Aggiungi la prima squadra della stagione ${activeSeason}`
              : `Nessuna squadra nella stagione ${activeSeason}`}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {teamsInSeason.map((team) => {
            return (
              <Grid key={team.id} size={{ xs: 12, sm: 6 }}>
                <TeamCard
                  team={team}
                  isAdmin={isAdmin}
                  onEdit={() => openEdit(team)}
                  onDelete={() => handleDeleteTeam(team.id)}
                  focusAfterDelete={seasonHeadingRef}
                />
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── Dialog: nuova stagione ─────────────────────────────────────────────── */}
      <Dialog
        open={newSeasonDialog}
        onClose={() => setNewSeasonDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Nuova stagione</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel shrink>Anno di inizio</InputLabel>
              <Select
                value={newSeasonYear}
                onChange={(e) => setNewSeasonYear(Number(e.target.value))}
                label="Anno di inizio"
                notched
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const now = new Date();
                  const month = now.getMonth() + 1;
                  const curStart = month >= 9 ? now.getFullYear() : now.getFullYear() - 1;
                  const year = curStart - 1 + i;
                  return (
                    <MenuItem key={year} value={year}>
                      {seasonLabel(year)}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            {newSeasonYear > 0 && allSeasons.includes(seasonLabel(newSeasonYear)) && (
              <Typography variant="caption" color="warning.main">
                Questa stagione è già presente.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewSeasonDialog(false)}>Annulla</Button>
          <Button variant="contained" onClick={confirmNewSeason}>
            Aggiungi
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: crea / modifica squadra ───────────────────────────────────── */}
      <Dialog open={teamDialog} onClose={() => setTeamDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={FONT_WEIGHT.semibold}>
          {editTeam ? `Modifica "${editTeam.name}"` : `Nuova squadra (${activeSeason})`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {teamError && <Alert severity="error">{teamError}</Alert>}
            <TextField
              label="Nome squadra"
              value={teamForm.name}
              onChange={(e) => handleNameChange(e.target.value)}
              fullWidth
              autoFocus={!editTeam?.isMixed}
              required
              placeholder="es. Montekki"
              // Nome e tinta della Karibu li decide l'app.
              disabled={!!editTeam?.isMixed}
            />
            <TextField
              label="Campionato"
              value={teamForm.championship}
              onChange={(e) => setTeamForm((f) => ({ ...f, championship: e.target.value }))}
              fullWidth
              placeholder="es. Campionato Veneto Gold Ovest"
              helperText="Facoltativo: viene mostrato sotto il nome nelle pagine pubbliche"
            />
            <Box sx={editTeam?.isMixed ? { display: "none" } : undefined}>
              <Typography
                id="team-color-label"
                variant="body2"
                fontWeight={FONT_WEIGHT.semibold}
                sx={{ mb: 0.5 }}
              >
                Colore della squadra
              </Typography>
              <Typography
                id="team-color-help"
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                Distingue la squadra in calendario, classifiche e pagine pubbliche. I colori sono
                quelli della palette del sito; l&apos;Ardesia è riservata alla squadra Karibu.
              </Typography>
              <Box
                role="radiogroup"
                aria-labelledby="team-color-label"
                aria-describedby="team-color-help"
                sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}
              >
                {PICKABLE_TINTS.map((tint) => {
                  const selected = teamForm.color === tint;
                  return (
                    <Box
                      key={tint}
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={TEAM_TINT_LABELS[tint]}
                      title={TEAM_TINT_LABELS[tint]}
                      onClick={() => pickColor(tint)}
                      sx={{
                        width: 40,
                        height: 40,
                        p: 0,
                        borderRadius: "50%",
                        bgcolor: `team.${tint}`,
                        color: TEAM_LABEL[tint],
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid",
                        borderColor: "background.paper",
                        // Selezionato: anello nel colore del testo, oltre alla spunta.
                        outline: selected ? "2px solid" : "none",
                        outlineColor: "text.primary",
                        "&:focus-visible": {
                          outline: "3px solid",
                          outlineColor: "primary.main",
                          outlineOffset: 2,
                        },
                      }}
                    >
                      {selected && <CheckIcon fontSize="small" aria-hidden />}
                    </Box>
                  );
                })}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1.5 }}
              >
                {teamForm.color
                  ? `${TEAM_TINT_LABELS[teamForm.color]} selezionato`
                  : "Nessun colore: scegline uno"}
              </Typography>
              {colorClash && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  role="status"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
                >
                  <WarningAmberIcon sx={{ fontSize: 16, color: "warning.main" }} aria-hidden />
                  Anche {colorClash.name} ha questo colore in questa stagione: le due squadre non si
                  distingueranno a colpo d&apos;occhio.
                </Typography>
              )}
            </Box>
            <TextField
              label="Descrizione"
              value={teamForm.description}
              onChange={(e) => setTeamForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Descrizione facoltativa…"
            />
            <Box>
              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} sx={{ mb: 0.5 }}>
                Immagine copertina
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                Facoltativa: mostrata nella pagina pubblica della squadra.
              </Typography>
              <ImageUploader
                currentUrl={teamForm.imageUrl}
                folder="teams"
                onUploaded={(url) => setTeamForm((f) => ({ ...f, imageUrl: url }))}
                onRemoved={() => setTeamForm((f) => ({ ...f, imageUrl: null }))}
                shape="square"
                size={120}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTeamDialog(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleSaveTeam}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={16} /> : undefined}
          >
            {editTeam ? "Salva" : "Crea squadra"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Card squadra ──────────────────────────────────────────────────────────────

// Icone sopra il riempimento della tinta squadra: prendono l'etichetta della
// tinta (bianca o scura, >= 4,5:1) dall'intestazione.
const ON_FILL_ICON_SX = {
  color: "inherit",
  "&:hover": { bgcolor: "color-mix(in srgb, currentColor 15%, transparent)" },
} as const;

function TeamCard({
  team,
  isAdmin,
  onEdit,
  onDelete,
  focusAfterDelete,
}: {
  team: Team;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => Promise<boolean | void>;
  focusAfterDelete: RefObject<HTMLHeadingElement | null>;
}) {
  const publicHref = `/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`;
  const rosaHref = `/admin/squadre/${team.id}/rosa`;
  // Tinta della squadra, o null: intestazione neutra, mai l'arancio (UX-29).
  const color = teamColor(team.color);
  const onColor = teamFill(team.color)?.fg ?? null;
  const menu = teamMenuEntries(isAdmin);
  const items: RowAction[] = menu.keys.map((key) =>
    key === "edit"
      ? { label: "Modifica", onClick: onEdit }
      : { label: "Pagina pubblica", href: publicHref, external: true }
  );

  // Niente `onClick` sulla tessera: i clic nel menu "⋯" (in un portal) risalirebbero
  // fino a lei e aprirebbero la pagina pubblica. La pagina pubblica è nel menu.
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* Intestazione: riempita con la tinta della squadra, neutra senza */}
      <Box
        sx={{
          pl: 2.5,
          pr: 1,
          py: 1.5,
          ...(color && onColor
            ? { bgcolor: color, color: onColor }
            : {
                bgcolor: "action.hover",
                color: "text.primary",
                borderBottom: "1px solid",
                borderColor: "divider",
              }),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h6"
            component="h3"
            fontWeight={FONT_WEIGHT.bold}
            sx={{ color: "inherit", lineHeight: 1.2 }}
            noWrap
          >
            {team.name}
          </Typography>
          {team.championship && (
            <Typography
              variant="caption"
              sx={{
                color: onColor ? alpha(onColor, 0.85) : "text.secondary",
              }}
            >
              {team.championship}
            </Typography>
          )}
        </Box>
        <RowActions
          subject={team.name}
          primaryElsewhere
          items={items}
          onDelete={menu.canDelete ? onDelete : undefined}
          deleteLabel="Elimina squadra…"
          deleteConfirm={{
            title: "Eliminare la squadra?",
            message: `Eliminare "${team.name}"? Verranno eliminati anche rosa e partite associate.`,
          }}
          focusAfterDelete={focusAfterDelete}
          menuButtonSx={color ? ON_FILL_ICON_SX : { color: "text.secondary" }}
        />
      </Box>

      {/* Body */}
      <Box sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {team.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.65, fontSize: TYPE_SCALE.sm }}
          >
            {team.description}
          </Typography>
        )}

        {/* Statistiche a sinistra, "Rosa" (l'azione che si usa) a destra */}
        <Box
          sx={{
            mt: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", gap: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <GroupsIcon sx={{ fontSize: 17, color: "text.secondary" }} />
              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                {team._count.memberships}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                atleti
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <SportsSoccerIcon sx={{ fontSize: 17, color: "text.secondary" }} />
              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                {team._count.matches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                partite
              </Typography>
            </Box>
          </Box>
          <Button
            href={rosaHref}
            variant="outlined"
            size="small"
            aria-label={`${isAdmin ? "Rosa" : "Vedi rosa"}: ${team.name}`}
            sx={TOUCH_TARGET_ON_PHONE}
          >
            {/* L'allenatore la legge soltanto: la rosa la modifica l'admin. */}
            {isAdmin ? "Rosa" : "Vedi rosa"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
