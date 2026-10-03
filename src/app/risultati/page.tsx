import { prisma } from "@/lib/db";
import TeamSectionHeader from "@/components/teams/TeamSectionHeader";
import { RADIUS } from "@/lib/radius";
import { Container, Box, Chip, Stack } from "@mui/material";
import { columnSx } from "@/lib/layout";
import PlayedMatchRow from "@/components/matches/PlayedMatchRow";
import PageHero from "@/components/common/PageHero";
import SeasonSelector from "@/components/common/SeasonSelector";
import MatchesSectionNav from "@/components/matches/MatchesSectionNav";
import EmptyState from "@/components/common/EmptyState";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type { Metadata } from "next";
import { getActiveSeason } from "@/lib/season/activeSeason";
import { parseSeasonParam } from "@/lib/season/seasonUtils";
import { getEntityLabels } from "@/lib/entityLabels";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { buildMetadata } from "@/lib/seo";
import { TYPE_SCALE } from "@/lib/typeScale";
import { formatRome } from "@/lib/dateUtils";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const metadata: Metadata = buildMetadata({
  title: "Risultati",
  description:
    "Storico risultati delle partite ufficiali del Karibu Baskin di Montecchio Maggiore.",
  path: "/risultati",
});

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RisultatiPage({ searchParams }: Props) {
  // Stagione attiva del sito: con la stagione appena aperta e ancora senza
  // partite giocate si ricade sull'ultima popolata, dicendolo.
  const [
    sp,
    t,
    locale,
    { matchResultLabel },
    { activeSeason, displaySeason, isFallback, seasons },
  ] = await Promise.all([
    searchParams,
    getTranslations("matches"),
    getLocale(),
    getEntityLabels(),
    getActiveSeason("results"),
  ]);
  const chosenSeason = parseSeasonParam(sp.season);
  const season = chosenSeason ?? displaySeason;
  const showFallbackNotice = !chosenSeason && isFallback;
  const dateLocale = getDateFnsLocale(locale);
  // Per esteso ("3 vittorie", non "3V"): le sigle erano gergo (UX-17).
  const wins = (count: number) => t("resultWins", { count });
  const draws = (count: number) => t("resultDraws", { count });
  const losses = (count: number) => t("resultLosses", { count });
  const matchTypeLabel = (type: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      type
    ] ?? type;

  // Stagioni per i chip filtro: quelle con risultati più la attiva, che resta
  // selezionabile anche se vuota. Un filtro fuori elenco si aggiunge.
  const chipSeasons = seasons.includes(season)
    ? seasons
    : [...seasons, season].sort((a, b) => b.localeCompare(a));

  // Partite giocate della stagione, raggruppate per squadra
  const matches = await prisma.match.findMany({
    where: { result: { not: null }, team: { season } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      matchType: true,
      ourScore: true,
      theirScore: true,
      result: true,
      team: { select: { id: true, name: true, color: true, season: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true } },
    },
  });

  // Raggruppa per squadra (mantieni l'ordine: prima squadra con più partite)
  const teamMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string | null;
      championship: string | null;
      matches: typeof matches;
    }
  >();
  for (const m of matches) {
    if (!teamMap.has(m.team.id)) {
      teamMap.set(m.team.id, { ...m.team, matches: [] });
    }
    teamMap.get(m.team.id)!.matches.push(m);
  }
  const teamGroups = Array.from(teamMap.values());

  return (
    <>
      <PageHero
        // Colonna piena come Classifiche e Marcatori, anche se il contenuto sta
        // nella colonna `main`: le tab di sezione restano ferme da una pagina
        // all'altra (UX-36), invece di spostarsi di 128 px sotto il cursore.
        title={t("resultsTitle")}
        subtitle={t("resultsSubtitle")}
        nav={<MatchesSectionNav current="results" season={chosenSeason} />}
      />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx("main")}>
          <SeasonSelector
            seasons={chipSeasons}
            current={season}
            basePath="/risultati"
            notice={showFallbackNotice ? { active: activeSeason, shown: displaySeason } : null}
          />

          {/* ── Nessun dato ─────────────────────────────────────────────────── */}
          {teamGroups.length === 0 && (
            <EmptyState
              icon={<EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
              title={`${t("resultsEmpty")} ${season}`}
              message={t("resultsEmptyDesc")}
            />
          )}

          {/* ── Sezioni per squadra ─────────────────────────────────────────── */}
          <Stack spacing={5}>
            {teamGroups.map((team) => {
              const tw = team.matches.filter((m) => m.result === "WIN").length;
              const td = team.matches.filter((m) => m.result === "DRAW").length;
              const tl = team.matches.filter((m) => m.result === "LOSS").length;

              return (
                <Box key={team.id}>
                  {/* Intestazione nella tinta della squadra; sotto, il bilancio:
                    prima i conteggi per esteso (il colore non e' mai l'unico
                    segnale, WCAG 1.4.1), poi la barra in proporzione su un
                    binario neutro. I conteggi stanno in mezzo perché la tinta
                    squadra (Verde, Arancio) non tocchi i colori degli esiti
                    (UX-49 C). */}
                  <TeamSectionHeader
                    name={team.name}
                    color={team.color}
                    championship={team.championship}
                    aside={t("matchCount", { count: team.matches.length })}
                  />
                  <Box sx={{ mt: 1.5, mb: 2 }}>
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                      <Chip
                        label={wins(tw)}
                        size="small"
                        sx={{
                          bgcolor: "match.winBg",
                          color: "match.win",
                          fontWeight: FONT_WEIGHT.bold,
                          fontSize: TYPE_SCALE.xs,
                          height: 20,
                        }}
                      />
                      {td > 0 && (
                        <Chip
                          label={draws(td)}
                          size="small"
                          sx={{
                            bgcolor: "match.drawBg",
                            color: "match.draw",
                            fontWeight: FONT_WEIGHT.bold,
                            fontSize: TYPE_SCALE.xs,
                            height: 20,
                          }}
                        />
                      )}
                      <Chip
                        label={losses(tl)}
                        size="small"
                        sx={{
                          bgcolor: "match.lossBg",
                          color: "match.loss",
                          fontWeight: FONT_WEIGHT.bold,
                          fontSize: TYPE_SCALE.xs,
                          height: 20,
                        }}
                      />
                    </Box>
                    <Box
                      aria-hidden
                      sx={{
                        mt: 1,
                        p: "2px",
                        bgcolor: "action.hover",
                        borderRadius: RADIUS.pill,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          gap: "2px",
                          height: 8,
                          borderRadius: RADIUS.pill,
                          overflow: "hidden",
                        }}
                      >
                        {tw > 0 && (
                          <Box sx={{ flexGrow: tw, flexBasis: 0, bgcolor: "match.win" }} />
                        )}
                        {td > 0 && (
                          <Box sx={{ flexGrow: td, flexBasis: 0, bgcolor: "match.draw" }} />
                        )}
                        {tl > 0 && (
                          <Box sx={{ flexGrow: tl, flexBasis: 0, bgcolor: "match.loss" }} />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Match cards */}
                  <Stack spacing={1}>
                    {team.matches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        tFn={t}
                        dateLocale={dateLocale}
                        matchResultLabel={matchResultLabel}
                      />
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Container>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCard — clickable, link a /partite/[slug]
// ─────────────────────────────────────────────────────────────────────────────

type MatchItem = Awaited<
  ReturnType<
    typeof prisma.match.findMany<{
      select: {
        id: true;
        slug: true;
        date: true;
        isHome: true;
        matchType: true;
        ourScore: true;
        theirScore: true;
        result: true;
        team: { select: { id: true; name: true; color: true; season: true; championship: true } };
        opponent: { select: { id: true; name: true; city: true } };
        opponentTeam: { select: { id: true; name: true } };
      };
    }>
  >
>[number];

function MatchCard({
  match: m,
  tFn,
  dateLocale,
  matchResultLabel,
}: {
  match: MatchItem;
  tFn: (key: string) => string;
  dateLocale: import("date-fns").Locale;
  matchResultLabel: (r: "WIN" | "LOSS" | "DRAW") => string;
}) {
  const typeLabel =
    (
      {
        LEAGUE: tFn("typeLeague"),
        TOURNAMENT: tFn("typeTournament"),
        FRIENDLY: tFn("typeFriendly"),
      } as Record<string, string>
    )[m.matchType] ?? m.matchType;

  return (
    <PlayedMatchRow
      href={`/partite/${m.slug ?? m.id}`}
      dateLabel={formatRome(new Date(m.date), "d MMM yyyy", { locale: dateLocale })}
      metaLabel={`${m.isHome ? tFn("home") : tFn("away")} · ${typeLabel}`}
      isHome={m.isHome}
      ourName={m.team.name}
      theirName={m.opponent?.name ?? m.opponentTeam?.name ?? tFn("opponent")}
      ourScore={m.ourScore}
      theirScore={m.theirScore}
      result={m.result}
      resultLabel={m.result ? matchResultLabel(m.result) : null}
    />
  );
}
