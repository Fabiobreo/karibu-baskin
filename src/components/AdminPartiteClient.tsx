"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider,
  Tabs,
  Tab,
  TablePagination,
  Skeleton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import TableRowsIcon from "@mui/icons-material/TableRows";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useState, useTransition, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { MatchType, MatchResult } from "@prisma/client";
import MatchStatsDialog from "@/components/MatchStatsDialog";
import GroupCsvImportDialog from "@/components/GroupCsvImportDialog";
import { seasonForDate } from "@/components/SessionRestrictionEditor";

type Team = { id: string; name: string; season: string; color: string | null };
type OpposingTeam = { id: string; name: string; city: string | null };
type Group = {
  id: string;
  name: string;
  season: string;
  championship: string | null;
  teamId: string;
  team: { id: string; name: string; color: string | null };
  _count: { matches: number };
};
type Match = {
  id: string;
  teamId: string;
  opponentId: string | null;
  opponentTeamId?: string | null;
  date: Date | string;
  isHome: boolean;
  venue: string | null;
  matchType: MatchType;
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  notes: string | null;
  matchday: number | null;
  groupId: string | null;
  team: Team;
  opponent: OpposingTeam | null;
  opponentTeam?: { id: string; name: string; color: string | null } | null;
  group: { id: string; name: string } | null;
  _count: { playerStats: number };
};

