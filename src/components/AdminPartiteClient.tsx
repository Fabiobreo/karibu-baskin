"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  TablePagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { MatchType, MatchResult } from "@prisma/client";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import MatchFormDialog, {
  type MatchFormMatch,
  type MatchFormOpposingTeam,
  type MatchFormGroup,
  type MatchFormTeam,
} from "@/components/MatchFormDialog";
import MatchResultDialog, { type MatchResultSavedFields } from "@/components/MatchResultDialog";

type Team = MatchFormTeam;
type OpposingTeam = MatchFormOpposingTeam;
type Group = MatchFormGroup;

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

export default function AdminPartiteClient({
  teams,
  opposingTeams: initialOpponents,
  matches: initialMatches,
  groups,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState(initialMatches);
  const [opponents, setOpponents] = useState(initialOpponents);
  const [matchDialog, setMatchDialog] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(25);
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    const match = initialMatches.find((m) => m.id === editId);
    if (match) {
      setEditMatch(match);
      setMatchDialog(true);
    }
    router.replace("/admin/partite", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditMatch(null);
    setMatchDialog(true);
  }

  function openEdit(match: Match) {
    setEditMatch(match);
    setMatchDialog(true);
  }

  function handleDeleteMatch(id: string) {
    openConfirm(
      "Elimina partita",
      "Eliminare questa partita? Verranno eliminate anche le statistiche dei giocatori.",
      async () => {
        const res = await fetch(`/api/matches/${id}`, { method: "DELETE" });
        if (res.ok) {
          setMatches((prev) => prev.filter((m) => m.id !== id));
          showToast({ message: "Partita eliminata", severity: "success" });
        } else {
          showToast({ message: "Errore nell'eliminazione della partita", severity: "error" });
        }
      }
    );
  }

  function handleResultSaved(matchId: string, fields: MatchResultSavedFields) {
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...fields } : m)));
    showToast({ message: "Risultato aggiornato", severity: "success" });
  }

  function handleSaved(saved: MatchFormMatch, isEdit: boolean) {
    if (isEdit) {
      setMatches((prev) =>
        prev.map((m) => (m.id === saved.id ? ({ ...saved, _count: m._count } as Match) : m))
      );
      setMatchDialog(false);
      router.refresh();
    } else {
      setMatches((prev) => [saved as Match, ...prev]);
      setMatchDialog(false);
      router.push(`/admin/partite/${saved.id}/convocazioni`);
    }
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
            Calendario delle partite ufficiali, convocazioni e statistiche.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          disabled={teams.length === 0}
        >
          Nuova partita
        </Button>
      </Box>

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
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 2 }}>
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
              {matches.slice(page * rpp, (page + 1) * rpp).map((m) => (
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
                    <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
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
                    <Tooltip
                      title={m.ourScore !== null ? "Modifica risultato" : "Inserisci risultato"}
                    >
                      <Button
                        size="small"
                        onClick={() => setResultMatch(m)}
                        sx={{
                          minWidth: 0,
                          px: 1,
                          py: 0.25,
                          textTransform: "none",
                          color: m.ourScore !== null ? "text.primary" : "primary.main",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                        }}
                      >
                        {m.ourScore !== null && m.theirScore !== null
                          ? `${m.ourScore} – ${m.theirScore}`
                          : "+ Risultato"}
                      </Button>
                    </Tooltip>
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
                    <Tooltip title="Inserisci risultato">
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label="Inserisci risultato"
                        onClick={() => setResultMatch(m)}
                      >
                        <ScoreboardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
                        onClick={() => router.push(`/admin/partite/${m.id}/statistiche`)}
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
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rpp}
            onRowsPerPageChange={(e) => {
              setRpp(parseInt(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Righe:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
            sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
          />
        </Paper>
      )}

      {resultMatch && (
        <MatchResultDialog
          open={!!resultMatch}
          onClose={() => setResultMatch(null)}
          matchId={resultMatch.id}
          matchLabel={`${resultMatch.team.name} vs ${resultMatch.opponent?.name ?? resultMatch.opponentTeam?.name ?? "Avversario"} — ${format(new Date(resultMatch.date), "d MMM yyyy", { locale: it })}`}
          initialOurScore={resultMatch.ourScore}
          initialTheirScore={resultMatch.theirScore}
          initialResult={resultMatch.result}
          onSaved={handleResultSaved}
        />
      )}

      <MatchFormDialog
        open={matchDialog}
        onClose={() => setMatchDialog(false)}
        editMatch={editMatch}
        teams={teams}
        opponents={opponents}
        groups={groups}
        onOpponentCreated={(opp) =>
          setOpponents((prev) => [...prev, opp].sort((a, b) => a.name.localeCompare(b.name)))
        }
        onSaved={(saved, isEdit) => handleSaved(saved as Match, isEdit)}
      />

      {ConfirmDialog}
    </Box>
  );
}
