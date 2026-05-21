import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Stack, Divider, Button } from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import Link from "next/link";
import type { Metadata } from "next";
import ClassificaInternaTable from "@/components/ClassificaInternaTable";
import type { PlayerStatRow } from "@/components/ClassificaInternaTable";
import GironeFullView from "@/components/GironeFullView";
import type { MatchdayBucket, OurMatchData, ExternalMatchData } from "@/components/GironeFullView";
import { getCurrentSeason } from "@/lib/seasonUtils";
import { computeStandings } from "@/lib/standings";

export const metadata: Metadata = {
  title: "Classifiche | Karibu Baskin",
  description: "Classifiche campionato e marcatori del Karibu Baskin di Montecchio Maggiore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

function groupsQuery(season: string) {
  return prisma.group.findMany({
    where: { season },
    include: {
      team: { select: { id: true, name: true, color: true, season: true } },
      matches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        select: {
          id: true,
          slug: true,
          date: true,
          matchday: true,
          isHome: true,
          ourScore: true,
          theirScore: true,
          result: true,
          opponent: { select: { id: true, name: true, slug: true } },
        },
      },
      groupMatches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        select: {
          id: true,
          date: true,
          matchday: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

type GroupWithData = Awaited<ReturnType<typeof groupsQuery>>[number];

function buildMatchdays(group: GroupWithData): MatchdayBucket[] {
  const map = new Map<number | null, MatchdayBucket>();

  function get(day: number | null): MatchdayBucket {
    if (!map.has(day)) map.set(day, { matchday: day, ours: [], external: [] });
    return map.get(day)!;
  }

  for (const m of group.matches) {
    const ours: OurMatchData = {
      id: m.id,
      slug: m.slug,
      date: m.date.toISOString(),
      matchday: m.matchday,
      isHome: m.isHome,
      ourScore: m.ourScore,
      theirScore: m.theirScore,
      result: m.result,
      opponent: m.opponent,
    };
    get(m.matchday).ours.push(ours);
  }

  for (const gm of group.groupMatches) {
    const ext: ExternalMatchData = {
      id: gm.id,
      date: gm.date ? gm.date.toISOString() : null,
      matchday: gm.matchday,
      homeScore: gm.homeScore,
      awayScore: gm.awayScore,
      homeTeam: gm.homeTeam,
      awayTeam: gm.awayTeam,
    };
    get(gm.matchday).external.push(ext);
  }

  return Array.from(map.values()).sort((a, b) => (a.matchday ?? 999) - (b.matchday ?? 999));
}

export default async function ClassifichePage({ searchParams }: Props) {
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null;

  const currentSeason = getCurrentSeason();
  const activeSeason = seasonFilter ?? currentSeason;

  const [currentGroups, groupSeasons, statSeasons, allStats] = await Promise.all([
    // Championship standings: always current season
    groupsQuery(currentSeason),
    // Stagioni con gironi (per classifica campionato)
    prisma.group.findMany({
      select: { season: true },
      distinct: ["season"],
      orderBy: { season: "desc" },
    }),
    // Stagioni con statistiche (per classifica interna marcatori — può includere
    // stagioni senza girone, es. tornei o amichevoli)
    prisma.competitiveTeam.findMany({
      where: { matches: { some: { playerStats: { some: {} } } } },
      select: { season: true },
      distinct: ["season"],
      orderBy: { season: "desc" },
    }),
    // Player stats for the selected season
    prisma.playerMatchStats.groupBy({
      by: ["userId"],
      where: {
        userId: { not: null },
        match: { team: { season: activeSeason } },
      },
      _sum: {
        points: true,
        twoPointers: true,
        threePointers: true,
        freeThrows: true,
        fouls: true,
        illegalFouls: true,
        shotsAttempted: true,
      },
      _count: { matchId: true },
    }),
  ]);

  const userIds = allStats.map((s) => s.userId!).filter(Boolean);
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            image: true,
            slug: true,
            sportRole: true,
            sportRoleVariant: true,
          },
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const statRows: PlayerStatRow[] = allStats
    .filter((s) => s.userId && userMap[s.userId])
    .map((s) => ({
      userId: s.userId!,
      name: userMap[s.userId!].name,
      image: userMap[s.userId!].image,
      slug: userMap[s.userId!].slug,
      sportRole: userMap[s.userId!].sportRole,
      sportRoleVariant: userMap[s.userId!].sportRoleVariant,
      matches: s._count.matchId,
      points: s._sum.points ?? 0,
      twoPointers: s._sum.twoPointers ?? 0,
      threePointers: s._sum.threePointers ?? 0,
      freeThrows: s._sum.freeThrows ?? 0,
      fouls: s._sum.fouls ?? 0,
      illegalFouls: s._sum.illegalFouls ?? 0,
      shotsAttempted: s._sum.shotsAttempted ?? 0,
    }));

  const availableSeasons = Array.from(
    new Set([...groupSeasons.map((s) => s.season), ...statSeasons.map((s) => s.season)])
  ).sort((a, b) => b.localeCompare(a));
  const hasStats = statRows.length > 0;
  const hasCurrentGroups = currentGroups.length > 0;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 5, md: 7 },
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <LeaderboardIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={700}
              sx={{ letterSpacing: "0.12em" }}
            >
              Classifiche
            </Typography>
          </Box>
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ fontSize: { xs: "1.9rem", md: "2.6rem" } }}
          >
            Stagione {currentSeason}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexWrap: "wrap" }}>
            <Link href="/risultati" style={{ textDecoration: "none" }}>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  borderColor: "rgba(255,255,255,0.3)",
                  fontSize: "0.78rem",
                  "&:hover": { borderColor: "rgba(255,255,255,0.6)" },
                }}
              >
                Tutti i risultati
              </Button>
            </Link>
            <Link href="/calendario" style={{ textDecoration: "none" }}>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  borderColor: "rgba(255,255,255,0.3)",
                  fontSize: "0.78rem",
                  "&:hover": { borderColor: "rgba(255,255,255,0.6)" },
                }}
              >
                Calendario
              </Button>
            </Link>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* ── Classifica campionato (sempre stagione corrente) ── */}
        {hasCurrentGroups && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <EmojiEventsIcon color="primary" />
              <Typography
                variant="overline"
                color="primary"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em" }}
              >
                Campionato
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
              Classifica campionato
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Stagione {currentSeason} — classifica e calendario per giornata
            </Typography>

            <Stack spacing={3}>
              {currentGroups.map((g) => {
                const standings = computeStandings(g.team, g.matches, g.groupMatches);
                const matchdays = buildMatchdays(g);
                return (
                  <GironeFullView
                    key={g.id}
                    groupName={g.name}
                    championship={g.championship}
                    teamName={g.team.name}
                    teamColor={g.team.color}
                    teamSeason={g.team.season}
                    standings={standings}
                    matchdays={matchdays}
                  />
                );
              })}
            </Stack>
          </Box>
        )}

        {/* ── Classifica interna (marcatori) ── */}
        {(hasStats || availableSeasons.length > 0) && (
          <>
            {hasCurrentGroups && <Divider sx={{ mb: 5 }} />}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <LeaderboardIcon color="primary" />
              <Typography
                variant="overline"
                color="primary"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em" }}
              >
                Marcatori
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
              Classifica interna
            </Typography>

            {/* Filtri stagione */}
            {availableSeasons.length > 0 && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3, alignItems: "center" }}>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  fontWeight={700}
                  sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Stagione:
                </Typography>
                {availableSeasons.map((s) => (
                  <Link
                    key={s}
                    href={`/classifiche?season=${encodeURIComponent(s)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Chip
                      label={s}
                      size="small"
                      variant={activeSeason === s ? "filled" : "outlined"}
                      color={activeSeason === s ? "primary" : "default"}
                      sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.72rem" }}
                    />
                  </Link>
                ))}
              </Box>
            )}

            {hasStats ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Dati relativi alla stagione <strong>{activeSeason}</strong>. Filtra per ruolo o
                  clicca sull&apos;intestazione per ordinare.
                </Typography>
                <ClassificaInternaTable rows={statRows} />
              </>
            ) : (
              <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  Nessun dato disponibile per la stagione {activeSeason}.
                </Typography>
              </Paper>
            )}
          </>
        )}

        {/* Nessun dato del tutto */}
        {!hasCurrentGroups && !hasStats && availableSeasons.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <LeaderboardIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessun dato disponibile per la stagione {currentSeason}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Le classifiche verranno aggiornate con l&apos;avanzare della stagione.
            </Typography>
          </Box>
        )}
      </Container>
    </>
  );
}
