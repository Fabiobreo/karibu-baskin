"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  IconButton,
  Dialog,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
} from "@/components/MatchFormDialog";
import MatchResultDialog, { type MatchResultSavedFields } from "@/components/MatchResultDialog";
import GroupCsvImportDialog from "@/components/GroupCsvImportDialog";

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
  teamId: string;
  team: Team;
};

type Props = {
  group: GroupData;
  ourMatches: OurMatch[];
  groupMatches: GroupMatch[];
  allOpponents: OpposingTeam[];
  ourTeams: Team[];
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
  allOpponents: initialOpponents,
  ourTeams,
  allGroups,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  const [opponents, setOpponents] = useState(initialOpponents);
  const [ourMatches, setOurMatches] = useState(initialOur);
  const [gmMatches, setGmMatches] = useState(initialGm);

  const [matchDialog, setMatchDialog] = useState(false);
  const [editMatchData, setEditMatchData] = useState<MatchFormMatch | null>(null);
  const [resultMatch, setResultMatch] = useState<OurMatch | null>(null);

  const [oppDialog, setOppDialog] = useState(false);
  const [oppForm, setOppForm] = useState({ name: "", city: "" });
  const [oppSaving, setOppSaving] = useState(false);
  const [oppError, setOppError] = useState("");

  const [gmForm, setGmForm] = useState(EMPTY_GM_FORM);
  const [editGm, setEditGm] = useState<GroupMatch | null>(null);
  const [gmError, setGmError] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  // Derive opposing teams that appear in this girone (from gm matches or our matches)
  const opponentIdsInGroup = new Set<string>();
  for (const gm of gmMatches) {
    opponentIdsInGroup.add(gm.homeTeamId);
    opponentIdsInGroup.add(gm.awayTeamId);
  }
  for (const m of ourMatches) {
    if (m.opponent) opponentIdsInGroup.add(m.opponent.id);
  }
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
      teamId: group.teamId,
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

  async function handleCreateOpponent() {
    if (!oppForm.name.trim()) return;
    setOppSaving(true);
    setOppError("");
    try {
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
      setOppForm({ name: "", city: "" });
      setOppDialog(false);
      showToast({
        message: `Squadra "${created.name}" aggiunta all'anagrafica`,
        severity: "success",
      });
    } finally {
      setOppSaving(false);
    }
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
        <Link href="/admin/gironi" style={{ textDecoration: "none" }}>
          <Button startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 1 }}>
            Torna ai gironi
          </Button>
        </Link>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h4" fontWeight={800}>
            {group.name}
          </Typography>
          <Chip
            label={group.team.name}
            sx={{
              bgcolor: group.team.color ?? "primary.main",
              color: "#fff",
              fontWeight: 700,
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Stagione {group.season}
          {group.championship ? ` · ${group.championship}` : ""}
        </Typography>
      </Box>

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
            Nessuna squadra ancora associata. Crea una partita nostra o un risultato esterno per
            popolare il girone.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {teamsInGroup.map((o) => (
              <Chip
                key={o.id}
                label={o.name}
                size="small"
                component={o.slug ? Link : "div"}
                href={o.slug ? `/avversarie/${o.slug}` : undefined}
                clickable={!!o.slug}
                target={o.slug ? "_blank" : undefined}
                icon={o.slug ? <OpenInNewIcon sx={{ fontSize: 12 }} /> : undefined}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Sezione Calendario nostro */}
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
            Calendario nostro ({ourMatches.length})
          </Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openAddMatch}>
            Aggiungi partita
          </Button>
        </Box>
        {ourMatches.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            Nessuna partita nostra in questo girone. Clicca &quot;Aggiungi partita&quot; per
            iniziare a popolare il calendario.
          </Typography>
        ) : (
          <Table size="small" aria-label="Calendario nostro">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>G.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Avversario</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Risultato
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {ourMatches.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {m.matchday ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {format(new Date(m.date), "d MMM yy", { locale: it })}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.4,
                          color: "text.disabled",
                        }}
                      >
                        {m.isHome ? (
                          <HomeIcon sx={{ fontSize: 11 }} />
                        ) : (
                          <FlightIcon sx={{ fontSize: 11 }} />
                        )}
                        <Typography variant="caption">{m.isHome ? "Casa" : "Trasferta"}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {m.opponent?.name ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      onClick={() => setResultMatch(m)}
                      sx={{
                        minWidth: 0,
                        px: 1,
                        textTransform: "none",
                        fontWeight: 700,
                        color: m.ourScore !== null ? "text.primary" : "primary.main",
                      }}
                    >
                      {m.ourScore !== null && m.theirScore !== null
                        ? `${m.ourScore} – ${m.theirScore}`
                        : "+ Risultato"}
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Convocati">
                      <IconButton
                        size="small"
                        color="primary"
                        component={Link}
                        href={`/admin/partite/${m.id}/convocazioni`}
                      >
                        <GroupsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Statistiche">
                      <IconButton
                        size="small"
                        color="primary"
                        component={Link}
                        href={`/admin/partite/${m.id}/statistiche`}
                      >
                        <LeaderboardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifica">
                      <IconButton size="small" onClick={() => openEditMatch(m)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina">
                      <IconButton size="small" color="error" onClick={() => handleDeleteMatch(m)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
                    <IconButton size="small" color="error" onClick={() => handleDeleteGm(m.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog: nuova avversaria */}
      <Dialog open={oppDialog} onClose={() => setOppDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Aggiungi squadra avversaria</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {oppError && <Alert severity="error">{oppError}</Alert>}
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
              La squadra viene aggiunta all&apos;anagrafica generale. Per legarla al girone, crea
              una partita nostra contro di lei oppure un risultato esterno in cui compare.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOppDialog(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleCreateOpponent}
            disabled={!oppForm.name.trim() || oppSaving}
          >
            Aggiungi
          </Button>
        </DialogActions>
      </Dialog>

      {/* MatchFormDialog (riusato) */}
      <MatchFormDialog
        open={matchDialog}
        onClose={() => setMatchDialog(false)}
        editMatch={editMatchData}
        teams={ourTeams}
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
      {resultMatch && (
        <MatchResultDialog
          open={!!resultMatch}
          onClose={() => setResultMatch(null)}
          matchId={resultMatch.id}
          matchLabel={`${group.team.name} vs ${resultMatch.opponent?.name ?? "Avversario"} — ${format(new Date(resultMatch.date), "d MMM yyyy", { locale: it })}`}
          initialOurScore={resultMatch.ourScore}
          initialTheirScore={resultMatch.theirScore}
          initialResult={resultMatch.result}
          onSaved={handleResultSaved}
        />
      )}

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
