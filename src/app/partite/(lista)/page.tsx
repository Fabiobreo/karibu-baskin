import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Stack } from "@mui/material";
import { columnSx } from "@/lib/layout";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import StatusPill from "@/components/common/StatusPill";
import HomeIcon from "@mui/icons-material/Home";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlaceIcon from "@mui/icons-material/Place";
import Link from "next/link";
import type { Metadata } from "next";
import { getActiveSeason } from "@/lib/season/activeSeason";
import MatchTimeCell from "@/components/matches/MatchTimeCell";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { buildMetadata } from "@/lib/seo";
import { teamColor } from "@/lib/teamColors";
import TeamSectionHeader from "@/components/teams/TeamSectionHeader";
import { TYPE_SCALE } from "@/lib/typeScale";
import { formatRome } from "@/lib/dateUtils";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const metadata: Metadata = buildMetadata({
  title: "Prossime partite",
  description:
    "Calendario delle prossime partite ufficiali del Karibu Baskin di Montecchio Maggiore.",
  path: "/partite",
});

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PartitePage({ searchParams }: Props) {
  // Nessuna ricaduta qui: le "prossime partite" di una stagione conclusa non
  // esistono, quindi si resta sulla stagione attiva del sito.
  const [sp, { activeSeason, seasons }, t, locale] = await Promise.all([
    searchParams,
    getActiveSeason("teams"),
    getTranslations("matches"),
    getLocale(),
  ]);
  const season = sp.season ?? activeSeason;
  const dateLocale = getDateFnsLocale(locale);
  const matchTypeLabel = (type: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      type
    ] ?? type;
  const now = new Date();

  const chipSeasons = seasons.includes(season)
    ? seasons
    : [...seasons, season].sort((a, b) => b.localeCompare(a));

  const upcoming = await prisma.match.findMany({
    where: { result: null, date: { gte: now }, team: { season } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      matchType: true,
      venue: true,
      team: { select: { id: true, name: true, color: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true } },
    },
  });

  // Raggruppa per squadra
  const teamMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string | null;
      championship: string | null;
      matches: typeof upcoming;
    }
  >();
  for (const m of upcoming) {
    if (!teamMap.has(m.team.id)) {
      teamMap.set(m.team.id, { ...m.team, matches: [] });
    }
    teamMap.get(m.team.id)!.matches.push(m);
  }
  const teamGroups = Array.from(teamMap.values());

  return (
    <>
      <PageHero
        column="main"
        title={t("upcomingTitle")}
        subtitle={
          upcoming.length === 0
            ? t("upcomingEmpty")
            : t("upcomingCount", { count: upcoming.length })
        }
      />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx("main")}>
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
                  href={`/partite?season=${encodeURIComponent(s)}`}
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

          {teamGroups.length === 0 && (
            <EmptyState
              icon={<CalendarTodayIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
              title={t("upcomingEmpty")}
              message={t("upcomingEmptyDesc")}
              action={
                <Link href="/risultati" style={{ textDecoration: "none" }}>
                  <Typography
                    variant="body2"
                    color="primary.onLight"
                    sx={{
                      fontWeight: FONT_WEIGHT.semibold,
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {t("seeResults")}
                  </Typography>
                </Link>
              }
            />
          )}

          <Stack spacing={5}>
            {teamGroups.map((team) => (
              <Box key={team.id}>
                {/* Intestazione nella tinta della squadra; senza tinta e' neutra (UX-29). */}
                <Box sx={{ mb: 2 }}>
                  <TeamSectionHeader
                    name={team.name}
                    color={team.color}
                    championship={team.championship}
                    aside={t("matchCount", { count: team.matches.length })}
                  />
                </Box>

                <Stack spacing={1}>
                  {team.matches.map((m) => {
                    const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? t("opponent");
                    // La nostra squadra sempre a sinistra: casa/trasferta lo
                    // dice il chip (UX-18).
                    const leftName = m.team.name;
                    const rightName = opponentName;
                    const leftIsUs = true;
                    return (
                      <Link
                        key={m.id}
                        href={`/partite/${m.slug ?? m.id}`}
                        style={{ textDecoration: "none" }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            // Fascia della tinta squadra; senza tinta resta il bordo neutro.
                            ...(teamColor(team.color)
                              ? { borderLeft: `4px solid ${teamColor(team.color)}` }
                              : {}),
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "box-shadow 0.15s, border-color 0.15s",
                            // Si tocca: al passaggio bordo arancio. La fascia
                            // a sinistra resta della squadra.
                            "&:hover": {
                              boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                              borderTopColor: "primary.main",
                              borderRightColor: "primary.main",
                              borderBottomColor: "primary.main",
                              ...(teamColor(team.color) ? {} : { borderLeftColor: "primary.main" }),
                            },
                          }}
                        >
                          <Box
                            sx={{
                              px: 2,
                              py: 1.5,
                              // Da tablet in su colonne fisse (UX-37): quando | noi |
                              // vs | loro | casa, tipo e luogo. Il "vs" sta alla stessa
                              // x in tutte le righe, qualunque sia la lunghezza dei nomi.
                              display: { xs: "flex", sm: "grid" },
                              gridTemplateColumns: {
                                sm: "176px minmax(0, 1fr) 24px minmax(0, 1fr) 208px",
                              },
                              alignItems: "center",
                              gap: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Quando */}
                            <Box sx={{ minWidth: 110, flexShrink: 0 }}>
                              <MatchTimeCell dateIso={m.date.toISOString()} />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: TYPE_SCALE.xs, display: "block" }}
                              >
                                {formatRome(new Date(m.date), "EEEE d MMMM · HH:mm", {
                                  locale: dateLocale,
                                })}
                              </Typography>
                            </Box>

                            {/* Match-up */}
                            <Box
                              sx={{
                                flex: 1,
                                minWidth: 200,
                                // Sul tablet i tre pezzi diventano colonne della riga.
                                display: { xs: "flex", sm: "contents" },
                                alignItems: "center",
                                gap: 1,
                                justifyContent: "center",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: leftIsUs ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold,
                                  color: leftIsUs ? "text.primary" : "text.secondary",
                                  textAlign: "right",
                                  flex: "1 1 0",
                                  minWidth: 0,
                                  // I nomi lunghi vanno a capo invece di essere tagliati (UX-26).
                                  overflowWrap: "break-word",
                                }}
                              >
                                {leftName}
                              </Typography>
                              <Typography
                                sx={{
                                  color: "text.secondary",
                                  fontWeight: FONT_WEIGHT.semibold,
                                  fontSize: TYPE_SCALE.sm,
                                  px: 0.5,
                                  textAlign: "center",
                                }}
                              >
                                vs
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: leftIsUs ? FONT_WEIGHT.semibold : FONT_WEIGHT.bold,
                                  color: leftIsUs ? "text.secondary" : "text.primary",
                                  textAlign: "left",
                                  flex: "1 1 0",
                                  minWidth: 0,
                                  // I nomi lunghi vanno a capo invece di essere tagliati (UX-26).
                                  overflowWrap: "break-word",
                                }}
                              >
                                {rightName}
                              </Typography>
                            </Box>

                            {/* Casa/Trasferta + venue */}
                            <Box
                              sx={{
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: { sm: "flex-end" },
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              {/* Casa invertita, trasferta contornata: stato, non esito (UX-29). */}
                              <StatusPill
                                variant={m.isHome ? "inverted" : "outlined"}
                                icon={m.isHome ? <HomeIcon /> : <DirectionsBusIcon />}
                                label={m.isHome ? t("home") : t("away")}
                              />
                              {m.venue && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.3,
                                    color: "text.secondary",
                                    maxWidth: 160,
                                  }}
                                >
                                  <PlaceIcon sx={{ fontSize: 12 }} />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: TYPE_SCALE.xs,
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    {m.venue}
                                  </Typography>
                                </Box>
                              )}
                              <Chip
                                label={matchTypeLabel(m.matchType)}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: TYPE_SCALE.xs,
                                  height: 20,
                                  color: "text.secondary",
                                  borderColor: "divider",
                                }}
                              />
                              <ChevronRightIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            </Box>
                          </Box>
                        </Paper>
                      </Link>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>

          {/* Link a risultati */}
          {teamGroups.length > 0 && (
            <Box sx={{ textAlign: "right", mt: 4 }}>
              <Link href="/risultati" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  color="primary.onLight"
                  sx={{
                    fontWeight: FONT_WEIGHT.semibold,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {t("seeResults")}
                </Typography>
              </Link>
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
}
