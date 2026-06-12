"use client";

import {
  Alert,
  AlertTitle,
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
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SportsMartialArtsIcon from "@mui/icons-material/SportsMartialArts";
import type { MatchCoverage } from "@/lib/matchCoverage";
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
} from "@/components/matches/MatchFormDialog";
import MatchResultDialog, {
  type MatchResultSavedFields,
} from "@/components/matches/MatchResultDialog";
import GroupMatchInlineScore from "@/components/teams/GroupMatchInlineScore";
import OpponentProfileDialog from "@/components/matches/OpponentProfileDialog";
import type { OpponentProfile } from "@/lib/schemas/match";

type Team = MatchFormTeam;
type OpposingTeam = MatchFormOpposingTeam & { ratingMu?: number | null };
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
  opponentProfile?: unknown; // Prisma.JsonValue — castato a OpponentProfile dove serve
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
  /** Mappa matchId → copertura ruoli (solo partite future) */
  coverages: Record<string, MatchCoverage>;
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

function MatchMobileCard({
  match,
  matchday,
  coverage,
  router,
  onResult,
  onEdit,
  onDelete,
  onProfile,
}: {
  match: Match;
  matchday?: number | null;
  coverage?: MatchCoverage;
  router: RouterLike;
  onResult: (m: Match) => void;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
  onProfile: (m: Match) => void;
}) {
  const m = match;
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.25 }}
          >
            {matchday != null && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ fontSize: "0.68rem" }}
              >
                G.{matchday}
              </Typography>
            )}
            <Typography variant="body2" fontWeight={700}>
              {m.opponent?.name ?? m.opponentTeam?.name ?? "—"}
            </Typography>
            <CoverageWarningIcon coverage={coverage} />
            {m.opponentTeam && (
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "primary.main", fontWeight: 700, fontSize: "0.68rem" }}
              >
                (interna)
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
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
            {m.result && (
              <Chip
                label={RESULT_LABELS[m.result]}
                size="small"
                sx={{
                  backgroundColor: RESULT_COLORS[m.result],
                  color: "common.white",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  height: 20,
                }}
              />
            )}
            <Tooltip title={m.ourScore !== null ? "Modifica risultato" : "Inserisci risultato"}>
              <Button
                size="small"
                onClick={() => onResult(m)}
                sx={{
                  minWidth: 0,
                  px: 1,
                  py: 0,
                  textTransform: "none",
                  color: m.ourScore !== null ? "text.primary" : "primary.main",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                }}
              >
                {m.ourScore !== null && m.theirScore !== null
                  ? `${m.ourScore} – ${m.theirScore}`
                  : "+ Risultato"}
              </Button>
            </Tooltip>
            {m.ourScore !== null && m._count.playerStats === 0 && (
              <MissingStatsChip matchId={m.id} router={router} />
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
          <Tooltip title="Convocati">
            <IconButton
              size="medium"
              color="primary"
              aria-label="Convocati partita"
              onClick={() => router.push(`/admin/partite/${m.id}/convocazioni`)}
            >
              <GroupsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {m.result && m.opponentId && (
            <Tooltip
              title={m.opponentProfile ? "Modifica profilo avversario" : "Profila avversario"}
            >
              <IconButton
                size="medium"
                color={m.opponentProfile ? "primary" : "default"}
                aria-label="Profila avversario"
                onClick={() => onProfile(m)}
              >
                <SportsMartialArtsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Modifica">
            <IconButton size="medium" aria-label="Modifica partita" onClick={() => onEdit(m)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Elimina">
            <IconButton
              size="medium"
              color="error"
              aria-label="Elimina partita"
              onClick={() => onDelete(m.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

/** Chip per partite giocate senza statistiche giocatori — clicca per inserirle. */
function MissingStatsChip({ matchId, router }: { matchId: string; router: RouterLike }) {
  return (
    <Tooltip title="Partita giocata senza statistiche giocatori — clicca per inserirle">
      <Chip
        label="Senza stats"
        size="small"
        color="warning"
        variant="outlined"
        onClick={() => router.push(`/admin/partite/${matchId}/statistiche`)}
        sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20, cursor: "pointer" }}
      />
    </Tooltip>
  );
}

type TabKey = "LEAGUE" | "FRIENDLY" | "TOURNAMENT";

const TAB_LABELS: Record<TabKey, string> = {
  LEAGUE: "Campionato",
  FRIENDLY: "Amichevoli",
  TOURNAMENT: "Tornei",
};

function CoverageWarningIcon({ coverage }: { coverage: MatchCoverage | undefined }) {
  if (!coverage || !coverage.hasShortfall) return null;
  const shortfalls = coverage.perGroup.filter((r) => r.shortfall > 0);
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            Copertura ruoli insufficiente
          </Typography>
          {shortfalls.map((r) => (
            <Typography key={r.groupKey} variant="caption" sx={{ display: "block" }}>
              {r.label}: {r.available}/{r.required} disponibili
            </Typography>
          ))}
        </Box>
      }
    >
      <WarningAmberIcon sx={{ fontSize: 16, color: "warning.main", ml: 0.5 }} />
    </Tooltip>
  );
}

export default function AdminPartiteClient({
  teams,
  opposingTeams: initialOpponents,
  matches: initialMatches,
  groups,
  groupMatches: initialGroupMatches,
  coverages,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState(initialMatches);
  const [groupMatches, setGroupMatches] = useState(initialGroupMatches);
  const [opponents, setOpponents] = useState(initialOpponents);
  const [matchDialog, setMatchDialog] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [profileMatch, setProfileMatch] = useState<Match | null>(null);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const match = matches.find((m) => m.id === matchId);
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...fields } : m)));
    showToast({ message: "Risultato aggiornato", severity: "success" });
    // Partita giocata senza statistiche → proponi subito l'inserimento
    if (fields.ourScore !== null && match && match._count.playerStats === 0) {
      openConfirm(
        "Statistiche giocatori",
        "Risultato salvato. Vuoi inserire ora le statistiche dei giocatori?",
        () => router.push(`/admin/partite/${matchId}/statistiche`),
        { confirmLabel: "Inserisci statistiche", confirmColor: "primary" }
      );
    }
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

  function handleProfileSaved(profile: OpponentProfile, newOpponentMu: number | null) {
    if (!profileMatch) return;
    setMatches((prev) =>
      prev.map((m) =>
        m.id === profileMatch.id
          ? {
              ...m,
              opponentProfile: profile,
              opponent: m.opponent ? { ...m.opponent, ratingMu: newOpponentMu } : null,
            }
          : m
      )
    );
  }

  const matchesWithShortfall = useMemo(
    () =>
      matches
        .filter((m) => coverages[m.id]?.hasShortfall)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [matches, coverages]
  );

  return (
    <Box>
      {matchesWithShortfall.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>
            Copertura ruoli insufficiente — {matchesWithShortfall.length} partit
            {matchesWithShortfall.length === 1 ? "a" : "e"}
          </AlertTitle>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {matchesWithShortfall.slice(0, 5).map((m) => {
              const cov = coverages[m.id]!;
              const detail = cov.perGroup
                .filter((r) => r.shortfall > 0)
                .map((r) => `${r.label}: ${r.available}/${r.required}`)
                .join(" · ");
              return (
                <Typography key={m.id} variant="body2">
                  <strong>{format(new Date(m.date), "d MMM", { locale: it })}</strong> vs{" "}
                  {m.opponent?.name ?? m.opponentTeam?.name ?? "—"} — {detail}
                </Typography>
              );
            })}
            {matchesWithShortfall.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                + altre {matchesWithShortfall.length - 5}
              </Typography>
            )}
          </Stack>
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
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
          coverages={coverages}
          router={router}
          onResult={(m) => setResultMatch(m)}
          onEdit={openEdit}
          onDelete={handleDeleteMatch}
          onProfile={(m) => setProfileMatch(m)}
          onGroupMatchSaved={handleGroupMatchSaved}
        />
      ) : (
        <FlatView
          matches={filteredMatches}
          coverages={coverages}
          page={page}
          rpp={rpp}
          setPage={setPage}
          setRpp={setRpp}
          router={router}
          onResult={(m) => setResultMatch(m)}
          onEdit={openEdit}
          onDelete={handleDeleteMatch}
          onProfile={(m) => setProfileMatch(m)}
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

      {profileMatch && profileMatch.opponentId && (
        <OpponentProfileDialog
          open={!!profileMatch}
          onClose={() => setProfileMatch(null)}
          matchId={profileMatch.id}
          opponentId={profileMatch.opponentId}
          opponentName={profileMatch.opponent?.name ?? "Avversario"}
          opponentRatingMu={profileMatch.opponent?.ratingMu ?? null}
          currentProfile={(profileMatch.opponentProfile as OpponentProfile) ?? null}
          onSaved={handleProfileSaved}
        />
      )}

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
  coverages,
  router,
  onResult,
  onEdit,
  onDelete,
  onProfile,
  onGroupMatchSaved,
}: {
  matches: Match[];
  groupMatches: GroupMatch[];
  coverages: Record<string, MatchCoverage>;
  router: RouterLike;
  onResult: (m: Match) => void;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
  onProfile: (m: Match) => void;
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
          {/* Desktop table */}
          <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
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
                      coverage={coverages[m.id]}
                      router={router}
                      onResult={onResult}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onProfile={onProfile}
                      onGroupMatchSaved={onGroupMatchSaved}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          {/* Mobile card view */}
          <Box sx={{ display: { xs: "block", sm: "none" } }}>
            {sec.rows.map((m) => (
              <MatchMobileCard
                key={m.id}
                match={m}
                matchday={m.matchday}
                coverage={coverages[m.id]}
                router={router}
                onResult={onResult}
                onEdit={onEdit}
                onDelete={onDelete}
                onProfile={onProfile}
              />
            ))}
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

function MatchRowAndContext({
  match,
  others,
  coverage,
  router,
  onResult,
  onEdit,
  onDelete,
  onProfile,
  onGroupMatchSaved,
}: {
  match: Match;
  others: GroupMatch[];
  coverage: MatchCoverage | undefined;
  router: RouterLike;
  onResult: (m: Match) => void;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
  onProfile: (m: Match) => void;
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
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2" fontWeight={600}>
              {m.opponent?.name ?? m.opponentTeam?.name ?? "—"}
            </Typography>
            <CoverageWarningIcon coverage={coverage} />
          </Box>
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
          {m.ourScore !== null && m._count.playerStats === 0 ? (
            <MissingStatsChip matchId={m.id} router={router} />
          ) : (
            <Typography
              variant="caption"
              color={m._count.playerStats > 0 ? "primary" : "text.disabled"}
            >
              {m._count.playerStats > 0 ? `${m._count.playerStats} gioc.` : "—"}
            </Typography>
          )}
        </TableCell>
        <TableCell align="right">
          <ActionIcons
            match={m}
            router={router}
            onEdit={onEdit}
            onDelete={onDelete}
            onProfile={onProfile}
          />
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
  coverages,
  page,
  rpp,
  setPage,
  setRpp,
  router,
  onResult,
  onEdit,
  onDelete,
  onProfile,
}: {
  matches: Match[];
  coverages: Record<string, MatchCoverage>;
  page: number;
  rpp: number;
  setPage: (n: number) => void;
  setRpp: (n: number) => void;
  router: RouterLike;
  onResult: (m: Match) => void;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
  onProfile: (m: Match) => void;
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
  const paginatedMatches = matches.slice(page * rpp, (page + 1) * rpp);
  return (
    <Paper elevation={0} variant="outlined">
      {/* Desktop table */}
      <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
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
            {paginatedMatches.map((m) => (
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
                  <Box sx={{ display: "flex", alignItems: "center" }}>
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
                    <CoverageWarningIcon coverage={coverages[m.id]} />
                  </Box>
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
                  <Tooltip
                    title={m.ourScore !== null ? "Modifica risultato" : "Inserisci risultato"}
                  >
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
                  {m.ourScore !== null && m._count.playerStats === 0 ? (
                    <MissingStatsChip matchId={m.id} router={router} />
                  ) : (
                    <Typography
                      variant="caption"
                      color={m._count.playerStats > 0 ? "primary" : "text.disabled"}
                    >
                      {m._count.playerStats > 0 ? `${m._count.playerStats} gioc.` : "—"}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <ActionIcons
                    match={m}
                    router={router}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onProfile={onProfile}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {/* Mobile card view */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        {paginatedMatches.map((m) => (
          <MatchMobileCard
            key={m.id}
            match={m}
            coverage={coverages[m.id]}
            router={router}
            onResult={onResult}
            onEdit={onEdit}
            onDelete={onDelete}
            onProfile={onProfile}
          />
        ))}
      </Box>
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
        sx={{ borderTop: "1px solid", borderColor: "divider" }}
      />
    </Paper>
  );
}

function ActionIcons({
  match,
  router,
  onEdit,
  onDelete,
  onProfile,
}: {
  match: Match;
  router: RouterLike;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
  onProfile: (m: Match) => void;
}) {
  return (
    <>
      <Tooltip title="Convocati">
        <IconButton
          size="medium"
          color="primary"
          aria-label="Convocati partita"
          onClick={() => router.push(`/admin/partite/${match.id}/convocazioni`)}
        >
          <GroupsIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Statistiche giocatori">
        <IconButton
          size="medium"
          color="primary"
          aria-label="Statistiche giocatori"
          onClick={() => router.push(`/admin/partite/${match.id}/statistiche`)}
        >
          <LeaderboardIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {match.result && match.opponentId && (
        <Tooltip
          title={match.opponentProfile ? "Modifica profilo avversario" : "Profila avversario"}
        >
          <IconButton
            size="medium"
            color={match.opponentProfile ? "primary" : "default"}
            aria-label="Profila avversario"
            onClick={() => onProfile(match)}
          >
            <SportsMartialArtsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Modifica">
        <IconButton size="medium" aria-label="Modifica partita" onClick={() => onEdit(match)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Elimina">
        <IconButton
          size="medium"
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
