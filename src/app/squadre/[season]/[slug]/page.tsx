import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Chip,
  Stack,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SiteHeader from "@/components/layout/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import StarIcon from "@mui/icons-material/Star";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import Link from "next/link";
import { ROLE_COLORS } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import { slugify } from "@/lib/slugUtils";
import type { Metadata } from "next";
import type { MatchResult } from "@prisma/client";
import UpcomingMatchRow from "@/components/matches/UpcomingMatchRow";
import { MATCH_RESULT_META } from "@/lib/matchResults";
import type { AnyMatch } from "./_components/types";
import NextMatchCard from "./_components/NextMatchCard";
import PlayedMatchCard from "./_components/PlayedMatchCard";
import LeaderCard from "./_components/LeaderCard";
import SubLeaderRow from "./_components/SubLeaderRow";
import AthleteCard from "./_components/AthleteCard";

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
              slug: true,
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
              child: { select: { id: true, name: true, slug: true } },
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
              child: { select: { id: true, name: true, slug: true } },
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

export default async function TeamProfilePage({ params, searchParams }: Props) {
  const { season: seasonParam, slug } = await params;
  const sp = await searchParams;
  const includeFriendlies = sp.amichevoli === "1";
  const season = parseSeasonParam(seasonParam);
  const team = await getTeam(season, slug);
  if (!team) notFound();

  const t = await getTranslations("teams");

  const now = new Date();
  const teamColor = team.color ?? "#E65100";

  // Unisci team.matches + opponentInMatches (specchiando le seconde)
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
      const linkSlug = ps.user?.slug ?? ps.user?.id ?? ps.child?.slug ?? ps.child?.id ?? null;
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

      <Box
        style={{
          backgroundImage: team.imageUrl
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${team.imageUrl})`
            : `linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, ${teamColor} 130%)`,
          backgroundSize: team.imageUrl ? "cover" : undefined,
          backgroundPosition: team.imageUrl ? "center" : undefined,
        }}
        sx={{
          color: "#fff",
          py: { xs: 5, md: 7 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Sfere decorative */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            backgroundColor: alpha("#E65100", 0.1),
            pointerEvents: "none",
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            backgroundColor: alpha("#E65100", 0.06),
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            top: { xs: 12, md: 16 },
            left: { xs: 12, md: 20 },
            right: { xs: 60, md: 80 },
            zIndex: 2,
          }}
        >
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" },
            }}
          >
            <MuiLink
              href="/squadre"
              underline="hover"
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.65)",
                fontWeight: 500,
                "&:hover": { color: "#fff" },
              }}
            >
              {t("teamBreadcrumb")}
            </MuiLink>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
              {team.name}
            </Typography>
          </Breadcrumbs>
        </Box>

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
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
                  color: contrastText(teamColor),
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
                  color: contrastText(teamColor),
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
                        bgcolor: "match.win",
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
                          bgcolor: "match.draw",
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
                        bgcolor: "match.loss",
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
                    {t("athleteCount", { count: team.memberships.length })}
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
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                  {t("seasonBalance")}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
                  {includeFriendlies ? t("filterAll") : t("filterOfficial")}
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
                      label={t("filterOfficialShort")}
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
                      label={t("filterAllShort")}
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
                    border: "1px solid",
                    borderColor: "divider",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {diff > 0 ? (
                      <TrendingUpIcon sx={{ fontSize: 18, color: "match.win" }} />
                    ) : diff < 0 ? (
                      <TrendingDownIcon sx={{ fontSize: 18, color: "match.loss" }} />
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
                      {t("statDiff")}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                      color: diff > 0 ? "match.win" : diff < 0 ? "match.loss" : "text.primary",
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
                        {t("statScored")}
                      </Typography>
                      <Typography fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {pointsFor}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.disabled">
                        {t("statConceded")}
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
                    border: "1px solid",
                    borderColor: "divider",
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
                    {t("statAvg")}
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
                    {t("statMatches", { count: playedMatches.length })}
                  </Typography>
                </Paper>
              </Grid>

              {/* Striscia attuale */}
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
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
                    {t("statStreak")}
                  </Typography>
                  {streakResult ? (
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                      <Typography
                        variant="h4"
                        fontWeight={900}
                        sx={{
                          color: MATCH_RESULT_META[streakResult].color,
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {streakCount}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: MATCH_RESULT_META[streakResult].color,
                          fontWeight: 700,
                          textTransform: "lowercase",
                        }}
                      >
                        {streakResult === "WIN"
                          ? t("streakWins", { count: streakCount })
                          : streakResult === "LOSS"
                            ? t("streakLosses", { count: streakCount })
                            : t("streakDraws", { count: streakCount })}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="h6" sx={{ color: "text.disabled", fontWeight: 700 }}>
                      —
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ mt: "auto" }}>
                    {bestWinStreak > 1
                      ? t("statBestStreak", { count: bestWinStreak })
                      : streakResult
                        ? t("consecutive")
                        : t("noMatchesPlayed")}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {leadersByPoints.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <StarIcon sx={{ color: teamColor }} />
              <Typography
                variant="overline"
                sx={{ color: teamColor, fontWeight: 700, letterSpacing: "0.1em" }}
              >
                {t("leaders")}
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 2.5 }}>
              {t("topScorer")}
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
                      label={t("mostThrees")}
                      leader={leaderByThrees}
                      value={leaderByThrees.threePointers}
                      suffix={t("threeUnit")}
                    />
                  </Grid>
                )}
                {leaderByFreeThrows && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <SubLeaderRow
                      icon={<SportsBasketballIcon sx={{ fontSize: 20, color: teamColor }} />}
                      label={t("mostFreeThrows")}
                      leader={leaderByFreeThrows}
                      value={leaderByFreeThrows.freeThrows}
                      suffix={t("freeThrowUnit")}
                    />
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        )}

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
                  {t("rosterSection")}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                {t("rosterCount", { count: team.memberships.length })}
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
                          {isUnassigned ? t("noRole") : `Ruolo ${roleNum}`}
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
                                <Link
                                  href={`/giocatori/${m.child!.slug ?? m.child!.id}`}
                                  style={{ textDecoration: "none" }}
                                >
                                  <AthleteCard
                                    name={athlete.name ?? "—"}
                                    roleNum={athlete.sportRole}
                                    roleVariant={athlete.sportRoleVariant}
                                    isCaptain={m.isCaptain}
                                    teamColor={teamColor}
                                  />
                                </Link>
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
                  {t("historySection")}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 2.5 }}>
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
                  {t("upcomingSection")}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 2.5 }}>
                {t("upcomingMatches")}
              </Typography>
              <Stack spacing={1}>
                {upcomingMatches.slice(1).map((m) => (
                  <UpcomingMatchRow
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

        {/* Empty state */}
        {allMatches.length === 0 && team.memberships.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {t("seasonPreparing")}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              {t("seasonPreparingDesc")}
            </Typography>
          </Box>
        )}
      </Container>
    </>
  );
}
