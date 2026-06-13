import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlaceIcon from "@mui/icons-material/Place";
import Link from "next/link";
import { format } from "date-fns";
import type { Metadata } from "next";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import MatchTimeCell from "@/components/matches/MatchTimeCell";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";

export const metadata: Metadata = {
  title: "Prossime partite | Karibu Baskin",
  description:
    "Calendario delle prossime partite ufficiali del Karibu Baskin di Montecchio Maggiore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PartitePage({ searchParams }: Props) {
  const sp = await searchParams;
  const season = sp.season ?? getCurrentSeason();
  const [t, locale] = await Promise.all([getTranslations("matches"), getLocale()]);
  const dateLocale = getDateFnsLocale(locale);
  const matchTypeLabel = (type: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      type
    ] ?? type;
  const now = new Date();

  const allSeasons = await prisma.competitiveTeam.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });
  const seasons = allSeasons.map((s) => s.season);

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
      <SiteHeader />

      <PageHero py={{ xs: 5, md: 7 }} align="left">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <CalendarTodayIcon sx={{ fontSize: 30, color: "primary.main" }} />
          <Typography
            variant="overline"
            sx={{ color: "primary.main", letterSpacing: "0.12em", fontWeight: 700 }}
          >
            {t("upcomingHeroChip")}
          </Typography>
        </Box>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={800}
          sx={{ mb: 1, fontSize: { xs: "1.9rem", md: "2.6rem" } }}
        >
          {t("upcomingTitle")}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
          {upcoming.length === 0
            ? t("upcomingEmpty")
            : t("upcomingCount", { count: upcoming.length })}
        </Typography>
      </PageHero>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {seasons.length > 1 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4, alignItems: "center" }}>
            <Typography
              variant="caption"
              color="text.disabled"
              fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {t("seasonLabel")}
            </Typography>
            {seasons.map((s) => (
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
                  sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.72rem" }}
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
                  color="primary"
                  sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
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
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: team.color ?? "#E65100",
                    flexShrink: 0,
                  }}
                />
                <Typography variant="h6" fontWeight={800}>
                  {team.name}
                </Typography>
                {team.championship && (
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {team.championship}
                  </Typography>
                )}
                <Chip
                  label={t("matchCount", { count: team.matches.length })}
                  size="small"
                  sx={{
                    ml: "auto",
                    fontWeight: 700,
                    fontSize: "0.68rem",
                    height: 20,
                    bgcolor: alpha("#E65100", 0.1),
                    color: "primary.main",
                  }}
                />
              </Box>

              <Stack spacing={1}>
                {team.matches.map((m) => {
                  const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? t("opponent");
                  const leftName = m.isHome ? m.team.name : opponentName;
                  const rightName = m.isHome ? opponentName : m.team.name;
                  const leftIsUs = m.isHome;
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
                          borderLeft: `4px solid ${team.color ?? "#E65100"}`,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "box-shadow 0.15s, border-color 0.15s",
                          "&:hover": {
                            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                            borderColor: "text.disabled",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            px: 2,
                            py: 1.5,
                            display: "flex",
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
                              color="text.disabled"
                              sx={{ fontSize: "0.68rem", display: "block" }}
                            >
                              {format(new Date(m.date), "d MMM · HH:mm", { locale: dateLocale })}
                            </Typography>
                          </Box>

                          {/* Match-up */}
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
                            <Typography
                              sx={{
                                color: "text.disabled",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                px: 0.5,
                              }}
                            >
                              vs
                            </Typography>
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

                          {/* Casa/Trasferta + venue */}
                          <Box
                            sx={{
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Chip
                              icon={m.isHome ? <HomeIcon /> : <FlightIcon />}
                              label={m.isHome ? t("home") : t("away")}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.65rem", height: 22 }}
                            />
                            {m.venue && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.3,
                                  color: "text.disabled",
                                  maxWidth: 160,
                                }}
                              >
                                <PlaceIcon sx={{ fontSize: 12 }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.65rem",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
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
                                fontSize: "0.6rem",
                                height: 20,
                                color: "text.secondary",
                                borderColor: "divider",
                              }}
                            />
                            <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
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
                color="primary"
                sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
              >
                {t("seeResults")}
              </Typography>
            </Link>
          </Box>
        )}
      </Container>
    </>
  );
}
