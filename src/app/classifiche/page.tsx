import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Container, Typography, Box, Stack, Button } from "@mui/material";
import EmptyState from "@/components/common/EmptyState";
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import Link from "next/link";
import type { Metadata } from "next";
import GironeFullView from "@/components/teams/GironeFullView";
import type {
  MatchdayBucket,
  OurMatchData,
  ExternalMatchData,
} from "@/components/teams/GironeFullView";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import { computeStandings } from "@/lib/season/standings";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Classifiche",
  description: "Classifica di campionato del Karibu Baskin di Montecchio Maggiore.",
  path: "/classifiche",
});

export const revalidate = 3600;

function groupsQuery(season: string) {
  return prisma.group.findMany({
    where: { season },
    include: {
      competitiveTeams: {
        include: {
          competitiveTeam: { select: { id: true, name: true, color: true, season: true } },
        },
      },
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
          teamId: true,
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
      teamId: m.teamId,
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

export default async function ClassifichePage() {
  const t = await getTranslations("standings");
  const currentSeason = getCurrentSeason();
  const currentGroups = await groupsQuery(currentSeason);
  const hasCurrentGroups = currentGroups.length > 0;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <PageHero py={{ xs: 5, md: 7 }} align="left">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <EmojiEventsIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={700}
            sx={{ letterSpacing: "0.12em" }}
          >
            {t("leagueChip")}
          </Typography>
        </Box>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={800}
          sx={{ fontSize: { xs: "1.9rem", md: "2.6rem" } }}
        >
          {t("seasonValue", { season: currentSeason })}
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexWrap: "wrap" }}>
          <Link href="/marcatori" style={{ textDecoration: "none" }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LeaderboardIcon />}
              sx={{
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                fontSize: "0.78rem",
                "&:hover": { borderColor: "rgba(255,255,255,0.6)" },
              }}
            >
              {t("linkScorers")}
            </Button>
          </Link>
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
              {t("linkResults")}
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
              {t("linkCalendar")}
            </Button>
          </Link>
        </Box>
      </PageHero>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {hasCurrentGroups ? (
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
              {t("standingsTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("standingsDesc", { season: currentSeason })}
            </Typography>

            <Stack spacing={3}>
              {currentGroups.map((g) => {
                const ourTeams = g.competitiveTeams.map((gct) => gct.competitiveTeam);
                const standings = computeStandings(ourTeams, g.matches, g.groupMatches);
                const matchdays = buildMatchdays(g);
                return (
                  <GironeFullView
                    key={g.id}
                    groupName={g.name}
                    championship={g.championship}
                    ourTeams={ourTeams}
                    season={g.season}
                    standings={standings}
                    matchdays={matchdays}
                  />
                );
              })}
            </Stack>
          </Box>
        ) : (
          <EmptyState
            icon={<EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("noGroups", { season: currentSeason })}
            message={t("noGroupsDesc")}
          />
        )}
      </Container>
    </>
  );
}
