"use client";

import {
  Box, Typography, Paper, Button, TextField, Stack, Chip, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Select, MenuItem, FormControl,
  InputLabel, Tooltip, CircularProgress, Divider, Alert, Grid2 as Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import PeopleIcon from "@mui/icons-material/People";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sportRoleLabel, ROLE_COLORS } from "@/lib/constants";
import { slugify } from "@/lib/slugUtils";
import Link from "next/link";

// ── Palette colori squadra ────────────────────────────────────────────────────

const TEAM_COLORS = [
  { label: "Arancione", value: "#FF6D00" },
  { label: "Blu",       value: "#1E88E5" },
  { label: "Verde",     value: "#43A047" },
  { label: "Rosso",     value: "#F44336" },
  { label: "Viola",     value: "#8E24AA" },
  { label: "Nero",      value: "#1A1A1A" },
  { label: "Grigio",    value: "#757575" },
  { label: "Oro",       value: "#FFB300" },
];

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

// ── Tipi ──────────────────────────────────────────────────────────────────────

type User = {
  id: string;
  name: string | null;
  image: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
};

type Membership = {
  id: string;
  isCaptain: boolean;
  userId: string | null;
  childId: string | null;
  user: User | null;
  child: { id: string; name: string; sportRole: number | null; sportRoleVariant: string | null } | null;
};

type Team = {
  id: string;
  name: string;
  season: string;
  championship: string | null;
  color: string | null;
  description: string | null;
  _count: { memberships: number; matches: number };
  memberships: Membership[];
};

type Child = { id: string; name: string; sportRole: number | null; sportRoleVariant: string | null };

// Valore nel Select: "u:{id}" per utenti, "c:{id}" per figli
type SelectableEntry = { selectKey: string; id: string; kind: "user" | "child"; name: string | null; image?: string | null; sportRole: number | null; sportRoleVariant: string | null };

type SeasonRecord = { label: string; isCurrent: boolean };
type Props = { teams: Team[]; users: User[]; childPlayers: Child[]; seasons: SeasonRecord[] };

// ── Componente principale ─────────────────────────────────────────────────────

