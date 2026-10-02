import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Container, Stack } from "@mui/material";
import EmptyState from "@/components/common/EmptyState";
import PageHero from "@/components/common/PageHero";
import SeasonSelector from "@/components/common/SeasonSelector";
import MatchesSectionNav from "@/components/matches/MatchesSectionNav";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type { Metadata } from "next";
import GironeFullView from "@/components/teams/GironeFullView";
import type {
  MatchdayBucket,
  OurMatchData,
  ExternalMatchData,
} from "@/components/teams/GironeFullView";
import { getActiveSeason } from "@/lib/season/activeSeason";
import { parseSeasonParam } from "@/lib/season/seasonUtils";
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

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ClassifichePage({ searchParams }: Props) {
  const [sp, t, { activeSeason, displaySeason, isFallback, seasons }] = await Promise.all([
    searchParams,
    getTranslations("standings"),
    getActiveSeason("groups"),
  ]);
  const chosenSeason = parseSeasonParam(sp.season);
  const season = chosenSeason ?? displaySeason;
  // La riga di ricaduta si mostra solo quando la stagione non è stata scelta a mano.
  const showFallbackNotice = !chosenSeason && isFallback;
  // Una stagione chiesta a mano (per esempio arrivando da Risultati) e senza
  // gironi resta fra i chip: si vede dove ci si trova e come tornare indietro.
  const chipSeasons = seasons.includes(season)
    ? seasons
    : [...seasons, season].sort((a, b) => b.localeCompare(a));
  const groups = await groupsQuery(season);

  return (
    <>
      <PageHero
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        nav={<MatchesSectionNav current="standings" season={chosenSeason} />}
      />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <SeasonSelector
          seasons={chipSeasons}
          current={season}
          basePath="/classifiche"
          notice={showFallbackNotice ? { active: activeSeason, shown: displaySeason } : null}
        />

        {groups.length > 0 ? (
          <Stack spacing={3}>
            {groups.map((g) => {
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
        ) : (
          <EmptyState
            icon={<EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("noGroups", { season })}
            message={t("noGroupsDesc")}
          />
        )}
      </Container>
    </>
  );
}
