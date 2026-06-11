"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { contrastText } from "@/lib/colorUtils";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import GroupsIcon from "@mui/icons-material/Groups";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { MatchResult } from "@prisma/client";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import MatchFormDialog, {
  type MatchFormMatch,
  type MatchFormOpposingTeam,
  type MatchFormGroup,
  type MatchFormTeam,
} from "@/components/matches/MatchFormDialog";
import MatchResultDialog, {
  type MatchResultSavedFields,
} from "@/components/matches/MatchResultDialog";
import GroupCsvImportDialog from "@/components/admin/GroupCsvImportDialog";

type OpposingTeam = MatchFormOpposingTeam & { slug: string | null };
type Team = MatchFormTeam;

type OurMatch = {
  id: string;
  date: string;
  isHome: boolean;
  matchday: number | null;
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  teamId: string;
  opponent: { id: string; name: string; slug: string | null } | null;
  _count: { playerStats: number };
};

type GroupMatch = {
  id: string;
  matchday: number | null;
  date: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; slug: string | null };
  awayTeam: { id: string; name: string; slug: string | null };
};

type GroupData = {
  id: string;
  name: string;
  season: string;
  championship: string | null;
  ourTeams: Team[];
};

type ExplicitTeam = { id: string; name: string; slug: string | null; city: string | null };

type Props = {
  group: GroupData;
  ourMatches: OurMatch[];
  groupMatches: GroupMatch[];
  explicitTeams: ExplicitTeam[];
  allOpponents: OpposingTeam[];
  ourTeamsCatalog: Team[];
  allGroups: MatchFormGroup[];
};

const EMPTY_GM_FORM = {
  matchday: "",
  date: "",
  homeTeamId: "",
  awayTeamId: "",
  homeScore: "",
  awayScore: "",
};