export default function AdminSquadreClient({ teams: initialTeams, users, childPlayers, seasons: initialSeasons }: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [isPending, startTransition] = useTransition();

  // Stagioni
  const existingSeasons = Array.from(new Set(teams.map((t) => t.season))).sort((a, b) => b.localeCompare(a));
  const [extraSeasons, setExtraSeasons] = useState<string[]>([]);
  const [autoSeason, setAutoSeason] = useState<string>("");
  const allSeasons = Array.from(new Set([...existingSeasons, ...extraSeasons, ...(autoSeason ? [autoSeason] : [])])).sort((a, b) => b.localeCompare(a));
  const [activeSeason, setActiveSeason] = useState<string>(
    initialSeasons.find((s) => s.isCurrent)?.label ?? existingSeasons[0] ?? ""
  );
  // Dichiarato qui per evitare TDZ: usato nell'effect sottostante
  const [rosaTeam, setRosaTeam] = useState<Team | null>(null);

  // Sync teams + rosaTeam quando initialTeams cambia (dopo router.refresh())
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeams(initialTeams);
    setRosaTeam((prev) => {
      if (!prev) return prev;
      return initialTeams.find((t) => t.id === prev.id) ?? prev;
    });
  }, [initialTeams]);

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
    setSeasons((prev) => prev.map((s) => ({ ...s, isCurrent: s.label === activeSeason }))
      .concat(prev.some((s) => s.label === activeSeason) ? [] : [{ label: activeSeason, isCurrent: true }]));
    setSettingCurrent(false);
  }

  // Dialog nuova stagione
  const [newSeasonDialog, setNewSeasonDialog] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState(0);

  // Dialog crea/modifica squadra
  const [teamDialog, setTeamDialog] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", championship: "", color: TEAM_COLORS[0].value, description: "" });
  const [teamError, setTeamError] = useState("");

  // Dialog conferma generica
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: "", message: "", onConfirm: () => {},
  });
  function openConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }
  function closeConfirm() {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  }

  // Dialog rosa
  const [addingMember, setAddingMember] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");

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

  function openCreate() {
    setTeamForm({ name: "", championship: "", color: TEAM_COLORS[0].value, description: "" });
    setEditTeam(null);
    setTeamError("");
    setTeamDialog(true);
  }

  function openEdit(team: Team) {
    setTeamForm({
      name: team.name,
      championship: team.championship ?? "",
      color: team.color ?? TEAM_COLORS[0].value,
      description: team.description ?? "",
    });
    setEditTeam(team);
    setTeamError("");
    setTeamDialog(true);
  }

  async function handleSaveTeam() {
    setTeamError("");
    if (!teamForm.name.trim()) { setTeamError("Il nome è obbligatorio"); return; }
    startTransition(async () => {
      const method = editTeam ? "PUT" : "POST";
      const url = editTeam ? `/api/competitive-teams/${editTeam.id}` : "/api/competitive-teams";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...teamForm, season: editTeam ? editTeam.season : activeSeason }),
      });
      if (!res.ok) { setTeamError("Errore nel salvataggio"); return; }
      setTeamDialog(false);
      router.refresh();
    });
  }

  function handleDeleteTeam(teamId: string, teamName: string) {
    openConfirm(
      "Elimina squadra",
      `Eliminare "${teamName}"? Verranno eliminati anche rosa e partite associate.`,
      () => startTransition(async () => {
        await fetch(`/api/competitive-teams/${teamId}`, { method: "DELETE" });
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
      }),
    );
  }

  // ── Rosa ─────────────────────────────────────────────────────────────────────

  // Aggiorna il rosaTeam dalla lista teams dopo un refresh
  function syncRosaTeam(updatedTeams: Team[]) {
    if (rosaTeam) {
      const updated = updatedTeams.find((t) => t.id === rosaTeam.id);
      if (updated) setRosaTeam(updated);
    }
  }

  async function handleAddMember() {
    if (!rosaTeam || !selectedKey) return;
    const [kind, id] = selectedKey.split(":");
    startTransition(async () => {
      await fetch(`/api/competitive-teams/${rosaTeam.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "c" ? { childId: id } : { userId: id }),
      });
      setSelectedKey("");
      setAddingMember(false);
      router.refresh();
    });
  }

  async function handleRemoveMember(membershipId: string) {
    if (!rosaTeam) return;
    startTransition(async () => {
      await fetch(`/api/competitive-teams/${rosaTeam.id}/members/${membershipId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  async function handleToggleCaptain(membershipId: string, current: boolean) {
    if (!rosaTeam) return;
    startTransition(async () => {
      await fetch(`/api/competitive-teams/${rosaTeam.id}/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCaptain: !current }),
      });
      router.refresh();
    });
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const teamsInSeason = teams.filter((t) => t.season === activeSeason);

  const rosaAvailable: SelectableEntry[] = rosaTeam
    ? [
        ...users
          .filter((u) => !rosaTeam.memberships.some((m) => m.userId === u.id))
          .map((u) => ({ selectKey: `u:${u.id}`, id: u.id, kind: "user" as const, name: u.name, image: u.image, sportRole: u.sportRole, sportRoleVariant: u.sportRoleVariant })),
        ...childPlayers
          .filter((c) => !rosaTeam.memberships.some((m) => m.childId === c.id))
          .map((c) => ({ selectKey: `c:${c.id}`, id: c.id, kind: "child" as const, name: c.name, image: null, sportRole: c.sportRole, sportRoleVariant: c.sportRoleVariant })),
      ].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    : [];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Gestione Squadre</Typography>
          <Typography variant="body2" color="text.secondary">
            Organizza le squadre per stagione.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={openNewSeason}>
          Nuova stagione
        </Button>
      </Box>

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
              sx={{ fontWeight: 700, cursor: "pointer" }}
            />
          );
        })}
      </Box>

      {/* Intestazione stagione attiva */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              Stagione {activeSeason}
            </Typography>
            {activeIsCurrentSeason && (
              <Chip label="In corso" size="small" icon={<StarIcon />} color="warning" sx={{ fontWeight: 700 }} />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {teamsInSeason.length === 0
              ? "Nessuna squadra — aggiungine una."
              : teamsInSeason.length >= 2
                ? "2/2 squadre — limite stagionale raggiunto"
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
            >
              Segna come in corso
            </Button>
          )}
          <Tooltip title={teamsInSeason.length >= 2 ? "Limite raggiunto: massimo 2 squadre per stagione" : ""}>
            <span>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreate}
                disabled={teamsInSeason.length >= 2}
              >
                Nuova squadra
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

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
                cursor: teamsInSeason.length < 2 ? "pointer" : "default",
                "&:hover": teamsInSeason.length < 2 ? { borderColor: "primary.main", bgcolor: "primary.50" } : {},
              }}
              onClick={teamsInSeason.length < 2 ? openCreate : undefined}
            >
              <AddIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                Aggiungi la prima squadra della stagione {activeSeason}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {teamsInSeason.map((team) => {
                const color = team.color ?? "#E65100";
                const colorName = TEAM_COLORS.find((c) => c.value === color)?.label;
                return (
                  <Grid key={team.id} size={{ xs: 12, sm: 6 }}>
                    <TeamCard
                      team={team}
                      color={color}
                      colorName={colorName}
                      onEdit={() => openEdit(team)}
                      onDelete={() => handleDeleteTeam(team.id, team.name)}
                      onRosa={() => { setRosaTeam(team); setAddingMember(false); setSelectedKey(""); }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}

      {/* ── Dialog: nuova stagione ─────────────────────────────────────────────── */}
      <Dialog open={newSeasonDialog} onClose={() => setNewSeasonDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Nuova stagione</DialogTitle>
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
        <DialogTitle fontWeight={700}>
          {editTeam ? `Modifica "${editTeam.name}"` : `Nuova squadra — ${activeSeason}`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {teamError && <Alert severity="error">{teamError}</Alert>}
            <TextField
              label="Nome squadra"
              value={teamForm.name}
              onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
              required
              placeholder="es. Montekki"
            />
            <TextField
              label="Campionato"
              value={teamForm.championship}
              onChange={(e) => setTeamForm((f) => ({ ...f, championship: e.target.value }))}
              fullWidth
              placeholder="es. Campionato Veneto Gold Ovest"
              helperText="Facoltativo — viene mostrato sotto il nome nelle pagine pubbliche"
            />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                Colore identificativo
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                Usato per distinguere visivamente la squadra nelle pagine pubbliche e nell&apos;intestazione della card.
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {TEAM_COLORS.map((c) => (
                  <Tooltip key={c.value} title={c.label}>
                    <Box
                      onClick={() => setTeamForm((f) => ({ ...f, color: c.value }))}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: c.value,
                        cursor: "pointer",
                        border: teamForm.color === c.value ? "3px solid #1A1A1A" : "3px solid transparent",
                        boxShadow: teamForm.color === c.value
                          ? `0 0 0 2px #fff, 0 0 0 4px ${c.value}`
                          : "0 1px 3px rgba(0,0,0,0.25)",
                        transition: "all 0.15s",
                        "&:hover": { transform: "scale(1.15)" },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
                <Box sx={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: teamForm.color, flexShrink: 0 }} />
                <Typography variant="caption" color="text.secondary">
                  {TEAM_COLORS.find((c) => c.value === teamForm.color)?.label ?? "Personalizzato"} — selezionato
                </Typography>
              </Box>
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTeamDialog(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSaveTeam} disabled={isPending} startIcon={isPending ? <CircularProgress size={16} /> : undefined}>
            {editTeam ? "Salva" : "Crea squadra"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: gestione rosa ──────────────────────────────────────────────── */}
      <Dialog
        open={!!rosaTeam}
        onClose={() => setRosaTeam(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { maxHeight: "85vh" } }}
      >
        {rosaTeam && (
          <>
            {/* Intestazione colorata */}
            <Box sx={{ px: 3, pt: 2.5, pb: 2, backgroundColor: rosaTeam.color ?? "#E65100" }}>
              <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: "0.1em" }}>
                Gestione Rosa
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: "#fff" }}>
                {rosaTeam.name}
              </Typography>
            </Box>

            <DialogContent sx={{ pt: 2 }}>
              {/* Aggiungi atleta */}
              {!addingMember ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddingMember(true)}
                  disabled={rosaAvailable.length === 0}
                  sx={{ mb: 2 }}
                >
                  Aggiungi atleta
                </Button>
              ) : (
                <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2, borderStyle: "dashed" }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                    Seleziona un atleta da aggiungere
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ flex: 1, minWidth: 180 }}>
                      <InputLabel>Atleta</InputLabel>
                      <Select value={selectedKey} label="Atleta" onChange={(e) => setSelectedKey(e.target.value as string)}>
                        {rosaAvailable.map((entry) => (
                          <MenuItem key={entry.selectKey} value={entry.selectKey}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Avatar src={entry.image ?? undefined} sx={{ width: 22, height: 22, fontSize: 10 }}>
                                {(entry.name ?? "?")[0].toUpperCase()}
                              </Avatar>
                              {entry.name ?? entry.id}
                              {entry.kind === "child" && (
                                <Chip label="Figlio" size="small" sx={{ height: 15, fontSize: "0.58rem", fontWeight: 700 }} />
                              )}
                              {entry.sportRole && (
                                <Chip
                                  label={sportRoleLabel(entry.sportRole, entry.sportRoleVariant ?? null)}
                                  size="small"
                                  sx={{ bgcolor: ROLE_COLORS[entry.sportRole], color: "#fff", fontWeight: 700, fontSize: "0.58rem", height: 15, ml: 0.5 }}
                                />
                              )}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button variant="contained" size="small" disabled={!selectedKey || isPending} onClick={handleAddMember}>
                      Aggiungi
                    </Button>
                    <Button size="small" onClick={() => { setAddingMember(false); setSelectedKey(""); }}>
                      Annulla
                    </Button>
                  </Box>
                </Paper>
              )}

              {/* Lista atleti */}
              {rosaTeam.memberships.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    La rosa è vuota. Aggiungi atleti tramite il pulsante sopra.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0.75}>
                  {rosaTeam.memberships.map((m) => {
                    const athlete = m.user ?? m.child;
                    if (!athlete) return null;
                    const name = athlete.name ?? "—";
                    const image = "image" in athlete ? (athlete.image ?? undefined) : undefined;
                    const teamColor = rosaTeam.color ?? "#E65100";
                    return (
                      <Box
                        key={m.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.25,
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: m.isCaptain ? `${teamColor}44` : "divider",
                          backgroundColor: m.isCaptain ? `${teamColor}08` : "transparent",
                          transition: "all 0.1s",
                        }}
                      >
                        <Avatar src={image} sx={{ width: 34, height: 34, fontSize: 13, bgcolor: teamColor }}>
                          {name[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
                            {m.isCaptain && (
                              <Chip label="Cap." size="small" sx={{ fontSize: "0.62rem", height: 16, bgcolor: "#F9A825", color: "#fff", fontWeight: 700 }} />
                            )}
                          </Box>
                          {athlete.sportRole && (
                            <Chip
                              label={sportRoleLabel(athlete.sportRole, athlete.sportRoleVariant ?? null)}
                              size="small"
                              sx={{ bgcolor: ROLE_COLORS[athlete.sportRole], color: "#fff", fontWeight: 700, fontSize: "0.62rem", height: 16, mt: 0.25 }}
                            />
                          )}
                        </Box>
                        <Tooltip title={m.isCaptain ? "Rimuovi capitano" : "Nomina capitano"}>
                          <IconButton size="small" onClick={() => handleToggleCaptain(m.id, m.isCaptain)} sx={{ color: m.isCaptain ? "#F9A825" : "action.disabled" }}>
                            <EmojiEventsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rimuovi dalla rosa">
                          <IconButton size="small" color="error" onClick={() => handleRemoveMember(m.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </DialogContent>

            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {rosaTeam.memberships.length} {rosaTeam.memberships.length === 1 ? "atleta" : "atleti"} in rosa
              </Typography>
              <Button onClick={() => setRosaTeam(null)}>Chiudi</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Dialog conferma eliminazione ── */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirm}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Annulla</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { closeConfirm(); confirmDialog.onConfirm(); }}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Card squadra ──────────────────────────────────────────────────────────────

function TeamCard({
  team,
  color,
  colorName,
  onEdit,
  onDelete,
  onRosa,
}: {
  team: Team;
  color: string;
  colorName: string | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onRosa: () => void;
}) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: 3 },
      }}
    >
      {/* Intestazione colorata */}
      <Box sx={{ px: 2.5, py: 2, backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", lineHeight: 1.2 }} noWrap>
            {team.name}
          </Typography>
          {team.championship && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
              {team.championship}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.25, ml: 1, flexShrink: 0 }}>
          <Link href={`/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`} style={{ textDecoration: "none" }}>
            <Tooltip title="Vedi pagina pubblica">
              <IconButton size="small" sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.15)" } }}>
                <VisibilityIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Link>
          <Tooltip title="Modifica squadra">
            <IconButton size="small" onClick={onEdit} sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.15)" } }}>
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Elimina squadra">
            <IconButton size="small" onClick={onDelete} sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.15)" } }}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {team.description && (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, fontSize: "0.83rem" }}>
            {team.description}
          </Typography>
        )}

        {/* Statistiche */}
        <Box sx={{ display: "flex", gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <GroupsIcon sx={{ fontSize: 17, color }} />
            <Typography variant="body2" fontWeight={700}>{team._count.memberships}</Typography>
            <Typography variant="body2" color="text.secondary">atleti</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <SportsSoccerIcon sx={{ fontSize: 17, color: "text.disabled" }} />
            <Typography variant="body2" fontWeight={700}>{team._count.matches}</Typography>
            <Typography variant="body2" color="text.secondary">partite</Typography>
          </Box>
        </Box>

        {/* Anteprima avatar rosa */}
        {team.memberships.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box sx={{ display: "flex" }}>
              {team.memberships.slice(0, 6).map((m, i) => {
                const athlete = m.user ?? m.child;
                const name = athlete?.name ?? "?";
                const image = m.user?.image ?? undefined;
                return (
                  <Avatar
                    key={m.id}
                    src={image}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: 11,
                      bgcolor: color,
                      border: "2px solid #fff",
                      ml: i === 0 ? 0 : -0.75,
                      zIndex: 10 - i,
                    }}
                  >
                    {name[0].toUpperCase()}
                  </Avatar>
                );
              })}
              {team.memberships.length > 6 && (
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: 10,
                    bgcolor: "grey.300",
                    color: "text.secondary",
                    border: "2px solid #fff",
                    ml: -0.75,
                  }}
                >
                  +{team.memberships.length - 6}
                </Avatar>
              )}
            </Box>
          </Box>
        )}

        {/* Bottone gestione rosa */}
        <Box sx={{ mt: "auto" }}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<PeopleIcon />}
            onClick={onRosa}
            sx={{ borderColor: color, color, "&:hover": { borderColor: color, bgcolor: `${color}0f` } }}
          >
            Gestisci rosa
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
