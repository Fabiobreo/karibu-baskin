"use client";

import {
  Box, Typography, Paper, Button, TextField, Stack, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Alert, Table, TableHead,
  TableBody, TableRow, TableCell, Tooltip, FormControlLabel, Switch,
  Divider, Tabs, Tab, TablePagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { MatchType, MatchResult } from "@prisma/client";
import MatchCalloupsDialog from "@/components/MatchCalloupsDialog";
import MatchStatsDialog from "@/components/MatchStatsDialog"; // [CLAUDE 03:00]

type Team = { id: string; name: string; season: string; color: string | null };
type OpposingTeam = { id: string; name: string; city: string | null };
type Group = { id: string; name: string; season: string; championship: string | null; teamId: string; team: { id: string; name: string; color: string | null }; _count: { matches: number } };
type Match = {
  id: string;
  teamId: string;
  opponentId: string;
  date: Date | string;
  isHome: boolean;
  venue: string | null;
  matchType: MatchType;
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  notes: string | null;
  groupId: string | null;
  team: Team;
  opponent: OpposingTeam;
  group: { id: string; name: string } | null;
  _count: { playerStats: number };
};

type Props = {
  teams: Team[];
  opposingTeams: OpposingTeam[];
  matches: Match[];
  groups: Group[];
};

const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};
const RESULT_LABELS: Record<MatchResult, string> = {
  WIN: "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};
const RESULT_COLORS: Record<MatchResult, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};

const emptyMatchForm = {
  teamId: "",
  opponentId: "",
  newOpponentName: "",
  newOpponentCity: "",
  date: "",
  isHome: true,
  venue: "",
  matchType: "LEAGUE" as MatchType,
  ourScore: "",
  theirScore: "",
  result: "" as MatchResult | "",
  notes: "",
  groupId: "" as string,
};

function seasonForDate(dateStr: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const s = d.getMonth() >= 8 ? y : y - 1;
  return `${s}-${String(s + 1).slice(-2)}`;
}

