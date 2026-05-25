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
  Tabs,
  Tab,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
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
import GroupMatchInlineScore from "@/components/GroupMatchInlineScore";

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
  imageUrl?: string | null;
  matchday: number | null;
  groupId: string | null;
  team: Team;
  opponent: OpposingTeam | null;
  opponentTeam?: { id: string; name: string; color: string | null } | null;
  group: { id: string; name: string } | null;
  _count: { playerStats: number };
};

type GroupMatch = {
  id: string;
  groupId: string;
  matchday: number | null;
  date: Date | string | null;
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
  groupMatches: GroupMatch[];
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

type TabKey = "LEAGUE" | "FRIENDLY" | "TOURNAMENT";

const TAB_LABELS: Record<TabKey, string> = {
  LEAGUE: "Campionato",
  FRIENDLY: "Amichevoli",
  TOURNAMENT: "Tornei",
};

export default function AdminPartiteClient({
  teams,
  opposingTeams: initialOpponents,
  matches: initialMatches,
  groups,
  groupMatches: initialGroupMatches,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState(initialMatches);
  const [groupMatches, setGroupMatches] = useState(initialGroupMatches);
  const [opponents, setOpponents] = useState(initialOpponents);
  const [matchDialog, setMatchDialog] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [tab, setTab] = useState<TabKey>("LEAGUE");
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
      setTab(match.matchType as TabKey);
    }
    router.replace("/admin/partite", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMatches = useMemo(() => matches.filter((m) => m.matchType === tab), [matches, tab]);

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

  function handleGroupMatchSaved(
    gmId: string,
    fields: { homeScore: number | null; awayScore: number | null }
  ) {
    setGroupMatches((prev) => prev.map((g) => (g.id === gmId ? { ...g, ...fields } : g)));
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
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

      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v);
          setPage(0);
        }}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
          <Tab
            key={k}
            value={k}
            label={`${TAB_LABELS[k]} (${matches.filter((m) => m.matchType === k).length})`}
          />
        ))}
      </Tabs>

      {matches.length === 0 ? (
        <EmptyState onCreate={openCreate} disabled={teams.length === 0} />
      ) : tab === "LEAGUE" ? (
        <LeagueView
          matches={filteredMatches}
          groupMatches={groupMatches}
          router={router}
          onResult={(m) => setResultMatch(m)}
          onEdit={openEdit}
          onDelete={handleDeleteMatch}
          onGroupMatchSaved={handleGroupMatchSaved}
        />
      ) : (
        <FlatView
          matches={filteredMatches}
          page={page}
          rpp={rpp}
          setPage={setPage}
          setRpp={setRpp}
          router={router}
          onResult={(m) => setResultMatch(m)}
          onEdit={openEdit}
          onDelete={handleDeleteMatch}
        />
      )}

      {resultMatch && (
        <MatchResultDialog
          open={!!resultMatch}
          onClose={() => setResultMatch(null)}
          matchId={resultMatch.id}
          matchLabel={`${resultMatch.team.name} vs ${resultMatch.opponent?.name ?? resultMatch.opponentTeam?.name ?? "Avversario"} — ${format(new Date(resultMatch.date), "d MMM yyyy", { locale: it })}`}
          ourTeamName={resultMatch.team.name}
          theirTeamName={
            resultMatch.opponent?.name ?? resultMatch.opponentTeam?.name ?? "Avversario"
          }
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

// ──────────────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────────────

function EmptyState({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 6, textAlign: "center" }}>
      <EmojiEventsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
      <Typography variant="h6" color="text.secondary">
        Nessuna partita registrata
      </Typography>
      {disabled ? (
        <Typography variant="body2" color="text.disabled">
          Crea prima una squadra nella sezione Squadre.
        </Typography>
      ) : (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} sx={{ mt: 2 }}>
          Aggiungi partita
        </Button>
      )}
    </Paper>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Vista Campionato: raggruppata per girone, con sub-row di contesto per giornata
// ──────────────────────────────────────────────────────────────────────────────

type RouterLike = ReturnType<typeof useRouter>;

function LeagueView({
  matches,
  groupMatches,
  router,
  onResult,
  onEdit,
  onDelete,
  onGroupMatchSaved,
}: {
  matches: Match[];
  groupMatches: GroupMatch[];
  router: RouterLike;
  onResult: (m: Match) => void;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
  onGroupMatchSaved: (
    id: string,
    fields: { homeScore: number | null; awayScore: number | null }
  ) => void;
}) {
  // Raggruppamento per girone (matches con groupId noto). Le partite di
  // campionato senza girone finiscono in una sezione "Senza girone".
  const sections = useMemo(() => {
    const map = new Map<string, { groupId: string | null; groupName: string; rows: Match[] }>();
    for (const m of matches) {
      const key = m.groupId ?? "__nogroup__";
      const name = m.group?.name ?? "Senza girone";
      const existing = map.get(key);
      if (existing) existing.rows.push(m);
      else map.set(key, { groupId: m.groupId, groupName: name, rows: [m] });
    }
    // Ordina i match all'interno di ogni sezione per matchday asc, poi data asc
    for (const sec of map.values()) {
      sec.rows.sort((a, b) => {
        const ma = a.matchday ?? Infinity;
        const mb = b.matchday ?? Infinity;
        if (ma !== mb) return ma - mb;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }
    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [matches]);

  const groupMatchesByKey = useMemo(() => {
    const map = new Map<string, GroupMatch[]>();
    for (const gm of groupMatches) {
      if (gm.matchday === null) continue;
      const key = `${gm.groupId}:${gm.matchday}`;
      const arr = map.get(key) ?? [];
      arr.push(gm);
      map.set(key, arr);
    }
    return map;
  }, [groupMatches]);

  if (matches.length === 0) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.disabled">
          Nessuna partita di campionato.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {sections.map((sec) => (
        <Paper key={sec.groupId ?? "nogroup"} elevation={0} variant="outlined">
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              {sec.groupName}
            </Typography>
            {sec.groupId && (
              <Link
                href={`/admin/gironi/${sec.groupId}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Button size="small" startIcon={<OpenInNewIcon />} sx={{ fontSize: "0.72rem" }}>
                  Apri girone
                </Button>
              </Link>
            )}
          </Box>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 50 }}>G.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                  <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>
                    Squadra
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Avversario</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Esito
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
                {sec.rows.map((m) => {
                  const ctxKey = `${m.groupId}:${m.matchday}`;
                  const others =
                    m.matchday !== null
                      ? (groupMatchesByKey.get(ctxKey) ?? []).filter((g) => g.id !== "")
                      : [];
                  return (
                    <MatchRowAndContext
                      key={m.id}
                      match={m}
                      others={others}
                      router={router}
                      onResult={onResult}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onGroupMatchSaved={onGroupMatchSaved}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

function MatchRowAndContext({
  match,
  others,
  router,
  onResult,
  onEdit,
  onDelete,
  onGroupMatchSaved,
}: {
  match: Match;
  others: GroupMatch[];
  router: RouterLike;
  onResult: (m: Match) => void;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
  onGroupMatchSaved: (
    id: string,
    fields: { homeScore: number | null; awayScore: number | null }
  ) => void;
}) {
  const m = match;
  return (
    <>
      <TableRow hover>
        <TableCell>
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            {m.matchday ?? "—"}
          </Typography>
        </TableCell>
        <TableCell>
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
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {m.opponent?.name ?? m.opponentTeam?.name ?? "—"}
          </Typography>
          {m.opponent?.city && (
            <Typography variant="caption" color="text.secondary">
              {m.opponent.city}
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
          <Tooltip title={m.ourScore !== null ? "Modifica risultato" : "Inserisci risultato"}>
            <Button
              size="small"
              onClick={() => onResult(m)}
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
          <ActionIcons match={m} router={router} onEdit={onEdit} onDelete={onDelete} />
        </TableCell>
      </TableRow>
      {others.length > 0 && (
        <TableRow>
          <TableCell
            colSpan={8}
            sx={{
              py: 0.75,
              backgroundColor: "action.hover",
              borderBottom: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, fontSize: "0.7rem" }}
              >
                Giornata {m.matchday}:
              </Typography>
              {others.map((g) => (
                <Box
                  key={g.id}
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.72rem" }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.72rem" }}>
                    {g.homeTeam.name}
                  </Typography>
                  <GroupMatchInlineScore
                    groupId={g.groupId}
                    matchId={g.id}
                    homeName={g.homeTeam.name}
                    awayName={g.awayTeam.name}
                    homeScore={g.homeScore}
                    awayScore={g.awayScore}
                    onSaved={onGroupMatchSaved}
                  />
                  <Typography variant="caption" sx={{ fontSize: "0.72rem" }}>
                    {g.awayTeam.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Vista piatta: Amichevoli / Tornei
// ──────────────────────────────────────────────────────────────────────────────

function FlatView({
  matches,
  page,
  rpp,
  setPage,
  setRpp,
  router,
  onResult,
  onEdit,
  onDelete,
}: {
  matches: Match[];
  page: number;
  rpp: number;
  setPage: (n: number) => void;
  setRpp: (n: number) => void;
  router: RouterLike;
  onResult: (m: Match) => void;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
}) {
  if (matches.length === 0) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.disabled">
          Nessuna partita in questa categoria.
        </Typography>
      </Paper>
    );
  }
  return (
    <Paper elevation={0} variant="outlined" sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
            <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>
              Squadra
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Avversario</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">
              Esito
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
                <Tooltip title={m.ourScore !== null ? "Modifica risultato" : "Inserisci risultato"}>
                  <Button
                    size="small"
                    onClick={() => onResult(m)}
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
                <ActionIcons match={m} router={router} onEdit={onEdit} onDelete={onDelete} />
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
  );
}

function ActionIcons({
  match,
  router,
  onEdit,
  onDelete,
}: {
  match: Match;
  router: RouterLike;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <Tooltip title="Convocati">
        <IconButton
          size="small"
          color="primary"
          aria-label="Convocati partita"
          onClick={() => router.push(`/admin/partite/${match.id}/convocazioni`)}
        >
          <GroupsIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Statistiche giocatori">
        <IconButton
          size="small"
          color="primary"
          aria-label="Statistiche giocatori"
          onClick={() => router.push(`/admin/partite/${match.id}/statistiche`)}
        >
          <LeaderboardIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Modifica">
        <IconButton size="small" aria-label="Modifica partita" onClick={() => onEdit(match)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Elimina">
        <IconButton
          size="small"
          color="error"
          aria-label="Elimina partita"
          onClick={() => onDelete(match.id)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );
}