export default function AdminGironeWorkspaceClient({
  group,
  ourMatches: initialOur,
  groupMatches: initialGm,
  explicitTeams: initialExplicit,
  allOpponents: initialOpponents,
  ourTeamsCatalog,
  allGroups,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  const [opponents, setOpponents] = useState(initialOpponents);
  const [ourMatches, setOurMatches] = useState(initialOur);
  const [gmMatches, setGmMatches] = useState(initialGm);
  const [explicitTeams, setExplicitTeams] = useState<ExplicitTeam[]>(initialExplicit);
  const [ourTeamsInGroup, setOurTeamsInGroup] = useState<Team[]>(group.ourTeams);
  const [ourTeamDialog, setOurTeamDialog] = useState(false);
  const [ourTeamSelectedId, setOurTeamSelectedId] = useState("");
  const [ourTeamSaving, setOurTeamSaving] = useState(false);
  const [ourTeamError, setOurTeamError] = useState("");

  const ourTeamById = new Map(ourTeamsInGroup.map((t) => [t.id, t] as const));
  const matchTeamIdsInUse = new Set(ourMatches.map((m) => m.teamId));

  const [matchDialog, setMatchDialog] = useState(false);
  const [editMatchData, setEditMatchData] = useState<MatchFormMatch | null>(null);
  const [resultMatch, setResultMatch] = useState<OurMatch | null>(null);

  const [oppDialog, setOppDialog] = useState(false);
  const [oppMode, setOppMode] = useState<"existing" | "new">("existing");
  const [oppSelectedId, setOppSelectedId] = useState("");
  const [oppForm, setOppForm] = useState({ name: "", city: "" });
  const [oppSaving, setOppSaving] = useState(false);
  const [oppError, setOppError] = useState("");

  const [gmForm, setGmForm] = useState(EMPTY_GM_FORM);
  const [editGm, setEditGm] = useState<GroupMatch | null>(null);
  const [gmError, setGmError] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  // Derive opposing teams that appear in this girone (gm matches, our matches, or explicit)
  const opponentIdsInGroup = new Set<string>();
  for (const gm of gmMatches) {
    opponentIdsInGroup.add(gm.homeTeamId);
    opponentIdsInGroup.add(gm.awayTeamId);
  }
  for (const m of ourMatches) {
    if (m.opponent) opponentIdsInGroup.add(m.opponent.id);
  }
  const derivedIds = new Set(opponentIdsInGroup);
  const explicitIds = new Set(explicitTeams.map((t) => t.id));
  for (const id of explicitIds) opponentIdsInGroup.add(id);
  const teamsInGroup = opponents
    .filter((o) => opponentIdsInGroup.has(o.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  function openAddMatch() {
    setEditMatchData(null);
    setMatchDialog(true);
  }
  function openEditMatch(m: OurMatch) {
    setEditMatchData({
      id: m.id,
      teamId: m.teamId,
      opponentId: m.opponent?.id ?? null,
      opponentTeamId: null,
      date: m.date,
      isHome: m.isHome,
      venue: null,
      matchType: "LEAGUE",
      notes: null,
      matchday: m.matchday,
      groupId: group.id,
    });
    setMatchDialog(true);
  }

  function handleMatchSaved(saved: MatchFormMatch, isEdit: boolean) {
    setMatchDialog(false);
    // Refetch via router refresh — page is server component
    router.refresh();
    showToast({
      message: isEdit ? "Partita aggiornata" : "Partita aggiunta",
      severity: "success",
    });
  }

  function handleResultSaved(matchId: string, fields: MatchResultSavedFields) {
    setOurMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...fields } : m)));
    showToast({ message: "Risultato aggiornato", severity: "success" });
  }

  function handleDeleteMatch(m: OurMatch) {
    openConfirm("Elimina partita", "Eliminare questa partita?", async () => {
      const res = await fetch(`/api/matches/${m.id}`, { method: "DELETE" });
      if (res.ok) {
        setOurMatches((prev) => prev.filter((x) => x.id !== m.id));
        showToast({ message: "Partita eliminata", severity: "success" });
      } else {
        showToast({ message: "Errore nell'eliminazione", severity: "error" });
      }
    });
  }

  async function associateToGroup(opposingTeam: {
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
  }): Promise<boolean> {
    const res = await fetch(`/api/groups/${group.id}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opposingTeamId: opposingTeam.id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setOppError(data.error ?? "Errore nell'associazione");
      return false;
    }
    setExplicitTeams((prev) =>
      prev.some((t) => t.id === opposingTeam.id) ? prev : [...prev, opposingTeam]
    );
    return true;
  }

  async function handleAddOpponentToGroup() {
    setOppError("");
    setOppSaving(true);
    try {
      if (oppMode === "existing") {
        if (!oppSelectedId) {
          setOppError("Seleziona una squadra");
          return;
        }
        const found = opponents.find((o) => o.id === oppSelectedId);
        if (!found) {
          setOppError("Squadra non trovata");
          return;
        }
        const ok = await associateToGroup({
          id: found.id,
          name: found.name,
          slug: found.slug,
          city: found.city ?? null,
        });
        if (!ok) return;
        showToast({ message: `"${found.name}" aggiunta al girone`, severity: "success" });
      } else {
        if (!oppForm.name.trim()) {
          setOppError("Inserisci un nome");
          return;
        }
        const res = await fetch("/api/opposing-teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(oppForm),
        });
        if (!res.ok) {
          setOppError("Errore nella creazione");
          return;
        }
        const created = (await res.json()) as OpposingTeam;
        setOpponents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        const ok = await associateToGroup({
          id: created.id,
          name: created.name,
          slug: created.slug,
          city: created.city ?? null,
        });
        if (!ok) return;
        showToast({
          message: `"${created.name}" creata e aggiunta al girone`,
          severity: "success",
        });
      }
      setOppForm({ name: "", city: "" });
      setOppSelectedId("");
      setOppDialog(false);
    } finally {
      setOppSaving(false);
    }
  }

  async function handleRemoveTeamFromGroup(teamId: string, teamName: string) {
    if (derivedIds.has(teamId)) {
      showToast({
        message: "Squadra collegata a partite del girone — eliminale prima",
        severity: "warning",
      });
      return;
    }
    openConfirm("Rimuovi squadra", `Rimuovere "${teamName}" dal girone?`, async () => {
      const res = await fetch(`/api/groups/${group.id}/teams/${teamId}`, { method: "DELETE" });
      if (res.ok) {
        setExplicitTeams((prev) => prev.filter((t) => t.id !== teamId));
        showToast({ message: "Squadra rimossa", severity: "success" });
      } else {
        showToast({ message: "Errore nella rimozione", severity: "error" });
      }
    });
  }

  async function handleSaveGm() {
    if (!gmForm.homeTeamId || !gmForm.awayTeamId) {
      setGmError("Seleziona entrambe le squadre");
      return;
    }
    setGmError("");
    const payload = {
      matchday: gmForm.matchday !== "" ? Number(gmForm.matchday) : null,
      date: gmForm.date !== "" ? gmForm.date : null,
      homeTeamId: gmForm.homeTeamId,
      awayTeamId: gmForm.awayTeamId,
      homeScore: gmForm.homeScore !== "" ? Number(gmForm.homeScore) : null,
      awayScore: gmForm.awayScore !== "" ? Number(gmForm.awayScore) : null,
    };
    if (editGm) {
      const res = await fetch(`/api/groups/${group.id}/matches/${editGm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setGmError("Errore nel salvataggio");
        return;
      }
      const updated = (await res.json()) as GroupMatch;
      setGmMatches((prev) =>
        prev
          .map((m) => (m.id === updated.id ? updated : m))
          .sort((a, b) => (a.matchday ?? 999) - (b.matchday ?? 999))
      );
      setEditGm(null);
    } else {
      const res = await fetch(`/api/groups/${group.id}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setGmError("Errore nel salvataggio");
        return;
      }
      const created = (await res.json()) as GroupMatch;
      setGmMatches((prev) =>
        [...prev, created].sort((a, b) => (a.matchday ?? 999) - (b.matchday ?? 999))
      );
    }
    setGmForm(EMPTY_GM_FORM);
  }

  async function handleDeleteGm(id: string) {
    const res = await fetch(`/api/groups/${group.id}/matches/${id}`, { method: "DELETE" });
    if (res.ok) setGmMatches((prev) => prev.filter((m) => m.id !== id));
    else setGmError("Errore nell'eliminazione");
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink
            component={Link}
            href="/admin"
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            Dashboard
          </MuiLink>
          <MuiLink
            component={Link}
            href="/admin/gironi"
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            Gironi
          </MuiLink>
          <Typography variant="body2" color="text.primary">
            {group.name}
          </Typography>
        </Breadcrumbs>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h4" fontWeight={800}>
            {group.name}
          </Typography>
          {ourTeamsInGroup.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              sx={{
                bgcolor: t.color ?? "primary.main",
                color: contrastText(t.color),
                fontWeight: 700,
              }}
            />
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Stagione {group.season}
          {group.championship ? ` · ${group.championship}` : ""}
        </Typography>
      </Box>

      {/* Sezione Le nostre squadre */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Le nostre squadre nel girone ({ourTeamsInGroup.length})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setOurTeamError("");
              setOurTeamSelectedId("");
              setOurTeamDialog(true);
            }}
          >
            Aggiungi nostra squadra
          </Button>
        </Box>
        {ourTeamsInGroup.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            Nessuna nostra squadra in questo girone. Aggiungine almeno una per inserire partite.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {ourTeamsInGroup.map((t) => {
              const inUse = matchTeamIdsInUse.has(t.id);
              return (
                <Chip
                  key={t.id}
                  label={t.name}
                  size="small"
                  sx={{
                    bgcolor: t.color ?? "primary.main",
                    color: contrastText(t.color),
                    fontWeight: 700,
                  }}
                  onDelete={
                    inUse
                      ? undefined
                      : () => {
                          openConfirm(
                            "Rimuovi squadra",
                            `Rimuovere "${t.name}" dal girone?`,
                            async () => {
                              const res = await fetch(
                                `/api/groups/${group.id}/competitive-teams/${t.id}`,
                                { method: "DELETE" }
                              );
                              if (res.ok) {
                                setOurTeamsInGroup((prev) => prev.filter((x) => x.id !== t.id));
                                showToast({ message: "Squadra rimossa", severity: "success" });
                              } else {
                                showToast({
                                  message: "Errore nella rimozione",
                                  severity: "error",
                                });
                              }
                            }
                          );
                        }
                  }
                />
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Sezione Squadre del girone */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Squadre del girone ({teamsInGroup.length})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setOppDialog(true)}
          >
            Aggiungi avversaria
          </Button>
        </Box>
        {teamsInGroup.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            Nessuna squadra ancora associata. Clicca &quot;Aggiungi avversaria&quot; per associarne
            una.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {teamsInGroup.map((o) => {
              const removable = !derivedIds.has(o.id);
              return (
                <Chip
                  key={o.id}
                  label={o.name}
                  size="small"
                  component={o.slug ? Link : "div"}
                  href={o.slug ? `/avversarie/${o.slug}` : undefined}
                  clickable={!!o.slug}
                  target={o.slug ? "_blank" : undefined}
                  icon={o.slug ? <OpenInNewIcon sx={{ fontSize: 12 }} /> : undefined}
                  onDelete={removable ? () => handleRemoveTeamFromGroup(o.id, o.name) : undefined}
                  sx={{ fontWeight: 600 }}
                />
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Calendario nostro: gestione spostata su /admin/partite */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Calendario nostro ({ourMatches.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            La gestione delle nostre partite (risultati, convocazioni, statistiche) è in Gestione
            Partite.
          </Typography>
        </Box>
        <Link href="/admin/partite" style={{ textDecoration: "none" }}>
          <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />}>
            Apri Gestione Partite
          </Button>
        </Link>
      </Paper>

      {/* Sezione Risultati altre squadre */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Risultati altre squadre ({gmMatches.length})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setCsvOpen(true)}
          >
            Importa CSV
          </Button>
        </Box>

        {gmError && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {gmError}
          </Alert>
        )}

        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 2, mb: 2, borderColor: editGm ? "primary.main" : "divider" }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            color={editGm ? "primary" : "text.secondary"}
            sx={{ display: "block", mb: 1.5 }}
          >
            {editGm ? "Modifica risultato" : "Aggiungi risultato"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              label="G."
              type="number"
              size="small"
              value={gmForm.matchday}
              onChange={(e) => setGmForm((f) => ({ ...f, matchday: e.target.value }))}
              sx={{ width: 70 }}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Data"
              type="date"
              size="small"
              value={gmForm.date}
              onChange={(e) => setGmForm((f) => ({ ...f, date: e.target.value }))}
              sx={{ width: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size="small" sx={{ flex: 2, minWidth: 150 }}>
              <InputLabel>Casa</InputLabel>
              <Select
                value={gmForm.homeTeamId}
                label="Casa"
                onChange={(e) => setGmForm((f) => ({ ...f, homeTeamId: e.target.value as string }))}
              >
                {opponents.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Pt"
              type="number"
              size="small"
              value={gmForm.homeScore}
              onChange={(e) => setGmForm((f) => ({ ...f, homeScore: e.target.value }))}
              sx={{ width: 70 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Pt"
              type="number"
              size="small"
              value={gmForm.awayScore}
              onChange={(e) => setGmForm((f) => ({ ...f, awayScore: e.target.value }))}
              sx={{ width: 70 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <FormControl size="small" sx={{ flex: 2, minWidth: 150 }}>
              <InputLabel>Ospiti</InputLabel>
              <Select
                value={gmForm.awayTeamId}
                label="Ospiti"
                onChange={(e) => setGmForm((f) => ({ ...f, awayTeamId: e.target.value as string }))}
              >
                {opponents.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={editGm ? <EditIcon /> : <AddIcon />}
              onClick={handleSaveGm}
              disabled={!gmForm.homeTeamId || !gmForm.awayTeamId}
            >
              {editGm ? "Salva" : "Aggiungi"}
            </Button>
            {editGm && (
              <Button
                variant="outlined"
                onClick={() => {
                  setEditGm(null);
                  setGmForm(EMPTY_GM_FORM);
                  setGmError("");
                }}
              >
                Annulla
              </Button>
            )}
          </Box>
        </Paper>

        {gmMatches.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 2 }}>
            Nessun risultato esterno inserito.
          </Typography>
        ) : (
          <Table size="small" aria-label="Risultati altre squadre">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>G.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Casa</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Ris.
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ospiti</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {gmMatches.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {m.matchday ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {m.date ? format(new Date(m.date), "d MMM yy", { locale: it }) : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {m.homeTeam.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={700}>
                      {m.homeScore !== null && m.awayScore !== null
                        ? `${m.homeScore} – ${m.awayScore}`
                        : "— – —"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {m.awayTeam.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label="Modifica partita"
                      onClick={() => {
                        setGmForm({
                          matchday: m.matchday !== null ? String(m.matchday) : "",
                          date: m.date ? m.date.slice(0, 10) : "",
                          homeTeamId: m.homeTeamId,
                          awayTeamId: m.awayTeamId,
                          homeScore: m.homeScore !== null ? String(m.homeScore) : "",
                          awayScore: m.awayScore !== null ? String(m.awayScore) : "",
                        });
                        setEditGm(m);
                        setGmError("");
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Elimina partita"
                      onClick={() => handleDeleteGm(m.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog: aggiungi avversaria al girone */}
      <ResponsiveDialog
        open={oppDialog}
        onClose={() => {
          setOppDialog(false);
          setOppError("");
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Aggiungi squadra al girone</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ToggleButtonGroup
              value={oppMode}
              exclusive
              size="small"
              fullWidth
              onChange={(_, v) => {
                if (v) {
                  setOppMode(v);
                  setOppError("");
                }
              }}
            >
              <ToggleButton value="existing">Da anagrafica</ToggleButton>
              <ToggleButton value="new">Nuova squadra</ToggleButton>
            </ToggleButtonGroup>
            {oppError && <Alert severity="error">{oppError}</Alert>}
            {oppMode === "existing" ? (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>Squadra</InputLabel>
                  <Select
                    value={oppSelectedId}
                    label="Squadra"
                    onChange={(e) => setOppSelectedId(e.target.value as string)}
                  >
                    {opponents
                      .filter((o) => !opponentIdsInGroup.has(o.id))
                      .map((o) => (
                        <MenuItem key={o.id} value={o.id}>
                          {o.name}
                          {o.city ? ` — ${o.city}` : ""}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.disabled">
                  Sono nascoste le squadre già presenti nel girone.
                </Typography>
              </>
            ) : (
              <>
                <TextField
                  label="Nome"
                  size="small"
                  value={oppForm.name}
                  onChange={(e) => setOppForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                  fullWidth
                />
                <TextField
                  label="Città (opzionale)"
                  size="small"
                  value={oppForm.city}
                  onChange={(e) => setOppForm((f) => ({ ...f, city: e.target.value }))}
                  fullWidth
                />
                <Divider />
                <Typography variant="caption" color="text.disabled">
                  La squadra viene aggiunta all&apos;anagrafica generale e associata subito a questo
                  girone.
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setOppDialog(false);
              setOppError("");
            }}
          >
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleAddOpponentToGroup}
            disabled={oppSaving || (oppMode === "existing" ? !oppSelectedId : !oppForm.name.trim())}
          >
            Aggiungi
          </Button>
        </DialogActions>
      </ResponsiveDialog>

      {/* Dialog: aggiungi nostra squadra al girone */}
      <ResponsiveDialog
        open={ourTeamDialog}
        onClose={() => {
          setOurTeamDialog(false);
          setOurTeamError("");
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Aggiungi nostra squadra al girone</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {ourTeamError && <Alert severity="error">{ourTeamError}</Alert>}
            <FormControl size="small" fullWidth>
              <InputLabel>Squadra</InputLabel>
              <Select
                value={ourTeamSelectedId}
                label="Squadra"
                onChange={(e) => setOurTeamSelectedId(e.target.value as string)}
              >
                {ourTeamsCatalog
                  .filter((t) => !ourTeamById.has(t.id))
                  .map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} — {t.season}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.disabled">
              Sono nascoste le squadre già associate a questo girone.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setOurTeamDialog(false);
              setOurTeamError("");
            }}
          >
            Annulla
          </Button>
          <Button
            variant="contained"
            disabled={!ourTeamSelectedId || ourTeamSaving}
            onClick={async () => {
              setOurTeamError("");
              setOurTeamSaving(true);
              try {
                const res = await fetch(`/api/groups/${group.id}/competitive-teams`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ competitiveTeamId: ourTeamSelectedId }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  setOurTeamError(data.error ?? "Errore nell'associazione");
                  return;
                }
                const created = (await res.json()) as Team;
                setOurTeamsInGroup((prev) => [...prev, created]);
                setOurTeamDialog(false);
                setOurTeamSelectedId("");
                showToast({ message: `"${created.name}" aggiunta al girone`, severity: "success" });
              } finally {
                setOurTeamSaving(false);
              }
            }}
          >
            Aggiungi
          </Button>
        </DialogActions>
      </ResponsiveDialog>

      {/* MatchFormDialog (riusato) */}
      <MatchFormDialog
        open={matchDialog}
        onClose={() => setMatchDialog(false)}
        editMatch={editMatchData}
        teams={ourTeamsCatalog}
        opponents={opponents}
        groups={allGroups}
        onOpponentCreated={(opp) =>
          setOpponents((prev) =>
            [...prev, { ...opp, slug: null }].sort((a, b) => a.name.localeCompare(b.name))
          )
        }
        onSaved={handleMatchSaved}
      />

      {/* Risultato partita nostra */}
      {resultMatch &&
        (() => {
          const ourName = ourTeamById.get(resultMatch.teamId)?.name ?? "La nostra";
          return (
            <MatchResultDialog
              open={!!resultMatch}
              onClose={() => setResultMatch(null)}
              matchId={resultMatch.id}
              matchLabel={`${ourName} vs ${resultMatch.opponent?.name ?? "Avversario"} — ${format(new Date(resultMatch.date), "d MMM yyyy", { locale: it })}`}
              ourTeamName={ourName}
              theirTeamName={resultMatch.opponent?.name ?? "Avversario"}
              initialOurScore={resultMatch.ourScore}
              initialTheirScore={resultMatch.theirScore}
              initialResult={resultMatch.result}
              onSaved={handleResultSaved}
            />
          );
        })()}

      {/* CSV import */}
      <GroupCsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        groupId={group.id}
        groupName={group.name}
        opponents={opponents}
        onImported={() => {
          setCsvOpen(false);
          router.refresh();
        }}
      />

      {ConfirmDialog}
    </Box>
  );
}
