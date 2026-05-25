import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Chip,
  Avatar,
  Stack,
  Divider,
  Tooltip,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import GroupsIcon from "@mui/icons-material/Groups";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import StarIcon from "@mui/icons-material/Star";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import PlaceIcon from "@mui/icons-material/Place";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { slugify } from "@/lib/slugUtils";
import type { Metadata } from "next";
import type { MatchResult } from "@prisma/client";

type Props = {
  params: Promise<{ season: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

/** "202526" → "2025-26" */
function parseSeasonParam(s: string): string {
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return s;
}

async function getTeam(season: string, slug: string) {
  const teams = await prisma.competitiveTeam.findMany({
    where: { season },
    include: {
      memberships: {
        orderBy: [{ isCaptain: "desc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              sportRole: true,
              sportRoleVariant: true,
              gender: true,
              slug: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              sportRole: true,
              sportRoleVariant: true,
              gender: true,
            },
          },
        },
      },
      matches: {
        orderBy: { date: "asc" },
        include: {
          opponent: { select: { id: true, name: true, city: true } },
          opponentTeam: { select: { id: true, name: true, color: true, season: true } },
          playerStats: {
            select: {
              id: true,
              points: true,
              twoPointers: true,
              threePointers: true,
              freeThrows: true,
              fouls: true,
              isLoan: true,
              user: { select: { id: true, name: true, image: true, slug: true } },
              child: { select: { id: true, name: true } },
            },
          },
        },
      },
      // Partite in cui questa squadra compare come avversaria interna
      // (amichevoli tra le nostre squadre): le includiamo e le specchiamo a runtime.
      opponentInMatches: {
        orderBy: { date: "asc" },
        include: {
          team: { select: { id: true, name: true, color: true, season: true } },
          opponent: { select: { id: true, name: true, city: true } },
          opponentTeam: { select: { id: true, name: true, color: true, season: true } },
          playerStats: {
            select: {
              id: true,
              points: true,
              twoPointers: true,
              threePointers: true,
              freeThrows: true,
              fouls: true,
              isLoan: true,
              user: { select: { id: true, name: true, image: true, slug: true } },
              child: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  return teams.find((t) => slugify(t.name) === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string; slug: string }>;
}): Promise<Metadata> {
  const { season, slug } = await params;
  const team = await getTeam(parseSeasonParam(season), slug);
  if (!team) return { title: "Squadra non trovata" };
  const title = `${team.name} — Stagione ${team.season} | Karibu Baskin`;
  const description = team.championship
    ? `${team.name} nel ${team.championship}. Roster, partite e statistiche della stagione ${team.season}.`
    : `Roster, partite e statistiche di ${team.name} — stagione ${team.season}.`;
  const url = `https://karibu-baskin.vercel.app/squadre/${season}/${slug}`;
  return {
    title,
    description,
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export const revalidate = 3600;

const RESULT_COLOR: Record<MatchResult, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const RESULT_FULL: Record<MatchResult, string> = {
  WIN: "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};
const MATCH_TYPE_LABEL = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
} as const;

function relativeLabel(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays > 1 && diffDays <= 6) {
    return format(date, "EEEE", { locale: it }).replace(/^./, (c) => c.toUpperCase());
  }
  if (diffDays < 0 && diffDays >= -6) {
    return format(date, "EEEE", { locale: it }).replace(/^./, (c) => c.toUpperCase());
  }
  return format(date, "d MMM", { locale: it });
}

export default async function TeamProfilePage({ params, searchParams }: Props) {
  const { season: seasonParam, slug } = await params;
  const sp = await searchParams;
  const includeFriendlies = sp.amichevoli === "1";
  const season = parseSeasonParam(seasonParam);
  const team = await getTeam(season, slug);
  if (!team) notFound();

  const now = new Date();
  const teamColor = team.color ?? "#E65100";

  // ── Unisci team.matches + opponentInMatches (specchiando le seconde) ──
  // Le partite in cui la squadra è opponentTeam (amichevoli interne contro un'altra
  // delle nostre squadre) sono memorizzate con punteggio dal punto di vista dell'altra.
  // Per farle apparire correttamente in questa pagina, le specchiamo:
  // - opponent = team.team (l'altra squadra interna, riformattata come "OpposingTeam-like")
  // - ourScore/theirScore scambiati
  // - result invertito
  // - isHome invertito
  // - playerStats vengono mantenute (perché si riferiscono ai giocatori reali, non al lato)
  const mirroredOpponentMatches = team.opponentInMatches.map((m) => {
    const invertedResult: MatchResult | null =
      m.result === "WIN" ? "LOSS" : m.result === "LOSS" ? "WIN" : m.result;
    return {
      id: m.id,
      slug: m.slug,
      date: m.date,
      isHome: !m.isHome,
      venue: m.venue,
      matchType: m.matchType,
      ourScore: m.theirScore,
      theirScore: m.ourScore,
      result: invertedResult,
      notes: m.notes,
      matchday: m.matchday,
      teamId: team.id,
      opponentId: null as string | null,
      opponentTeamId: m.teamId,
      // "opponent" simula la forma di OpposingTeam per il rendering
      opponent: { id: m.team.id, name: m.team.name, city: null as string | null },
      // opponentTeam riferito alla squadra avversaria (= m.team)
      opponentTeam: {
        id: m.team.id,
        name: m.team.name,
        color: m.team.color,
        season: m.team.season,
      },
      playerStats: m.playerStats,
      isMirrored: true as const,
    };
  });

  // Per team.matches: se è un'amichevole interna (opponentTeamId valorizzato),
  // sintetizza opponent dall'opponentTeam per uniformare la forma.
  const normalizedTeamMatches = team.matches.map((m) => ({
    ...m,
    opponent:
      m.opponent ??
      (m.opponentTeam
        ? { id: m.opponentTeam.id, name: m.opponentTeam.name, city: null as string | null }
        : { id: "", name: "Avversario", city: null as string | null }),
    isMirrored: false as const,
  }));

  const allMatches = [...normalizedTeamMatches, ...mirroredOpponentMatches].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Partite: prossima, future, giocate
  const upcomingMatches = allMatches.filter((m) => m.result === null && m.date >= now);
  const playedMatchesAll = allMatches.filter((m) => m.result !== null);
  // Per le statistiche: di default solo ufficiali (LEAGUE + TOURNAMENT).
  // Le amichevoli sono incluse solo se ?amichevoli=1
  const playedMatches = includeFriendlies
    ? playedMatchesAll
    : playedMatchesAll.filter((m) => m.matchType !== "FRIENDLY");
  const hasFriendlies = playedMatchesAll.some((m) => m.matchType === "FRIENDLY");
  const nextMatch = upcomingMatches[0] ?? null;
  // Risultati (per "Storico" mostra sempre tutto)
  const playedMatchesDesc = [...playedMatchesAll].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const wins = playedMatches.filter((m) => m.result === "WIN").length;
  const losses = playedMatches.filter((m) => m.result === "LOSS").length;
  const draws = playedMatches.filter((m) => m.result === "DRAW").length;
  const pointsFor = playedMatches.reduce((s, m) => s + (m.ourScore ?? 0), 0);
  const pointsAgainst = playedMatches.reduce((s, m) => s + (m.theirScore ?? 0), 0);
  const diff = pointsFor - pointsAgainst;

  // Per le statistiche di striscia uso lo stesso filtro applicato al record
  const playedForStats = [...playedMatches].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Striscia attuale: serie consecutiva di V/P/S a partire dalla più recente
  let streakResult: MatchResult | null = null;
  let streakCount = 0;
  for (const m of playedForStats) {
    if (!m.result) continue;
    if (streakResult === null) {
      streakResult = m.result;
      streakCount = 1;
    } else if (m.result === streakResult) {
      streakCount += 1;
    } else {
      break;
    }
  }
  // Miglior striscia di vittorie della stagione
  let bestWinStreak = 0;
  let curWinStreak = 0;
  for (const m of playedForStats) {
    if (m.result === "WIN") {
      curWinStreak += 1;
      if (curWinStreak > bestWinStreak) bestWinStreak = curWinStreak;
    } else {
      curWinStreak = 0;
    }
  }

  // Roster raggruppato per ruolo Baskin
  const membershipsByRole = new Map<number | "unassigned", typeof team.memberships>();
  for (const m of team.memberships) {
    const athlete = m.user ?? m.child;
    const role = athlete?.sportRole ?? "unassigned";
    if (!membershipsByRole.has(role)) membershipsByRole.set(role, []);
    membershipsByRole.get(role)!.push(m);
  }
  const sortedRoles = [1, 2, 3, 4, 5].filter((r) => membershipsByRole.has(r));
  if (membershipsByRole.has("unassigned")) sortedRoles.push(-1); // sentinella per ordinamento

  // Top scorer della stagione (solo membri della squadra, escludendo prestiti in entrata)
  const memberIds = new Set<string>();
  for (const m of team.memberships) {
    if (m.user) memberIds.add(`u:${m.user.id}`);
    if (m.child) memberIds.add(`c:${m.child.id}`);
  }
  type LeaderRow = {
    key: string;
    name: string;
    image: string | null;
    slug: string | null;
    points: number;
    twoPointers: number;
    threePointers: number;
    freeThrows: number;
    games: number;
  };
  const leaderMap = new Map<string, LeaderRow>();
  for (const match of playedMatches) {
    for (const ps of match.playerStats) {
      if (ps.isLoan) continue;
      const playerId = ps.user ? `u:${ps.user.id}` : ps.child ? `c:${ps.child.id}` : null;
      if (!playerId || !memberIds.has(playerId)) continue;
      const name = ps.user?.name ?? ps.child?.name ?? "—";
      const image = ps.user?.image ?? null;
      const linkSlug = ps.user?.slug ?? ps.user?.id ?? null;
      const existing = leaderMap.get(playerId);
      if (existing) {
        existing.points += ps.points;
        existing.twoPointers += ps.twoPointers;
        existing.threePointers += ps.threePointers;
        existing.freeThrows += ps.freeThrows;
        existing.games += 1;
      } else {
        leaderMap.set(playerId, {
          key: playerId,
          name,
          image,
          slug: linkSlug,
          points: ps.points,
          twoPointers: ps.twoPointers,
          threePointers: ps.threePointers,
          freeThrows: ps.freeThrows,
          games: 1,
        });
      }
    }
  }
  const leadersByPoints = Array.from(leaderMap.values())
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  const leaderByThrees = Array.from(leaderMap.values())
    .filter((r) => r.threePointers > 0)
    .sort((a, b) => b.threePointers - a.threePointers)[0];
  const leaderByFreeThrows = Array.from(leaderMap.values())
    .filter((r) => r.freeThrows > 0)
    .sort((a, b) => b.freeThrows - a.freeThrows)[0];

  return (
    <>
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: team.imageUrl
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${team.imageUrl})`
            : `linear-gradient(150deg, #1A1A1A 0%, #1A1A1A 35%, ${teamColor} 130%)`,
          backgroundSize: team.imageUrl ? "cover" : undefined,
          backgroundPosition: team.imageUrl ? "center" : undefined,
          color: "#fff",
          py: { xs: 5, md: 7 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Link href="/squadre" style={{ textDecoration: "none" }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#BDBDBD",
                  fontWeight: 600,
                  "&:hover": { color: "#fff" },
                }}
              >
                ← Squadre
              </Typography>
            </Link>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: { xs: 2, sm: 3 },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {/* Iniziale grande */}
            <Box
              sx={{
                width: { xs: 72, sm: 96 },
                height: { xs: 72, sm: 96 },
                borderRadius: "50%",
                bgcolor: teamColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
                border: "3px solid #2A2A2A",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "2.4rem", sm: "3.2rem" },
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                  textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {team.name[0].toUpperCase()}
              </Typography>
            </Box>

            {/* Info squadra */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Chip
                label={`Stagione ${team.season}`}
                size="small"
                sx={{
                  mb: 1,
                  fontWeight: 700,
                  bgcolor: teamColor,
                  color: "#fff",
                  fontSize: "0.7rem",
                }}
              />
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{ fontSize: { xs: "1.9rem", md: "2.6rem" }, lineHeight: 1.1 }}
              >
                {team.name}
              </Typography>
              {team.championship && (
                <Typography variant="body1" sx={{ color: "#E0E0E0", mt: 0.5, fontWeight: 500 }}>
                  {team.championship}
                </Typography>
              )}

              {/* Record stagione */}
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                {playedMatches.length > 0 && (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                        bgcolor: "#2E7D32",
                        px: 1.25,
                        py: 0.4,
                        borderRadius: 999,
                      }}
                    >
                      <Typography fontWeight={900} sx={{ color: "#fff", fontSize: "1rem" }}>
                        {wins}
                      </Typography>
                      <Typography
                        sx={{
                          color: "#fff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "lowercase",
                        }}
                      >
                        {wins === 1 ? "vittoria" : "vittorie"}
                      </Typography>
                    </Box>
                    {draws > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          bgcolor: "#E65100",
                          px: 1.25,
                          py: 0.4,
                          borderRadius: 999,
                        }}
                      >
                        <Typography fontWeight={900} sx={{ color: "#fff", fontSize: "1rem" }}>
                          {draws}
                        </Typography>
                        <Typography
                          sx={{
                            color: "#fff",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "lowercase",
                          }}
                        >
                          {draws === 1 ? "pareggio" : "pareggi"}
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                        bgcolor: "#C62828",
                        px: 1.25,
                        py: 0.4,
                        borderRadius: 999,
                      }}
                    >
                      <Typography fontWeight={900} sx={{ color: "#fff", fontSize: "1rem" }}>
                        {losses}
                      </Typography>
                      <Typography
                        sx={{
                          color: "#fff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "lowercase",
                        }}
                      >
                        {losses === 1 ? "sconfitta" : "sconfitte"}
                      </Typography>
                    </Box>
                  </>
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <GroupsIcon sx={{ fontSize: 16, color: "#fff" }} />
                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                    {team.memberships.length} {team.memberships.length === 1 ? "atleta" : "atleti"}
                  </Typography>
                </Box>
              </Box>

              {team.description && (
                <Typography variant="body2" sx={{ color: "#BDBDBD", mt: 2, maxWidth: 580 }}>
                  {team.description}
                </Typography>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* ── Prossima partita ───────────────────────────────────────────── */}
        {nextMatch &&
          (() => {
            // Precedente incontro tra le stesse squadre nella stessa stagione
            const previousMeeting = playedMatchesDesc.find(
              (p) => p.opponent.id === nextMatch.opponent.id
            );
            return (
              <NextMatchCard
                match={nextMatch}
                teamName={team.name}
                teamColor={teamColor}
                now={now}
                previousMeeting={previousMeeting ?? null}
              />
            );
          })()}

        {/* ── KPI: bilancio + diff + forma ───────────────────────────────── */}
        {playedMatches.length > 0 && (
          <Box sx={{ mb: 6, mt: nextMatch ? 4 : 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "flex-end" },
                justifyContent: "space-between",
                gap: 1,
                mb: 2.5,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: teamColor, fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  Statistiche
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                  Bilancio stagione
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
                  {includeFriendlies
                    ? "Tutte le partite (incluse amichevoli)"
                    : "Solo partite ufficiali"}
                </Typography>
              </Box>
              {hasFriendlies && (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Link
                    href={`/squadre/${seasonParam}/${slug}`}
                    style={{ textDecoration: "none" }}
                    scroll={false}
                  >
                    <Chip
                      label="Solo ufficiali"
                      size="small"
                      variant={!includeFriendlies ? "filled" : "outlined"}
                      color={!includeFriendlies ? "primary" : "default"}
                      sx={{ cursor: "pointer", fontWeight: 700, fontSize: "0.7rem" }}
                    />
                  </Link>
                  <Link
                    href={`/squadre/${seasonParam}/${slug}?amichevoli=1`}
                    style={{ textDecoration: "none" }}
                    scroll={false}
                  >
                    <Chip
                      label="Tutte"
                      size="small"
                      variant={includeFriendlies ? "filled" : "outlined"}
                      color={includeFriendlies ? "primary" : "default"}
                      sx={{ cursor: "pointer", fontWeight: 700, fontSize: "0.7rem" }}
                    />
                  </Link>
                </Box>
              )}
            </Box>

            <Grid container spacing={2}>
              {/* Differenza punti */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid rgba(0,0,0,0.07)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {diff > 0 ? (
                      <TrendingUpIcon sx={{ fontSize: 18, color: "#2E7D32" }} />
                    ) : diff < 0 ? (
                      <TrendingDownIcon sx={{ fontSize: 18, color: "#C62828" }} />
                    ) : (
                      <TrendingFlatIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                      }}
                    >
                      Differenza canestri
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                      color: diff > 0 ? "#2E7D32" : diff < 0 ? "#C62828" : "text.primary",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, mt: "auto" }}>
                    <Box>
                      <Typography variant="caption" color="text.disabled">
                        Fatti
                      </Typography>
                      <Typography fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {pointsFor}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.disabled">
                        Subiti
                      </Typography>
                      <Typography fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {pointsAgainst}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Media punti */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid rgba(0,0,0,0.07)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                    }}
                  >
                    Media a partita
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography
                      variant="h4"
                      fontWeight={900}
                      sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
                    >
                      {(pointsFor / playedMatches.length).toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      pt
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: "auto" }}>
                    su {playedMatches.length} partite
                  </Typography>
                </Paper>
              </Grid>

              {/* Striscia attuale */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid rgba(0,0,0,0.07)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                    }}
                  >
                    Striscia attuale
                  </Typography>
                  {streakResult ? (
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                      <Typography
                        variant="h4"
                        fontWeight={900}
                        sx={{
                          color: RESULT_COLOR[streakResult],
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {streakCount}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: RESULT_COLOR[streakResult],
                          fontWeight: 700,
                          textTransform: "lowercase",
                        }}
                      >
                        {streakResult === "WIN"
                          ? streakCount === 1
                            ? "vittoria"
                            : "vittorie"
                          : streakResult === "LOSS"
                            ? streakCount === 1
                              ? "sconfitta"
                              : "sconfitte"
                            : streakCount === 1
                              ? "pareggio"
                              : "pareggi"}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="h6" sx={{ color: "text.disabled", fontWeight: 700 }}>
                      —
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ mt: "auto" }}>
                    {bestWinStreak > 1
                      ? `Miglior serie: ${bestWinStreak} vittorie di fila`
                      : streakResult
                        ? "Consecutive"
                        : "Nessuna partita giocata"}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── Top scorer / Leaders ───────────────────────────────────────── */}
        {leadersByPoints.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <StarIcon sx={{ color: teamColor }} />
              <Typography
                variant="overline"
                sx={{ color: teamColor, fontWeight: 700, letterSpacing: "0.1em" }}
              >
                Leader
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 2.5 }}>
              Top scorer della stagione
            </Typography>

            <Grid container spacing={2}>
              {leadersByPoints.map((l, idx) => (
                <Grid key={l.key} size={{ xs: 12, sm: 4 }}>
                  <LeaderCard rank={idx + 1} leader={l} teamColor={teamColor} />
                </Grid>
              ))}
            </Grid>

            {(leaderByThrees || leaderByFreeThrows) && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {leaderByThrees && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <SubLeaderRow
                      icon={<SportsBasketballIcon sx={{ fontSize: 20, color: teamColor }} />}
                      label="Più triple"
                      leader={leaderByThrees}
                      value={leaderByThrees.threePointers}
                      suffix="da 3"
                    />
                  </Grid>
                )}
                {leaderByFreeThrows && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <SubLeaderRow
                      icon={<SportsBasketballIcon sx={{ fontSize: 20, color: teamColor }} />}
                      label="Più tiri liberi"
                      leader={leaderByFreeThrows}
                      value={leaderByFreeThrows.freeThrows}
                      suffix="liberi"
                    />
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        )}

        {/* ── Roster raggruppato per ruolo ───────────────────────────────── */}
        {team.memberships.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <GroupsIcon sx={{ color: teamColor }} />
                <Typography
                  variant="overline"
                  sx={{ color: teamColor, fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  Rosa
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                {team.memberships.length} {team.memberships.length === 1 ? "atleta" : "atleti"} in
                squadra
              </Typography>

              <Stack spacing={3}>
                {sortedRoles.map((role) => {
                  const key = role === -1 ? "unassigned" : role;
                  const members = membershipsByRole.get(key) ?? [];
                  if (members.length === 0) return null;
                  const isUnassigned = key === "unassigned";
                  const roleNum = isUnassigned ? null : (key as number);
                  return (
                    <Box key={String(key)}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                        {!isUnassigned && roleNum !== null && (
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              bgcolor: ROLE_COLORS[roleNum],
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              fontSize: "0.85rem",
                            }}
                          >
                            {roleNum}
                          </Box>
                        )}
                        <Typography
                          variant="subtitle1"
                          fontWeight={800}
                          sx={{ color: "text.primary" }}
                        >
                          {isUnassigned ? "Senza ruolo" : `Ruolo ${roleNum}`}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ fontWeight: 600 }}
                        >
                          ({members.length})
                        </Typography>
                      </Box>
                      <Grid container spacing={1.5}>
                        {members.map((m) => {
                          const athlete = m.user ?? m.child;
                          if (!athlete) return null;
                          const isUser = !!m.user;
                          return (
                            <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4 }}>
                              {isUser ? (
                                <Link
                                  href={`/giocatori/${m.user!.slug ?? m.user!.id}`}
                                  style={{ textDecoration: "none" }}
                                >
                                  <AthleteCard
                                    name={athlete.name ?? "—"}
                                    image={
                                      "image" in athlete ? (athlete.image ?? undefined) : undefined
                                    }
                                    roleNum={athlete.sportRole}
                                    roleVariant={athlete.sportRoleVariant}
                                    isCaptain={m.isCaptain}
                                    teamColor={teamColor}
                                  />
                                </Link>
                              ) : (
                                <AthleteCard
                                  name={athlete.name ?? "—"}
                                  roleNum={athlete.sportRole}
                                  roleVariant={athlete.sportRoleVariant}
                                  isCaptain={m.isCaptain}
                                  teamColor={teamColor}
                                />
                              )}
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </>
        )}

        {/* ── Risultati ──────────────────────────────────────────────────── */}
        {playedMatchesDesc.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <EmojiEventsIcon sx={{ color: teamColor }} />
                <Typography
                  variant="overline"
                  sx={{ color: teamColor, fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  Storico
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 2.5 }}>
                Risultati
              </Typography>
              <Stack spacing={1}>
                {playedMatchesDesc.map((m) => (
                  <PlayedMatchCard
                    key={m.id}
                    match={m}
                    teamName={team.name}
                    teamColor={teamColor}
                  />
                ))}
              </Stack>
            </Box>
          </>
        )}

        {/* ── Altre partite future (oltre alla prossima) ─────────────────── */}
        {upcomingMatches.length > 1 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CalendarTodayIcon sx={{ color: teamColor }} />
                <Typography
                  variant="overline"
                  sx={{ color: teamColor, fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  In programma
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 2.5 }}>
                Prossime partite
              </Typography>
              <Stack spacing={1}>
                {upcomingMatches.slice(1).map((m) => (
                  <UpcomingMatchRow
                    key={m.id}
                    match={m}
                    teamName={team.name}
                    teamColor={teamColor}
                    now={now}
                  />
                ))}
              </Stack>
            </Box>
          </>
        )}

        {/* Empty state */}
        {allMatches.length === 0 && team.memberships.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Stagione in preparazione
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Rosa e calendario verranno pubblicati a breve.
            </Typography>
          </Box>
        )}
      </Container>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

type AnyMatch = {
  id: string;
  slug: string | null;
  date: Date;
  isHome: boolean;
  matchType: "LEAGUE" | "TOURNAMENT" | "FRIENDLY";
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  venue: string | null;
  opponent: { id: string; name: string; city: string | null };
  /** true se la partita era originariamente memorizzata con questa squadra come
   * opponentTeam (amichevole interna vista da prospettiva avversaria, specchiata) */
  isMirrored?: boolean;
};

function NextMatchCard({
  match,
  teamName,
  teamColor,
  now,
  previousMeeting,
}: {
  match: AnyMatch;
  teamName: string;
  teamColor: string;
  now: Date;
  previousMeeting: AnyMatch | null;
}) {
  const imminentLimit = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const isImminent = match.date <= imminentLimit;

  // Countdown grossolano (server-side, no live update)
  const diffMs = match.date.getTime() - now.getTime();
  const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  // Etichetta countdown principale
  const isHomeMatch = match.isHome;
  const usName = teamName;
  const themName = match.opponent.name;

  const prev = previousMeeting;
  const prevOurScore = prev?.ourScore ?? null;
  const prevTheirScore = prev?.theirScore ?? null;

  return (
    <Link
      href={`/partite/${match.slug ?? match.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: `0 10px 32px ${teamColor}33`,
          },
        }}
      >
        {/* ── BANNER SCURO IN ALTO con tile calendario ─────────────────────── */}
        <Box
          sx={{
            background: `linear-gradient(120deg, #1A1A1A 0%, #1A1A1A 55%, ${teamColor} 135%)`,
            color: "#fff",
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 2.25 },
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: { xs: 2, md: 2.5 },
          }}
        >
          {/* Tile calendario "foglietto strappato" */}
          <Box
            sx={{
              flexShrink: 0,
              bgcolor: "#fff",
              borderRadius: 1.5,
              overflow: "hidden",
              minWidth: { xs: 64, md: 74 },
              textAlign: "center",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            }}
          >
            <Box
              sx={{
                bgcolor: teamColor,
                color: "#fff",
                px: 1,
                py: 0.4,
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {format(new Date(match.date), "EEE", { locale: it })}
            </Box>
            <Box sx={{ px: 1, py: 0.75 }}>
              <Typography
                sx={{
                  fontSize: { xs: "1.7rem", md: "2rem" },
                  fontWeight: 900,
                  color: "#1A1A1A",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {format(new Date(match.date), "d")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  color: "#757575",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  mt: 0.25,
                }}
              >
                {format(new Date(match.date), "MMM", { locale: it })}
              </Typography>
            </Box>
          </Box>

          {/* Info centrale */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flexWrap: "wrap",
                mb: 0.5,
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: teamColor,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  lineHeight: 1,
                }}
              >
                ★ Prossima partita
              </Typography>
              <Chip
                label={MATCH_TYPE_LABEL[match.matchType]}
                size="small"
                sx={{
                  bgcolor: "#fff",
                  color: "#1A1A1A",
                  fontWeight: 800,
                  fontSize: "0.6rem",
                  height: 18,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: { xs: "1rem", md: "1.15rem" },
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1.2,
              }}
            >
              {format(new Date(match.date), "EEEE d MMMM", { locale: it }).replace(/^./, (c) =>
                c.toUpperCase()
              )}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                mt: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                ⏱ {format(new Date(match.date), "HH:mm")}
              </Typography>
              <Typography sx={{ color: "#666", fontSize: "0.78rem" }}>·</Typography>
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: isImminent ? teamColor : "#BDBDBD",
                }}
              >
                {days === 0 && hours === 0
                  ? "In corso!"
                  : days === 0
                    ? `Mancano ${hours} ${hours === 1 ? "ora" : "ore"}`
                    : days === 1
                      ? `Domani${hours > 0 ? ` · ${hours}h` : ""}`
                      : `Mancano ${days} giorni`}
              </Typography>
              {isImminent && (
                <Chip
                  icon={<BoltIcon sx={{ fontSize: 12, color: "#fff !important" }} />}
                  label="Imminente"
                  size="small"
                  sx={{
                    bgcolor: teamColor,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.6rem",
                    height: 18,
                    letterSpacing: "0.04em",
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Badge casa/trasferta */}
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.4,
              bgcolor: isHomeMatch ? "#2E7D32" : "#1565C0",
              px: 1.5,
              py: 1,
              borderRadius: 1.5,
              minWidth: 64,
            }}
          >
            {isHomeMatch ? (
              <HomeIcon sx={{ fontSize: 18, color: "#fff" }} />
            ) : (
              <FlightIcon sx={{ fontSize: 18, color: "#fff" }} />
            )}
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 800,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {isHomeMatch ? "Casa" : "Trasferta"}
            </Typography>
          </Box>
        </Box>

        {/* ── CORPO: matchup tipo cartellone ───────────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "stretch",
            position: "relative",
            bgcolor: "background.paper",
          }}
        >
          {/* NOI */}
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              borderRight: `1px solid ${teamColor}22`,
              bgcolor: isHomeMatch ? `${teamColor}08` : "background.paper",
            }}
          >
            <Box
              sx={{
                width: { xs: 44, md: 54 },
                height: { xs: 44, md: 54 },
                borderRadius: "50%",
                bgcolor: teamColor,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: { xs: "1.4rem", md: "1.7rem" },
                boxShadow: `0 3px 10px ${teamColor}55`,
              }}
            >
              {usName[0]?.toUpperCase()}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: teamColor,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.6rem",
              }}
            >
              Karibu
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.95rem", md: "1.15rem" },
                fontWeight: 900,
                lineHeight: 1.15,
                textAlign: "center",
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {usName}
            </Typography>
          </Box>

          {/* VS centrale */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: { xs: 1, md: 1.5 },
              position: "relative",
            }}
          >
            <Box
              sx={{
                width: { xs: 36, md: 46 },
                height: { xs: 36, md: 46 },
                borderRadius: "50%",
                bgcolor: "#1A1A1A",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: { xs: "0.85rem", md: "1rem" },
                letterSpacing: "0.05em",
                border: `3px solid ${teamColor}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              VS
            </Box>
          </Box>

          {/* AVVERSARIO */}
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              borderLeft: "1px solid rgba(0,0,0,0.06)",
              bgcolor: !isHomeMatch ? "rgba(0,0,0,0.025)" : "background.paper",
            }}
          >
            <Box
              sx={{
                width: { xs: 44, md: 54 },
                height: { xs: 44, md: 54 },
                borderRadius: "50%",
                bgcolor: "#424242",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: { xs: "1.4rem", md: "1.7rem" },
                boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
              }}
            >
              {themName[0]?.toUpperCase()}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.6rem",
              }}
            >
              Avversario
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.95rem", md: "1.15rem" },
                fontWeight: 900,
                lineHeight: 1.15,
                textAlign: "center",
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {themName}
            </Typography>
            {match.opponent.city && (
              <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                {match.opponent.city}
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── FOOTER chiaro: venue + precedente incontro ─────────────────── */}
        {(match.venue || (prev && prevOurScore !== null && prevTheirScore !== null)) && (
          <Box
            sx={{
              bgcolor: "background.paper",
              borderTop: "1px solid rgba(0,0,0,0.06)",
              px: { xs: 2.5, md: 3.5 },
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {match.venue ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PlaceIcon sx={{ fontSize: 15, color: teamColor }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {match.venue}
                </Typography>
              </Box>
            ) : (
              <Box />
            )}

            {prev && prevOurScore !== null && prevTheirScore !== null && prev.result && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                    fontSize: "0.62rem",
                  }}
                >
                  Andata:
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    bgcolor: RESULT_COLOR[prev.result],
                    color: "#fff",
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontWeight: 800,
                    fontSize: "0.72rem",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: "0.62rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      opacity: 0.95,
                    }}
                  >
                    {prev.result === "WIN" ? "Vinta" : prev.result === "LOSS" ? "Persa" : "Pari"}
                  </Box>
                  <Box component="span" sx={{ opacity: 0.5, fontSize: "0.62rem" }}>
                    ·
                  </Box>
                  <Box
                    component="span"
                    sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.78rem" }}
                  >
                    {prev.isHome ? prevOurScore : prevTheirScore}–
                    {prev.isHome ? prevTheirScore : prevOurScore}
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                  {format(new Date(prev.date), "d MMM", { locale: it })}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Link>
  );
}

function PlayedMatchCard({
  match,
  teamName,
  teamColor: _teamColor,
}: {
  match: AnyMatch;
  teamName: string;
  teamColor: string;
}) {
  const leftName = match.isHome ? teamName : match.opponent.name;
  const rightName = match.isHome ? match.opponent.name : teamName;
  const leftScore = match.isHome ? match.ourScore : match.theirScore;
  const rightScore = match.isHome ? match.theirScore : match.ourScore;
  const leftIsUs = match.isHome;
  const res = match.result
    ? {
        color: RESULT_COLOR[match.result],
        bg: match.result === "WIN" ? "#E8F5E9" : match.result === "LOSS" ? "#FFEBEE" : "#FFF3E0",
        textColor:
          match.result === "WIN" ? "#2E7D32" : match.result === "LOSS" ? "#C62828" : "#E65100",
        full: RESULT_FULL[match.result],
      }
    : null;

  return (
    <Link href={`/partite/${match.slug ?? match.id}`} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid rgba(0,0,0,0.07)",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": {
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            borderColor: "rgba(0,0,0,0.15)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "stretch" }}>
          <Box sx={{ width: 5, flexShrink: 0, bgcolor: res?.color ?? "rgba(0,0,0,0.08)" }} />
          <Box
            sx={{
              flex: 1,
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ minWidth: 90, flexShrink: 0 }}>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                {format(new Date(match.date), "d MMM yyyy", { locale: it })}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mt: 0.2 }}>
                {match.isHome ? (
                  <HomeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                ) : (
                  <FlightIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                )}
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                  {match.isHome ? "Casa" : "Trasferta"} · {MATCH_TYPE_LABEL[match.matchType]}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                minWidth: 200,
                display: "flex",
                alignItems: "center",
                gap: 1,
                justifyContent: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: leftIsUs ? 800 : 600,
                  color: leftIsUs ? "text.primary" : "text.secondary",
                  textAlign: "right",
                  flex: "1 1 0",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {leftName}
              </Typography>
              {leftScore !== null && rightScore !== null ? (
                <Typography
                  fontWeight={900}
                  sx={{
                    fontSize: "1.15rem",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    flexShrink: 0,
                    px: 0.5,
                  }}
                >
                  {leftScore}–{rightScore}
                </Typography>
              ) : (
                <Typography sx={{ color: "text.disabled", fontWeight: 700, px: 0.5 }}>
                  vs
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: leftIsUs ? 600 : 800,
                  color: leftIsUs ? "text.secondary" : "text.primary",
                  textAlign: "left",
                  flex: "1 1 0",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {rightName}
              </Typography>
            </Box>
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
              {res && (
                <Chip
                  label={res.full}
                  size="small"
                  sx={{
                    bgcolor: res.bg,
                    color: res.textColor,
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    height: 22,
                  }}
                />
              )}
              <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Link>
  );
}

function UpcomingMatchRow({
  match,
  teamName,
  teamColor,
  now,
}: {
  match: AnyMatch;
  teamName: string;
  teamColor: string;
  now: Date;
}) {
  const leftName = match.isHome ? teamName : match.opponent.name;
  const rightName = match.isHome ? match.opponent.name : teamName;
  const leftIsUs = match.isHome;
  return (
    <Link href={`/partite/${match.slug ?? match.id}`} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: "1px solid rgba(0,0,0,0.07)",
          borderLeft: `4px solid ${teamColor}`,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          cursor: "pointer",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": {
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            borderColor: "rgba(0,0,0,0.15)",
          },
        }}
      >
        <Box sx={{ minWidth: 90, flexShrink: 0 }}>
          <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
            {relativeLabel(match.date, now)}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
            {format(new Date(match.date), "d MMM · HH:mm", { locale: it })}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 180,
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifyContent: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: leftIsUs ? 800 : 600,
              color: leftIsUs ? "text.primary" : "text.secondary",
              textAlign: "right",
              flex: "1 1 0",
              minWidth: 0,
            }}
          >
            {leftName}
          </Typography>
          <Typography sx={{ color: "text.disabled", fontWeight: 700, px: 0.5 }}>vs</Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: leftIsUs ? 600 : 800,
              color: leftIsUs ? "text.secondary" : "text.primary",
              textAlign: "left",
              flex: "1 1 0",
              minWidth: 0,
            }}
          >
            {rightName}
          </Typography>
        </Box>
        <Chip
          icon={match.isHome ? <HomeIcon /> : <FlightIcon />}
          label={match.isHome ? "Casa" : "Trasferta"}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.65rem", height: 22 }}
        />
        <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
      </Paper>
    </Link>
  );
}

function LeaderCard({
  rank,
  leader,
  teamColor,
}: {
  rank: number;
  leader: {
    name: string;
    image: string | null;
    slug: string | null;
    points: number;
    games: number;
  };
  teamColor: string;
}) {
  // 1° trofeo oro, 2° medaglia argento, 3° medaglia bronzo
  const medalColor = rank === 1 ? "#FFC107" : rank === 2 ? "#9E9E9E" : "#CD7F32";
  const medalGradient =
    rank === 1
      ? "linear-gradient(135deg, #FFD54F 0%, #FFA000 100%)"
      : rank === 2
        ? "linear-gradient(135deg, #E0E0E0 0%, #9E9E9E 100%)"
        : "linear-gradient(135deg, #D7A56B 0%, #8D6E63 100%)";
  const MedalIcon = rank === 1 ? EmojiEventsIcon : WorkspacePremiumIcon;
  const isFirst = rank === 1;

  const content = (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        pt: 2.5,
        border: "1px solid",
        borderColor: isFirst ? medalColor : "rgba(0,0,0,0.07)",
        boxShadow: isFirst ? `0 4px 16px ${medalColor}33` : "none",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.15s",
        "&:hover": { borderColor: teamColor, transform: "translateY(-2px)" },
      }}
    >
      {/* Medaglia/trofeo in alto a destra */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: medalGradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
          border: "2px solid #fff",
        }}
      >
        <MedalIcon sx={{ fontSize: 18, color: "#fff" }} />
      </Box>
      <Avatar
        src={leader.image ?? undefined}
        sx={{ width: 52, height: 52, bgcolor: teamColor, fontSize: 20, fontWeight: 800 }}
      >
        {leader.name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {leader.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 0.25 }}>
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ color: teamColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
          >
            {leader.points}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            pt
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
            · {(leader.points / leader.games).toFixed(1)}/partita
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
  return leader.slug ? (
    <Link href={`/giocatori/${leader.slug}`} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    content
  );
}

function SubLeaderRow({
  icon,
  label,
  leader,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  leader: { name: string; image: string | null; slug: string | null };
  value: number;
  suffix: string;
}) {
  const content = (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          bgcolor: "rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}
        >
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={700} noWrap>
          {leader.name} · {value} {suffix}
        </Typography>
      </Box>
    </Paper>
  );
  return leader.slug ? (
    <Link href={`/giocatori/${leader.slug}`} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    content
  );
}

function AthleteCard({
  name,
  image,
  roleNum,
  roleVariant,
  isCaptain,
  teamColor,
}: {
  name: string;
  image?: string;
  roleNum: number | null | undefined;
  roleVariant: string | null | undefined;
  isCaptain: boolean;
  teamColor: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        border: "1px solid rgba(0,0,0,0.07)",
        borderLeft: isCaptain ? `4px solid ${teamColor}` : "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        height: "100%",
        transition: "all 0.12s",
        "&:hover": { borderColor: teamColor, backgroundColor: `${teamColor}08` },
      }}
    >
      <Avatar
        src={image}
        sx={{
          width: 48,
          height: 48,
          bgcolor: teamColor,
          fontSize: 18,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {name[0].toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {name}
          </Typography>
          {isCaptain && (
            <Tooltip title="Capitano">
              <EmojiEventsIcon sx={{ fontSize: 15, color: "#F9A825", flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>
        {roleNum && (
          <Chip
            label={sportRoleLabel(roleNum, roleVariant ?? null)}
            size="small"
            sx={{
              mt: 0.4,
              bgcolor: ROLE_COLORS[roleNum],
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.65rem",
              height: 18,
            }}
          />
        )}
      </Box>
    </Paper>
  );
}
