import Link from "next/link";
import { Box, Container, Stack, Typography } from "@mui/material";
import PlayedMatchRow from "./PlayedMatchRow";
import { weekendResultsWindow } from "@/lib/matches/weekendResults";
import { getEntityLabels } from "@/lib/entityLabels";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import ProssimePartiteCards from "./ProssimePartiteCards";
import { loadHomeCallupStatus, type HomeCallupStatus } from "@/lib/matches/homeCallupStatus";
import { loadPendingPredictions } from "@/lib/games/loadPredictions";
import { getLocale, getTranslations } from "next-intl/server";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

const DAYS_AHEAD = 14;
const IMMINENT_HOURS = 48;

interface ProssimePartiteHomeProps {
  /** Tesserato che guarda: le card dicono se lui o un figlio è convocato. */
  viewer?: { id: string; name: string } | null;
}

export default async function ProssimePartiteHome({ viewer = null }: ProssimePartiteHomeProps) {
  const now = new Date();
  const limit = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const imminentLimit = new Date(now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000);

  // Risultati del fine settimana (UX-58): dal venerdì al martedì sera.
  const weekend = weekendResultsWindow(now);
  const [t, tAfter, locale, { matchResultLabel }, weekendResults, matches] = await Promise.all([
    getTranslations("matches"),
    getTranslations("matches.afterMatch"),
    getLocale(),
    getEntityLabels(),
    weekend
      ? withDbRetry(() =>
          prisma.match.findMany({
            where: {
              date: { gte: weekend.from, lt: weekend.to },
              ourScore: { not: null },
              theirScore: { not: null },
            },
            orderBy: { date: "asc" },
            select: {
              id: true,
              slug: true,
              date: true,
              isHome: true,
              matchType: true,
              ourScore: true,
              theirScore: true,
              result: true,
              team: { select: { name: true } },
              opponent: { select: { name: true } },
              opponentTeam: { select: { name: true } },
            },
          })
        )
      : Promise.resolve([]),
    withDbRetry(() =>
      prisma.match.findMany({
        where: { date: { gte: now, lte: limit } },
        orderBy: { date: "asc" },
        take: 3,
        select: {
          id: true,
          slug: true,
          date: true,
          isHome: true,
          venue: true,
          team: { select: { id: true, name: true, color: true } },
          opponent: { select: { id: true, name: true } },
          opponentTeam: { select: { id: true, name: true } },
        },
      })
    ),
  ]);

  if (matches.length === 0 && weekendResults.length === 0) return null;
  const dateLocale = getDateFnsLocale(locale);
  const typeLabel = (type: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      type
    ] ?? type;
  const both = matches.length > 0 && weekendResults.length > 0;

  const [statuses, pendingPredictions] = viewer
    ? await Promise.all([
        withDbRetry(() =>
          loadHomeCallupStatus(
            viewer.id,
            viewer.name,
            matches.map((m) => m.id),
            now
          )
        ),
        // Pronostico aperto e non ancora fatto (UX-61).
        withDbRetry(() =>
          loadPendingPredictions(
            viewer.id,
            matches.map((m) => ({
              id: m.id,
              date: m.date,
              opponentId: m.opponent?.id ?? null,
              opponentTeamId: m.opponentTeam?.id ?? null,
            })),
            now.getTime()
          )
        ),
      ])
    : [{} as Record<string, HomeCallupStatus>, new Set<string>()];

  const cardData = matches.map((m) => ({
    ...m,
    isImminent: m.date <= imminentLimit,
    callupStatus: statuses[m.id] ?? null,
    predictionPending: pendingPredictions.has(m.id),
  }));

  return (
    <Box
      sx={{
        py: { xs: 4, md: 6 },
        // Sul fondo della pagina, con un filo sopra: la fascia pesca qui non
        // ha convinto il committente (01/10); il colore lo portano le card.
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          {/* Icona decorativa di una sezione chiara: arancio (UX-28, opzione B). */}
          <EmojiEventsIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
              {t("homeChip")}
            </Typography>
            <Typography
              variant="h5"
              component="h2"
              sx={{ mt: 0.25, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl2 } }}
            >
              {matches.length > 0 ? t("homeUpcoming") : tAfter("weekendTitle")}
            </Typography>
          </Box>
        </Box>

        {weekendResults.length > 0 && (
          <Box sx={{ mb: matches.length > 0 ? 4 : 0 }}>
            {both && (
              <Typography component="h3" variant="subtitle1" sx={{ mb: 1.5 }}>
                {tAfter("weekendTitle")}
              </Typography>
            )}
            <Stack spacing={1} sx={{ maxWidth: 880 }}>
              {weekendResults.map((m) => (
                <PlayedMatchRow
                  key={m.id}
                  href={`/partite/${m.slug ?? m.id}`}
                  dateLabel={formatRome(m.date, "EEEE d MMM", { locale: dateLocale })}
                  metaLabel={`${m.isHome ? t("home") : t("away")} · ${typeLabel(m.matchType)}`}
                  isHome={m.isHome}
                  ourName={m.team.name}
                  theirName={m.opponent?.name ?? m.opponentTeam?.name ?? t("opponent")}
                  ourScore={m.ourScore}
                  theirScore={m.theirScore}
                  result={m.result}
                  resultLabel={m.result ? matchResultLabel(m.result) : null}
                />
              ))}
            </Stack>
          </Box>
        )}

        {both && (
          <Typography component="h3" variant="subtitle1" sx={{ mb: 1.5 }}>
            {tAfter("weekendUpcoming")}
          </Typography>
        )}
        {matches.length > 0 && <ProssimePartiteCards matches={cardData} />}

        <Box sx={{ textAlign: "right", mt: 2 }}>
          <Link
            href={matches.length > 0 ? "/partite" : "/risultati"}
            style={{ textDecoration: "none" }}
          >
            <Typography
              variant="body2"
              color="primary.onLight"
              sx={{ fontWeight: FONT_WEIGHT.semibold, "&:hover": { textDecoration: "underline" } }}
            >
              {matches.length > 0 ? t("homeSeeAll") : t("seeResults")}
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