type GroupMatchItem = {
  id: string;
  matchday: number | null;
  date: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
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

const matchFormSchema = z.object({
  teamId: z.string().min(1, "Seleziona una squadra"),
  opponentKind: z.enum(["external", "internal"]),
  opponentId: z.string(),
  opponentTeamId: z.string(),
  newOpponentName: z.string(),
  newOpponentCity: z.string(),
  date: z.string().min(1, "Data obbligatoria"),
  isHome: z.boolean(),
  venue: z.string(),
  matchType: z.nativeEnum({
    LEAGUE: "LEAGUE",
    TOURNAMENT: "TOURNAMENT",
    FRIENDLY: "FRIENDLY",
  } as const),
  ourScore: z.string(),
  theirScore: z.string(),
  result: z.union([
    z.nativeEnum({ WIN: "WIN", LOSS: "LOSS", DRAW: "DRAW" } as const),
    z.literal(""),
  ]),
  notes: z.string(),
  matchday: z.string(),
  groupId: z.string(),
});

type MatchFormValues = z.infer<typeof matchFormSchema>;

const defaultMatchValues: MatchFormValues = {
  teamId: "",
  opponentKind: "external",
  opponentId: "",
  opponentTeamId: "",
  newOpponentName: "",
  newOpponentCity: "",
  date: "",
  isHome: true,
  venue: "",
  matchType: "LEAGUE",
  ourScore: "",
  theirScore: "",
  result: "",
  notes: "",
  matchday: "",
  groupId: "",
};

const EMPTY_GM_FORM = {
  matchday: "",
  date: "",
  homeTeamId: "",
  awayTeamId: "",
  homeScore: "",
  awayScore: "",
};

function deriveResultFromScores(ourScore: string, theirScore: string): MatchResult | "" {
  const our = parseInt(ourScore, 10);
  const their = parseInt(theirScore, 10);
  if (isNaN(our) || isNaN(their)) return "";
  if (our > their) return "WIN";
  if (our < their) return "LOSS";
  return "DRAW";
}

export default function AdminPartiteClient({
  teams,
  opposingTeams: initialOpponents,
  matches: initialMatches,
  groups: initialGroups,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState(initialMatches);
  const [opponents, setOpponents] = useState(initialOpponents);
  const [groups, setGroups] = useState(initialGroups);
  const [tab, setTab] = useState(0); // 0=Partite, 1=Squadre avversarie, 2=Gironi
  const [groupForm, setGroupForm] = useState({
    name: "",
    season: "",
    championship: "",
    teamId: "",
  });
  const [matchDialog, setMatchDialog] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    reset: resetMatchForm,
    watch,
    setValue,
    control,
    setError: setFieldError,
    formState: { errors: matchErrors, isSubmitting: isMatchSubmitting },
  } = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: defaultMatchValues,
  });
  const watchDate = watch("date");
  const watchOurScore = watch("ourScore");
  const watchTheirScore = watch("theirScore");
  const watchOpponentKind = watch("opponentKind");
  const watchTeamId = watch("teamId");
  const teamsForForm = teams.filter((t) => t.season === seasonForDate(watchDate ?? ""));
  const displayTeams = teamsForForm.length > 0 ? teamsForForm : teams;
  const [useNewOpponent, setUseNewOpponent] = useState(false);
  const [opponentForm, setOpponentForm] = useState({ name: "", city: "" });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [statsMatch, setStatsMatch] = useState<Match | null>(null);

  // Dialog gestione risultati esterni girone
  const [gmGroup, setGmGroup] = useState<Group | null>(null);
  const [gmMatches, setGmMatches] = useState<GroupMatchItem[]>([]);
  const [gmLoading, setGmLoading] = useState(false);
  const [gmForm, setGmForm] = useState(EMPTY_GM_FORM);
  const [gmError, setGmError] = useState("");
  const [editGm, setEditGm] = useState<GroupMatchItem | null>(null);
  const [gmDayFilter, setGmDayFilter] = useState<number | null>(null);
  const [csvImportGroup, setCsvImportGroup] = useState<Group | null>(null);

  // Dialog di conferma generica
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  function openConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }
  function closeConfirm() {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  }

  // Paginazione per ciascun tab
  const [matchPage, setMatchPage] = useState(0);
  const [matchRpp, setMatchRpp] = useState(25);
  const [oppPage, setOppPage] = useState(0);
  const [oppRpp, setOppRpp] = useState(25);
  const [groupPage, setGroupPage] = useState(0);
  const [groupRpp, setGroupRpp] = useState(25);

  // Deriva il risultato automaticamente dai punteggi
  useEffect(() => {
    const derived = deriveResultFromScores(watchOurScore, watchTheirScore);
    if (derived) setValue("result", derived);
  }, [watchOurScore, watchTheirScore, setValue]);

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
    resetMatchForm(defaultMatchValues);
    setEditMatch(null);
    setUseNewOpponent(false);
    setError("");
    setMatchDialog(true);
  }
  function openEdit(match: Match) {
    resetMatchForm({
      teamId: match.teamId,
      opponentKind: match.opponentTeamId ? "internal" : "external",
      opponentId: match.opponentId ?? "",
      opponentTeamId: match.opponentTeamId ?? "",
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
      matchday: match.matchday !== null ? String(match.matchday) : "",
      groupId: match.groupId ?? "",
    });
    setEditMatch(match);
    setUseNewOpponent(false);
    setError("");
    setMatchDialog(true);
  }

  const handleSaveMatch = rhfHandleSubmit(async (values) => {
    setError("");

    // Validazione condizionale: tre casi (esterna esistente, esterna nuova, interna)
    if (values.opponentKind === "internal") {
      if (!values.opponentTeamId) {
        setFieldError("opponentTeamId", { message: "Seleziona la squadra interna avversaria" });
        return;
      }
      if (values.opponentTeamId === values.teamId) {
        setFieldError("opponentTeamId", {
          message: "Una squadra non può giocare contro se stessa",
        });
        return;
      }
    } else if (useNewOpponent) {
      if (!values.newOpponentName.trim()) {
        setFieldError("newOpponentName", { message: "Nome avversaria obbligatorio" });
        return;
      }
    } else if (!values.opponentId) {
      setFieldError("opponentId", { message: "Seleziona o crea la squadra avversaria" });
      return;
    }

    let opponentId: string | null = values.opponentId;
    let opponentTeamId: string | null = null;
    const isInternal = values.opponentKind === "internal";

    if (isInternal) {
      opponentId = null;
      opponentTeamId = values.opponentTeamId;
    } else if (useNewOpponent) {
      // Crea avversaria esterna al volo
      const res = await fetch("/api/opposing-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.newOpponentName.trim(),
          city: values.newOpponentCity.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("Errore creazione avversaria");
        return;
      }
      const created = (await res.json()) as { id: string; name: string; city: string | null };
      setOpponents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      opponentId = created.id;
    }

    const payload = {
      teamId: values.teamId,
      opponentId,
      opponentTeamId,
      date: values.date,
      isHome: values.isHome,
      venue: values.venue || null,
      // Le partite interne sono sempre amichevoli
      matchType: isInternal ? "FRIENDLY" : values.matchType,
      ourScore: values.ourScore !== "" ? Number(values.ourScore) : null,
      theirScore: values.theirScore !== "" ? Number(values.theirScore) : null,
      result: values.result || null,
      notes: values.notes || null,
      matchday: values.matchday !== "" ? Number(values.matchday) : null,
      // Le amichevoli interne non hanno girone
      groupId: isInternal ? null : values.groupId || null,
    };

    const method = editMatch ? "PUT" : "POST";
    const url = editMatch ? `/api/matches/${editMatch.id}` : "/api/matches";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      setError(errData.error ?? "Errore nel salvataggio");
      return;
    }
    const saved = (await res.json()) as Match;
    if (editMatch) {
      setMatches((prev) =>
        prev.map((m) => (m.id === saved.id ? { ...saved, _count: m._count } : m))
      );
      setMatchDialog(false);
    } else {
      setMatches((prev) => [saved, ...prev]);
      setMatchDialog(false);
      // Apri automaticamente la pagina convocazioni per la nuova partita
      router.push(`/admin/partite/${saved.id}/convocazioni`);
      return;
    }
    router.refresh();
  });

  function handleDeleteMatch(id: string) {
    openConfirm(
      "Elimina partita",
      "Eliminare questa partita? Verranno eliminate anche le statistiche dei giocatori.",
      () =>
        startTransition(async () => {
          const res = await fetch(`/api/matches/${id}`, { method: "DELETE" });
          if (res.ok) setMatches((prev) => prev.filter((m) => m.id !== id));
          else setError("Errore nell'eliminazione della partita");
        })
    );
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
      const created = (await res.json()) as OpposingTeam;
      setOpponents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setOpponentForm({ name: "", city: "" });
    });
  }

  function handleDeleteOpponent(id: string, name: string) {
    openConfirm("Elimina squadra avversaria", `Eliminare la squadra avversaria "${name}"?`, () =>
      startTransition(async () => {
        const res = await fetch(`/api/opposing-teams/${id}`, { method: "DELETE" });
        if (res.ok) setOpponents((prev) => prev.filter((o) => o.id !== id));
        else setError("Errore nell'eliminazione della squadra avversaria");
      })
    );
  }

  async function openGmDialog(group: Group) {
    setGmGroup(group);
    setGmError("");
    setEditGm(null);
    setGmMatches([]);
    setGmForm(EMPTY_GM_FORM);
    setGmLoading(true);
    const res = await fetch(`/api/groups/${group.id}`);
    if (res.ok) {
      const data = (await res.json()) as { groupMatches: GroupMatchItem[] };
      setGmMatches(data.groupMatches ?? []);
    } else {
      setGmError("Errore nel caricamento dei risultati del girone");
    }
    setGmLoading(false);
  }

  async function handleSaveGm() {
    if (!gmGroup || !gmForm.homeTeamId || !gmForm.awayTeamId) {
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
      const res = await fetch(`/api/groups/${gmGroup.id}/matches/${editGm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setGmError("Errore nel salvataggio");
        return;
      }
      const updated = (await res.json()) as GroupMatchItem;
      setGmMatches((prev) =>
        prev
          .map((m) => (m.id === updated.id ? updated : m))
          .sort((a, b) => (a.matchday ?? 999) - (b.matchday ?? 999))
      );
      setEditGm(null);
    } else {
      const res = await fetch(`/api/groups/${gmGroup.id}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setGmError("Errore nel salvataggio");
        return;
      }
      const created = (await res.json()) as GroupMatchItem;
      setGmMatches((prev) =>
        [...prev, created].sort((a, b) => (a.matchday ?? 999) - (b.matchday ?? 999))
      );
    }
    setGmForm(EMPTY_GM_FORM);
  }

  async function handleDeleteGm(id: string) {
    if (!gmGroup) return;
    const res = await fetch(`/api/groups/${gmGroup.id}/matches/${id}`, { method: "DELETE" });
    if (res.ok) setGmMatches((prev) => prev.filter((m) => m.id !== id));
    else setGmError("Errore nell'eliminazione del risultato");
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Gestione Partite
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inserisci partite ufficiali e gestisci le squadre avversarie.
          </Typography>
        </Box>
        {tab === 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={teams.length === 0}
          >
            Nuova partita
          </Button>
        )}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        sx={{ mb: 3, borderBottom: "1px solid rgba(0,0,0,0.1)" }}
      >
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
              <Typography variant="h6" color="text.secondary">
                Nessuna partita registrata
              </Typography>
              {teams.length === 0 ? (
                <Typography variant="body2" color="text.disabled">
                  Crea prima una squadra nella sezione Squadre.
                </Typography>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreate}
                  sx={{ mt: 2 }}
                >
                  Aggiungi partita
                </Button>
              )}
            </Paper>
          ) : (
            <Paper elevation={0} variant="outlined" sx={{ overflowX: "auto" }}>
              <Table size="small" aria-label="Lista partite ufficiali">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>
                      Squadra
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Avversario</TableCell>
                    <TableCell sx={{ fontWeight: 700, display: { xs: "none", md: "table-cell" } }}>
                      Tipo / Girone
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      Risultato
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      Punteggio
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}
                      align="center"
                    >
                      Stats
                    </TableCell>
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
                            {m.isHome ? (
                              <HomeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                            ) : (
                              <FlightIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                            )}
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
                          sx={{
                            backgroundColor: m.team.color ?? "primary.main",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ display: "block" }}
                        >
                          {m.team.season}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {m.opponent?.name ?? m.opponentTeam?.name ?? "—"}
                          {m.opponentTeam && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 0.5, color: "primary.main", fontWeight: 700 }}
                            >
                              (interna)
                            </Typography>
                          )}
                        </Typography>
                        {m.opponent?.city && (
                          <Typography variant="caption" color="text.secondary">
                            {m.opponent.city}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        <Chip
                          label={MATCH_TYPE_LABELS[m.matchType]}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.68rem" }}
                        />
                        {m.group?.name && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.25, fontSize: "0.68rem" }}
                          >
                            {m.group.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {m.result && (
                          <Chip
                            label={RESULT_LABELS[m.result]}
                            size="small"
                            sx={{
                              backgroundColor: RESULT_COLORS[m.result],
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "0.68rem",
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {m.ourScore !== null && m.theirScore !== null ? (
                          <Typography variant="body2" fontWeight={700}>
                            {m.ourScore} – {m.theirScore}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <Typography
                          variant="caption"
                          color={m._count.playerStats > 0 ? "primary" : "text.disabled"}
                        >
                          {m._count.playerStats > 0 ? `${m._count.playerStats} gioc.` : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Convocati">
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="Convocati partita"
                            onClick={() => router.push(`/admin/partite/${m.id}/convocazioni`)}
                          >
                            <GroupsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Statistiche giocatori">
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="Statistiche giocatori"
                            onClick={() => setStatsMatch(m)}
                          >
                            <LeaderboardIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifica">
                          <IconButton
                            size="small"
                            aria-label="Modifica partita"
                            onClick={() => openEdit(m)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Elimina">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Elimina partita"
                            onClick={() => handleDeleteMatch(m.id)}
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
                count={matches.length}
                page={matchPage}
                onPageChange={(_, p) => setMatchPage(p)}
                rowsPerPage={matchRpp}
                onRowsPerPageChange={(e) => {
                  setMatchRpp(parseInt(e.target.value));
                  setMatchPage(0);
                }}
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
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleSaveOpponent}
                disabled={!opponentForm.name.trim() || isPending}
              >
                Aggiungi
              </Button>
            </Box>
          </Paper>

          {opponents.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              Nessuna squadra avversaria registrata.
            </Typography>
          ) : (
            <Paper elevation={0} variant="outlined">
              <Table size="small" aria-label="Lista squadre avversarie">
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
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {o.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {o.city ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Elimina">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Elimina squadra avversaria"
                            onClick={() => handleDeleteOpponent(o.id, o.name)}
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
                count={opponents.length}
                page={oppPage}
                onPageChange={(_, p) => setOppPage(p)}
                rowsPerPage={oppRpp}
                onRowsPerPageChange={(e) => {
                  setOppRpp(parseInt(e.target.value));
                  setOppPage(0);
                }}
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
                  onChange={(e) =>
                    setGroupForm((f) => ({ ...f, teamId: e.target.value as string }))
                  }
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
                disabled={
                  !groupForm.name.trim() ||
                  !groupForm.season.trim() ||
                  !groupForm.teamId ||
                  isPending
                }
                onClick={() => {
                  startTransition(async () => {
                    const res = await fetch("/api/groups", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(groupForm),
                    });
                    if (!res.ok) return;
                    const created = (await res.json()) as Group;
                    setGroups((prev) =>
                      [...prev, created].sort(
                        (a, b) => b.season.localeCompare(a.season) || a.name.localeCompare(b.name)
                      )
                    );
                    setGroupForm({ name: "", season: "", championship: "", teamId: "" });
                  });
                }}
              >
                Crea
              </Button>
            </Box>
          </Paper>

          {groups.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              Nessun girone creato.
            </Typography>
          ) : (
            <Paper elevation={0} variant="outlined">
              <Table size="small" aria-label="Lista gironi">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Girone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Stagione</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Campionato</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Squadra</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      Partite
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.slice(groupPage * groupRpp, (groupPage + 1) * groupRpp).map((g) => (
                    <TableRow key={g.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {g.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{g.season}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {g.championship ?? "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={g.team.name}
                          size="small"
                          sx={{
                            bgcolor: g.team.color ?? "primary.main",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="caption"
                          color={g._count.matches > 0 ? "primary" : "text.disabled"}
                        >
                          {g._count.matches}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Risultati esterni">
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="Risultati esterni girone"
                            onClick={() => openGmDialog(g)}
                          >
                            <TableRowsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Elimina">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Elimina girone"
                            onClick={() =>
                              openConfirm(
                                "Elimina girone",
                                `Eliminare il girone "${g.name}"? Le partite associate verranno scollegate.`,
                                () =>
                                  startTransition(async () => {
                                    await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
                                    setGroups((prev) => prev.filter((x) => x.id !== g.id));
                                    setMatches((prev) =>
                                      prev.map((m) =>
                                        m.groupId === g.id
                                          ? { ...m, groupId: null, group: null }
                                          : m
                                      )
                                    );
                                  })
                              )
                            }
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
                onRowsPerPageChange={(e) => {
                  setGroupRpp(parseInt(e.target.value));
                  setGroupPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="Righe:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
                sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
              />
            </Paper>
          )}
        </Box>
      )}

      {/* Dialog import CSV gironi */}
      {csvImportGroup && (
        <GroupCsvImportDialog
          open={!!csvImportGroup}
          onClose={() => setCsvImportGroup(null)}
          groupId={csvImportGroup.id}
          groupName={csvImportGroup.name}
          opponents={opponents}
          onImported={(count) => {
            setCsvImportGroup(null);
            // Ricarica i match del girone aperto
            if (gmGroup?.id === csvImportGroup.id) {
              openGmDialog(csvImportGroup);
            }
          }}
        />
      )}

      {statsMatch && (
        <MatchStatsDialog
          open={!!statsMatch}
          onClose={() => setStatsMatch(null)}
          matchId={statsMatch.id}
          matchLabel={`${statsMatch.team.name} vs ${statsMatch.opponent?.name ?? statsMatch.opponentTeam?.name ?? "Avversario"} (${format(new Date(statsMatch.date), "d MMM yyyy", { locale: it })})`}
          onStatsSaved={(count) => {
            setMatches((prev) =>
              prev.map((m) =>
                m.id === statsMatch.id ? { ...m, _count: { playerStats: count } } : m
              )
            );
          }}
        />
      )}

      {/* Dialog risultati esterni girone */}
      <Dialog
        open={!!gmGroup}
        onClose={() => setGmGroup(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "85vh" } }}
      >
        {gmGroup && (
          <>
            <DialogTitle fontWeight={700}>
              Risultati esterni — {gmGroup.name}
              {gmGroup.championship && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({gmGroup.championship})
                </Typography>
              )}
            </DialogTitle>
            <DialogContent>
              {gmError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {gmError}
                </Alert>
              )}

              {/* Form aggiunta / modifica */}
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ p: 2, mb: 2.5, borderColor: editGm ? "primary.main" : "divider" }}
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
                    label="Giornata"
                    type="number"
                    size="small"
                    value={gmForm.matchday}
                    onChange={(e) => setGmForm((f) => ({ ...f, matchday: e.target.value }))}
                    sx={{ width: 90 }}
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
                      onChange={(e) =>
                        setGmForm((f) => ({ ...f, homeTeamId: e.target.value as string }))
                      }
                    >
                      {opponents.map((o) => (
                        <MenuItem key={o.id} value={o.id}>
                          {o.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Pt Casa"
                    type="number"
                    size="small"
                    value={gmForm.homeScore}
                    onChange={(e) => setGmForm((f) => ({ ...f, homeScore: e.target.value }))}
                    sx={{ width: 80 }}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                  <TextField
                    label="Pt Ospiti"
                    type="number"
                    size="small"
                    value={gmForm.awayScore}
                    onChange={(e) => setGmForm((f) => ({ ...f, awayScore: e.target.value }))}
                    sx={{ width: 80 }}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                  <FormControl size="small" sx={{ flex: 2, minWidth: 150 }}>
                    <InputLabel>Ospiti</InputLabel>
                    <Select
                      value={gmForm.awayTeamId}
                      label="Ospiti"
                      onChange={(e) =>
                        setGmForm((f) => ({ ...f, awayTeamId: e.target.value as string }))
                      }
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

              {/* Toolbar: filtro giornata + import CSV */}
              {gmMatches.length > 0 && !gmLoading && (
                <Box
                  sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}
                >
                  <FilterListIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                  <Typography variant="caption" color="text.disabled" fontWeight={700}>
                    Giornata:
                  </Typography>
                  <Chip
                    label="Tutte"
                    size="small"
                    variant={gmDayFilter === null ? "filled" : "outlined"}
                    color={gmDayFilter === null ? "primary" : "default"}
                    onClick={() => setGmDayFilter(null)}
                    sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.72rem" }}
                  />
                  {Array.from(
                    new Set(gmMatches.map((m) => m.matchday).filter((d): d is number => d !== null))
                  )
                    .sort((a, b) => a - b)
                    .map((day) => (
                      <Chip
                        key={day}
                        label={`G${day}`}
                        size="small"
                        variant={gmDayFilter === day ? "filled" : "outlined"}
                        color={gmDayFilter === day ? "primary" : "default"}
                        onClick={() => setGmDayFilter(day)}
                        sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.72rem" }}
                      />
                    ))}
                  <Button
                    size="small"
                    startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setCsvImportGroup(gmGroup)}
                    sx={{ ml: "auto", fontSize: "0.72rem" }}
                  >
                    Importa CSV
                  </Button>
                </Box>
              )}
              {gmMatches.length === 0 && !gmLoading && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
                  <Button
                    size="small"
                    startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setCsvImportGroup(gmGroup)}
                    sx={{ fontSize: "0.72rem" }}
                  >
                    Importa CSV
                  </Button>
                </Box>
              )}

              {/* Lista risultati */}
              {gmLoading ? (
                <Table size="small" aria-label="Risultati girone in caricamento">
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
                    {[0, 1, 2].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton width={20} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={60} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={90} />
                        </TableCell>
                        <TableCell align="center">
                          <Skeleton width={40} sx={{ mx: "auto" }} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={90} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={50} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : gmMatches.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.disabled"
                  sx={{ textAlign: "center", py: 3 }}
                >
                  Nessun risultato esterno inserito.
                </Typography>
              ) : (
                <Table size="small" aria-label="Risultati partite girone">
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
                    {gmMatches
                      .filter((m) => gmDayFilter === null || m.matchday === gmDayFilter)
                      .map((m) => (
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
                              aria-label="Modifica partita girone"
                              onClick={() => {
                                setGmForm({
                                  matchday: m.matchday !== null ? String(m.matchday) : "",
                                  date: m.date
                                    ? typeof m.date === "string"
                                      ? m.date.slice(0, 10)
                                      : m.date
                                    : "",
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
                              aria-label="Elimina partita girone"
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
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setGmGroup(null)}>Chiudi</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog partita */}
      <Dialog open={matchDialog} onClose={() => setMatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editMatch ? "Modifica partita" : "Nuova partita"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Controller
              name="teamId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required error={!!matchErrors.teamId}>
                  <InputLabel>Nostra squadra</InputLabel>
                  <Select {...field} label="Nostra squadra">
                    {displayTeams.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: t.color ?? "#E65100",
                            }}
                          />
                          {t.name}
                          {teamsForForm.length === 0 && ` — ${t.season}`}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {matchErrors.teamId && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {matchErrors.teamId.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            <Box>
              {/* Toggle Esterno / Interno */}
              <Controller
                name="opponentKind"
                control={control}
                render={({ field }) => (
                  <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
                    <Button
                      variant={field.value === "external" ? "contained" : "outlined"}
                      size="small"
                      onClick={() => field.onChange("external")}
                      sx={{ flex: 1, textTransform: "none" }}
                    >
                      Squadra esterna
                    </Button>
                    <Button
                      variant={field.value === "internal" ? "contained" : "outlined"}
                      size="small"
                      onClick={() => {
                        field.onChange("internal");
                        setValue("matchType", "FRIENDLY");
                      }}
                      sx={{ flex: 1, textTransform: "none" }}
                    >
                      Amichevole interna
                    </Button>
                  </Box>
                )}
              />

              {watchOpponentKind === "internal" ? (
                <Controller
                  name="opponentTeamId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!matchErrors.opponentTeamId}>
                      <InputLabel>Squadra interna avversaria</InputLabel>
                      <Select {...field} label="Squadra interna avversaria">
                        {teams
                          .filter((t) => t.id !== watchTeamId)
                          .map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name} — {t.season}
                            </MenuItem>
                          ))}
                      </Select>
                      {matchErrors.opponentTeamId && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {matchErrors.opponentTeamId.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              ) : (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useNewOpponent}
                        onChange={(e) => setUseNewOpponent(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Crea nuova avversaria</Typography>}
                  />
                  {useNewOpponent ? (
                    <Box sx={{ display: "flex", gap: 1.5, mt: 1, flexWrap: "wrap" }}>
                      <TextField
                        label="Nome avversaria"
                        size="small"
                        {...register("newOpponentName")}
                        error={!!matchErrors.newOpponentName}
                        helperText={matchErrors.newOpponentName?.message}
                        sx={{ flex: 2 }}
                      />
                      <TextField
                        label="Città"
                        size="small"
                        {...register("newOpponentCity")}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  ) : (
                    <Controller
                      name="opponentId"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth sx={{ mt: 1 }} error={!!matchErrors.opponentId}>
                          <InputLabel>Squadra avversaria</InputLabel>
                          <Select {...field} label="Squadra avversaria">
                            {opponents.map((o) => (
                              <MenuItem key={o.id} value={o.id}>
                                {o.name}
                                {o.city ? ` (${o.city})` : ""}
                              </MenuItem>
                            ))}
                          </Select>
                          {matchErrors.opponentId && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                              {matchErrors.opponentId.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  )}
                </>
              )}
            </Box>

            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Data e ora"
                  type="datetime-local"
                  fullWidth
                  error={!!matchErrors.date}
                  helperText={matchErrors.date?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    field.onChange(newDate);
                    const newSeason = seasonForDate(newDate);
                    const validTeams = teams.filter((t) => t.season === newSeason);
                    const currentTeamId = watch("teamId");
                    if (!validTeams.some((t) => t.id === currentTeamId) && validTeams[0]) {
                      setValue("teamId", validTeams[0].id);
                    }
                  }}
                />
              )}
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="matchType"
                control={control}
                render={({ field }) => (
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Tipo</InputLabel>
                    <Select {...field} label="Tipo">
                      {(Object.keys(MATCH_TYPE_LABELS) as MatchType[]).map((k) => (
                        <MenuItem key={k} value={k}>
                          {MATCH_TYPE_LABELS[k]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                name="isHome"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {field.value ? (
                          <HomeIcon fontSize="small" />
                        ) : (
                          <FlightIcon fontSize="small" />
                        )}
                        <Typography variant="body2">
                          {field.value ? "Casa" : "Trasferta"}
                        </Typography>
                      </Box>
                    }
                  />
                )}
              />
            </Box>

            <TextField
              label="Campo / Palestra"
              {...register("venue")}
              fullWidth
              placeholder="Palasport di Montecchio"
            />

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
              Risultato (opzionale)
            </Typography>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Nostri punti"
                type="number"
                {...register("ourScore")}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label="Punti avversario"
                type="number"
                {...register("theirScore")}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>

            <Controller
              name="result"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Esito</InputLabel>
                  <Select {...field} label="Esito">
                    <MenuItem value="">
                      <em>Non ancora giocata</em>
                    </MenuItem>
                    {(Object.keys(RESULT_LABELS) as MatchResult[]).map((k) => (
                      <MenuItem key={k} value={k}>
                        {RESULT_LABELS[k]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            {groups.filter((g) => g.teamId === watch("teamId") || !watch("teamId")).length > 0 && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <Controller
                  name="groupId"
                  control={control}
                  render={({ field }) => (
                    <FormControl sx={{ flex: 2 }}>
                      <InputLabel shrink>Girone</InputLabel>
                      <Select {...field} label="Girone" notched displayEmpty>
                        <MenuItem value="">
                          <em>Nessun girone</em>
                        </MenuItem>
                        {groups
                          .filter((g) => !watch("teamId") || g.teamId === watch("teamId"))
                          .map((g) => (
                            <MenuItem key={g.id} value={g.id}>
                              {g.name} {g.championship ? `(${g.championship})` : ""} — {g.season}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <TextField
                  label="Giornata"
                  type="number"
                  {...register("matchday")}
                  sx={{ flex: 1 }}
                  slotProps={{ htmlInput: { min: 1 } }}
                  placeholder="es. 3"
                />
              </Box>
            )}

            <TextField label="Note" {...register("notes")} fullWidth multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMatchDialog(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleSaveMatch}
            disabled={isMatchSubmitting}
            startIcon={isMatchSubmitting ? <CircularProgress size={16} /> : undefined}
          >
            {editMatch ? "Salva" : "Aggiungi partita"}
          </Button>
        </DialogActions>
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
          <DialogContentText id="confirm-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Annulla</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              closeConfirm();
              confirmDialog.onConfirm();
            }}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