export default function AdminPartiteClient({ teams, opposingTeams: initialOpponents, matches: initialMatches, groups: initialGroups }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState(initialMatches);
  const [opponents, setOpponents] = useState(initialOpponents);
  const [groups, setGroups] = useState(initialGroups);
  const [tab, setTab] = useState(0); // 0=Partite, 1=Squadre avversarie, 2=Gironi
  const [groupForm, setGroupForm] = useState({ name: "", season: "", championship: "", teamId: "" });
  const [matchDialog, setMatchDialog] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [form, setForm] = useState(emptyMatchForm);
  const teamsForForm = teams.filter((t) => t.season === seasonForDate(form.date));
  const displayTeams = teamsForForm.length > 0 ? teamsForForm : teams;
  const [useNewOpponent, setUseNewOpponent] = useState(false);
  const [opponentForm, setOpponentForm] = useState({ name: "", city: "" });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [callupMatch, setCallupMatch] = useState<Match | null>(null);
  const [statsMatch,  setStatsMatch]  = useState<Match | null>(null); // [CLAUDE 03:00]

  // Paginazione per ciascun tab
  const [matchPage,    setMatchPage]    = useState(0);
  const [matchRpp,     setMatchRpp]     = useState(25);
  const [oppPage,      setOppPage]      = useState(0);
  const [oppRpp,       setOppRpp]       = useState(25);
  const [groupPage,    setGroupPage]    = useState(0);
  const [groupRpp,     setGroupRpp]     = useState(25);

  // Auto-apri dialog di modifica se ?edit=[id] è presente nell'URL
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    const match = initialMatches.find((m) => m.id === editId);
    if (match) openEdit(match);
    // Rimuove il param dall'URL senza ricaricare la pagina
    router.replace("/admin/partite", { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyMatchForm);
    setEditMatch(null);
    setUseNewOpponent(false);
    setError("");
    setMatchDialog(true);
  }
  function openEdit(match: Match) {
    setForm({
      teamId: match.teamId,
      opponentId: match.opponentId,
      newOpponentName: "",
      newOpponentCity: "",
      date: format(new Date(match.date), "yyyy-MM-dd'T'HH:mm"),
      isHome: match.isHome,
      venue: match.venue ?? "",
      matchType: match.matchType,
      ourScore: match.ourScore !== null ? String(match.ourScore) : "",
      theirScore: match.theirScore !== null ? String(match.theirScore) : "",
      result: match.result ?? "",
      notes: match.notes ?? "",
      groupId: match.groupId ?? "",
    });
    setEditMatch(match);
    setUseNewOpponent(false);
    setError("");
    setMatchDialog(true);
  }

  async function handleSaveMatch() {
    setError("");
    if (!form.teamId) { setError("Seleziona una squadra"); return; }
    if (!form.date) { setError("Data obbligatoria"); return; }

    startTransition(async () => {
      let opponentId = form.opponentId;

      // Crea avversaria al volo se necessario
      if (useNewOpponent) {
        if (!form.newOpponentName.trim()) { setError("Nome avversaria obbligatorio"); return; }
        const res = await fetch("/api/opposing-teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.newOpponentName.trim(), city: form.newOpponentCity.trim() || null }),
        });
        if (!res.ok) { setError("Errore creazione avversaria"); return; }
        const created = await res.json() as { id: string; name: string; city: string | null };
        setOpponents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        opponentId = created.id;
      }

      if (!opponentId) { setError("Seleziona o crea la squadra avversaria"); return; }

      const payload = {
        teamId: form.teamId,
        opponentId,
        date: form.date,
        isHome: form.isHome,
        venue: form.venue || null,
        matchType: form.matchType,
        ourScore: form.ourScore !== "" ? Number(form.ourScore) : null,
        theirScore: form.theirScore !== "" ? Number(form.theirScore) : null,
        result: form.result || null,
        notes: form.notes || null,
        groupId: form.groupId || null,
      };

      const method = editMatch ? "PUT" : "POST";
      const url = editMatch ? `/api/matches/${editMatch.id}` : "/api/matches";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError("Errore nel salvataggio"); return; }
      const saved = await res.json() as Match;
      if (editMatch) {
        setMatches((prev) => prev.map((m) => m.id === saved.id ? { ...saved, _count: m._count } : m));
      } else {
        setMatches((prev) => [saved, ...prev]);
      }
      setMatchDialog(false);
      router.refresh();
    });
  }

  async function handleDeleteMatch(id: string) {
    if (!confirm("Eliminare questa partita? Verranno eliminate anche le statistiche dei giocatori.")) return;
    startTransition(async () => {
      await fetch(`/api/matches/${id}`, { method: "DELETE" });
      setMatches((prev) => prev.filter((m) => m.id !== id));
    });
  }

  async function handleSaveOpponent() {
    if (!opponentForm.name.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/opposing-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opponentForm),
      });
      if (!res.ok) return;
      const created = await res.json() as OpposingTeam;
      setOpponents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setOpponentForm({ name: "", city: "" });
    });
  }

  async function handleDeleteOpponent(id: string, name: string) {
    if (!confirm(`Eliminare la squadra avversaria "${name}"?`)) return;
    startTransition(async () => {
      await fetch(`/api/opposing-teams/${id}`, { method: "DELETE" });
      setOpponents((prev) => prev.filter((o) => o.id !== id));
    });
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Gestione Partite</Typography>
          <Typography variant="body2" color="text.secondary">
            Inserisci partite ufficiali e gestisci le squadre avversarie.
          </Typography>
        </Box>
        {tab === 0 && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={teams.length === 0}>
            Nuova partita
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 3, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
        <Tab label="Partite" />
        <Tab label="Squadre avversarie" />
        <Tab label="Gironi" />
      </Tabs>

      {/* TAB 0: Partite */}
      {tab === 0 && (
        <>
          {matches.length === 0 ? (
            <Paper elevation={0} variant="outlined" sx={{ p: 6, textAlign: "center" }}>
              <EmojiEventsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="h6" color="text.secondary">Nessuna partita registrata</Typography>
              {teams.length === 0
                ? <Typography variant="body2" color="text.disabled">Crea prima una squadra nella sezione Squadre.</Typography>
                : <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 2 }}>Aggiungi partita</Button>
              }
            </Paper>
          ) : (
            <Paper elevation={0} variant="outlined" sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Squadra</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Avversario</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: "none", md: "table-cell" } }}>Tipo / Girone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Risultato</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Punteggio</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }} align="center">Stats</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matches.slice(matchPage * matchRpp, (matchPage + 1) * matchRpp).map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {format(new Date(m.date), "d MMM yyyy", { locale: it })}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {m.isHome
                              ? <HomeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                              : <FlightIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                            }
                            <Typography variant="caption" color="text.disabled">
                              {m.isHome ? "Casa" : "Trasferta"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <Chip
                          label={m.team.name}
                          size="small"
                          sx={{ backgroundColor: m.team.color ?? "primary.main", color: "#fff", fontWeight: 700, fontSize: "0.7rem" }}
                        />
                        <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
                          {m.team.season}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{m.opponent.name}</Typography>
                        {m.opponent.city && (
                          <Typography variant="caption" color="text.secondary">{m.opponent.city}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        <Chip label={MATCH_TYPE_LABELS[m.matchType]} size="small" variant="outlined" sx={{ fontSize: "0.68rem" }} />
                        {/* [CLAUDE - 09:00] mostra il girone sotto il tipo — dato già disponibile dopo il fix 08:00 */}
                        {m.group?.name && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontSize: "0.68rem" }}>
                            {m.group.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {m.result && (
                          <Chip
                            label={RESULT_LABELS[m.result]}
                            size="small"
                            sx={{ backgroundColor: RESULT_COLORS[m.result], color: "#fff", fontWeight: 700, fontSize: "0.68rem" }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {m.ourScore !== null && m.theirScore !== null
                          ? <Typography variant="body2" fontWeight={700}>{m.ourScore} – {m.theirScore}</Typography>
                          : <Typography variant="body2" color="text.disabled">—</Typography>
                        }
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <Typography variant="caption" color={m._count.playerStats > 0 ? "primary" : "text.disabled"}>
                          {m._count.playerStats > 0 ? `${m._count.playerStats} gioc.` : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Convocati">
                          <IconButton size="small" color="primary" onClick={() => setCallupMatch(m)}>
                            <GroupsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {/* [CLAUDE 03:00] */}
                        <Tooltip title="Statistiche giocatori">
                          <IconButton size="small" color="primary" onClick={() => setStatsMatch(m)}>
                            <LeaderboardIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifica">
                          <IconButton size="small" onClick={() => openEdit(m)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Elimina">
                          <IconButton size="small" color="error" onClick={() => handleDeleteMatch(m.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={matches.length}
                page={matchPage}
                onPageChange={(_, p) => setMatchPage(p)}
                rowsPerPage={matchRpp}
                onRowsPerPageChange={(e) => { setMatchRpp(parseInt(e.target.value)); setMatchPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="Righe:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
                sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
              />
            </Paper>
          )}
        </>
      )}

      {/* TAB 1: Squadre avversarie */}
      {tab === 1 && (
        <Box>
          <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Aggiungi squadra avversaria
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <TextField
                label="Nome"
                size="small"
                value={opponentForm.name}
                onChange={(e) => setOpponentForm((f) => ({ ...f, name: e.target.value }))}
                sx={{ flex: 2, minWidth: 160 }}
                placeholder="es. Basket Vicenza"
              />
              <TextField
                label="Città"
                size="small"
                value={opponentForm.city}
                onChange={(e) => setOpponentForm((f) => ({ ...f, city: e.target.value }))}
                sx={{ flex: 1, minWidth: 120 }}
                placeholder="es. Vicenza"
              />
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleSaveOpponent} disabled={!opponentForm.name.trim() || isPending}>
                Aggiungi
              </Button>
            </Box>
          </Paper>

          {opponents.length === 0 ? (
            <Typography variant="body2" color="text.disabled">Nessuna squadra avversaria registrata.</Typography>
          ) : (
            <Paper elevation={0} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Città</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opponents.slice(oppPage * oppRpp, (oppPage + 1) * oppRpp).map((o) => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{o.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{o.city ?? "—"}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Elimina">
                          <IconButton size="small" color="error" onClick={() => handleDeleteOpponent(o.id, o.name)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={opponents.length}
                page={oppPage}
                onPageChange={(_, p) => setOppPage(p)}
                rowsPerPage={oppRpp}
                onRowsPerPageChange={(e) => { setOppRpp(parseInt(e.target.value)); setOppPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="Righe:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
                sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
              />
            </Paper>
          )}
        </Box>
      )}

      {/* TAB 2: Gironi */}
      {tab === 2 && (
        <Box>
          <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Crea girone
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <TextField
                label="Nome girone"
                size="small"
                value={groupForm.name}
                onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                sx={{ flex: 2, minWidth: 160 }}
                placeholder="es. Girone A Ovest"
              />
              <TextField
                label="Stagione"
                size="small"
                value={groupForm.season}
                onChange={(e) => setGroupForm((f) => ({ ...f, season: e.target.value }))}
                sx={{ flex: 1, minWidth: 100 }}
                placeholder="es. 2025-26"
              />
              <TextField
                label="Campionato"
                size="small"
                value={groupForm.championship}
                onChange={(e) => setGroupForm((f) => ({ ...f, championship: e.target.value }))}
                sx={{ flex: 1, minWidth: 120 }}
                placeholder="es. Gold"
              />
              <FormControl size="small" sx={{ flex: 2, minWidth: 160 }}>
                <InputLabel>Squadra</InputLabel>
                <Select
                  value={groupForm.teamId}
                  label="Squadra"
                  onChange={(e) => setGroupForm((f) => ({ ...f, teamId: e.target.value as string }))}
                >
                  {teams.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} — {t.season}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={!groupForm.name.trim() || !groupForm.season.trim() || !groupForm.teamId || isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await fetch("/api/groups", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(groupForm),
                    });
                    if (!res.ok) return;
                    const created = await res.json() as Group;
                    setGroups((prev) => [...prev, created].sort((a, b) => b.season.localeCompare(a.season) || a.name.localeCompare(b.name)));
                    setGroupForm({ name: "", season: "", championship: "", teamId: "" });
                  });
                }}
              >
                Crea
              </Button>
            </Box>
          </Paper>

          {groups.length === 0 ? (
            <Typography variant="body2" color="text.disabled">Nessun girone creato.</Typography>
          ) : (
            <Paper elevation={0} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Girone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Stagione</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Campionato</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Squadra</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Partite</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.slice(groupPage * groupRpp, (groupPage + 1) * groupRpp).map((g) => (
                    <TableRow key={g.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={700}>{g.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{g.season}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{g.championship ?? "—"}</Typography></TableCell>
                      <TableCell>
                        <Chip label={g.team.name} size="small" sx={{ bgcolor: g.team.color ?? "primary.main", color: "#fff", fontWeight: 700, fontSize: "0.68rem" }} />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" color={g._count.matches > 0 ? "primary" : "text.disabled"}>
                          {g._count.matches}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Elimina">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (!confirm(`Eliminare il girone "${g.name}"? Le partite associate verranno scollegate.`)) return;
                              startTransition(async () => {
                                await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
                                setGroups((prev) => prev.filter((x) => x.id !== g.id));
                                setMatches((prev) => prev.map((m) => m.groupId === g.id ? { ...m, groupId: null, group: null } : m));
                              });
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={groups.length}
                page={groupPage}
                onPageChange={(_, p) => setGroupPage(p)}
                rowsPerPage={groupRpp}
                onRowsPerPageChange={(e) => { setGroupRpp(parseInt(e.target.value)); setGroupPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="Righe:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
                sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
              />
            </Paper>
          )}
        </Box>
      )}

      {/* Dialog convocati */}
      {callupMatch && (
        <MatchCalloupsDialog
          open={!!callupMatch}
          onClose={() => setCallupMatch(null)}
          matchId={callupMatch.id}
          teamId={callupMatch.teamId}
          matchLabel={`${callupMatch.team.name} vs ${callupMatch.opponent.name} (${format(new Date(callupMatch.date), "d MMM yyyy", { locale: it })})`}
        />
      )}

      {/* [CLAUDE 03:00] Dialog statistiche giocatori */}
      {statsMatch && (
        <MatchStatsDialog
          open={!!statsMatch}
          onClose={() => setStatsMatch(null)}
          matchId={statsMatch.id}
          matchLabel={`${statsMatch.team.name} vs ${statsMatch.opponent.name} (${format(new Date(statsMatch.date), "d MMM yyyy", { locale: it })})`}
          onStatsSaved={(count) => {
            setMatches((prev) => prev.map((m) =>
              m.id === statsMatch.id ? { ...m, _count: { playerStats: count } } : m
            ));
          }}
        />
      )}

      {/* Dialog partita */}
      <Dialog open={matchDialog} onClose={() => setMatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editMatch ? "Modifica partita" : "Nuova partita"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <FormControl fullWidth required>
              <InputLabel>Nostra squadra</InputLabel>
              <Select value={form.teamId} label="Nostra squadra" onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value as string }))}>
                {displayTeams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: t.color ?? "#E65100" }} />
                      {t.name}{teamsForForm.length === 0 && ` — ${t.season}`}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <FormControlLabel
                control={<Switch checked={useNewOpponent} onChange={(e) => setUseNewOpponent(e.target.checked)} size="small" />}
                label={<Typography variant="body2">Crea nuova avversaria</Typography>}
              />
              {useNewOpponent ? (
                <Box sx={{ display: "flex", gap: 1.5, mt: 1, flexWrap: "wrap" }}>
                  <TextField
                    label="Nome avversaria"
                    size="small"
                    value={form.newOpponentName}
                    onChange={(e) => setForm((f) => ({ ...f, newOpponentName: e.target.value }))}
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    label="Città"
                    size="small"
                    value={form.newOpponentCity}
                    onChange={(e) => setForm((f) => ({ ...f, newOpponentCity: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                </Box>
              ) : (
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <InputLabel>Squadra avversaria</InputLabel>
                  <Select value={form.opponentId} label="Squadra avversaria" onChange={(e) => setForm((f) => ({ ...f, opponentId: e.target.value as string }))}>
                    {opponents.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.name}{o.city ? ` (${o.city})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            <TextField
              label="Data e ora"
              type="datetime-local"
              value={form.date}
              onChange={(e) => {
                const newDate = e.target.value;
                const newSeason = seasonForDate(newDate);
                const validTeams = teams.filter((t) => t.season === newSeason);
                setForm((f) => ({
                  ...f,
                  date: newDate,
                  teamId: validTeams.some((t) => t.id === f.teamId) ? f.teamId : (validTeams[0]?.id ?? f.teamId),
                }));
              }}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Tipo</InputLabel>
                <Select value={form.matchType} label="Tipo" onChange={(e) => setForm((f) => ({ ...f, matchType: e.target.value as MatchType }))}>
                  {(Object.keys(MATCH_TYPE_LABELS) as MatchType[]).map((k) => (
                    <MenuItem key={k} value={k}>{MATCH_TYPE_LABELS[k]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isHome}
                    onChange={(e) => setForm((f) => ({ ...f, isHome: e.target.checked }))}
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {form.isHome ? <HomeIcon fontSize="small" /> : <FlightIcon fontSize="small" />}
                    <Typography variant="body2">{form.isHome ? "Casa" : "Trasferta"}</Typography>
                  </Box>
                }
              />
            </Box>

            <TextField
              label="Campo / Palestra"
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              fullWidth
              placeholder="Palasport di Montecchio"
            />

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>Risultato (opzionale)</Typography>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Nostri punti"
                type="number"
                value={form.ourScore}
                onChange={(e) => setForm((f) => ({ ...f, ourScore: e.target.value }))}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label="Punti avversario"
                type="number"
                value={form.theirScore}
                onChange={(e) => setForm((f) => ({ ...f, theirScore: e.target.value }))}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Esito</InputLabel>
              <Select value={form.result} label="Esito" onChange={(e) => setForm((f) => ({ ...f, result: e.target.value as MatchResult | "" }))}>
                <MenuItem value=""><em>Non ancora giocata</em></MenuItem>
                {(Object.keys(RESULT_LABELS) as MatchResult[]).map((k) => (
                  <MenuItem key={k} value={k}>{RESULT_LABELS[k]}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {groups.filter((g) => g.teamId === form.teamId || !form.teamId).length > 0 && (
              <FormControl fullWidth>
                <InputLabel shrink>Girone</InputLabel>
                <Select
                  value={form.groupId}
                  label="Girone"
                  notched
                  displayEmpty
                  onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value as string }))}
                >
                  <MenuItem value=""><em>Nessun girone</em></MenuItem>
                  {groups
                    .filter((g) => !form.teamId || g.teamId === form.teamId)
                    .map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name} {g.championship ? `(${g.championship})` : ""} — {g.season}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Note"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMatchDialog(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleSaveMatch}
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={16} /> : undefined}
          >
            {editMatch ? "Salva" : "Aggiungi partita"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
