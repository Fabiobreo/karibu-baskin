import { prisma } from "@/lib/db";
import { teamColor } from "@/lib/teamColors";
import { Container, Typography, Box, Chip, Stack } from "@mui/material";
import PlayedMatchRow from "@/components/matches/PlayedMatchRow";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Link from "next/link";
import type { Metadata } from "next";
import { getActiveSeason } from "@/lib/season/activeSeason";
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

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function RisultatiPage({ searchParams }: Props) {
  // Stagione attiva del sito: con la stagione appena aperta e ancora senza
  // partite giocate si ricade sull'ultima popolata, dicendolo.
  const [
    sp,
    t,
    tCommon,
    locale,
    { matchResultLabel },
    { activeSeason, displaySeason, isFallback, seasons },
  ] = await Promise.all([
    searchParams,
    getTranslations("matches"),
    getTranslations("common"),
    getLocale(),
    getEntityLabels(),
    getActiveSeason("results"),
  ]);
  const season = sp.season ?? displaySeason;
  const showFallbackNotice = !sp.season && isFallback;
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
      <PageHero title={t("resultsTitle")} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* ── Filtri stagione ──────────────────────────────────────────────── */}
        {chipSeasons.length > 1 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4, alignItems: "center" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={FONT_WEIGHT.semibold}
              sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {t("seasonLabel")}
            </Typography>
            {chipSeasons.map((s) => (
              <Link
                key={s}
                href={`/risultati?season=${encodeURIComponent(s)}`}
                style={{ textDecoration: "none" }}
              >
                <Chip
                  label={s}
                  size="small"
                  variant={season === s ? "filled" : "outlined"}
                  color={season === s ? "primary" : "default"}
                  sx={{ cursor: "pointer", fontSize: TYPE_SCALE.xs }}
                />
              </Link>
            ))}
          </Box>
        )}

        {showFallbackNotice && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {tCommon("seasonNotStarted", { active: activeSeason, shown: displaySeason })}
          </Typography>
        )}

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
                {/* Team header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                    flexWrap: "wrap",
                  }}
                >
                  {teamColor(team.color) && (
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: teamColor(team.color),
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Typography component="h2" variant="h6" fontWeight={FONT_WEIGHT.bold}>
                    {team.name}
                  </Typography>
                  {team.championship && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={FONT_WEIGHT.semibold}
                    >
                      {team.championship}
                    </Typography>
                  )}
                  <Box sx={{ ml: "auto", display: "flex", gap: 0.75 }}>
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

        {/* ── Link a prossime partite ─────────────────────────────────────── */}
        {teamGroups.length > 0 && (
          <Box sx={{ textAlign: "right", mt: 4 }}>
            <Link href="/partite" style={{ textDecoration: "none" }}>
              <Typography
                variant="body2"
                color="primary.onLight"
                sx={{
                  fontWeight: FONT_WEIGHT.semibold,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {t("seeMatches")}
              </Typography>
            </Link>
          </Box>
        )}
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
