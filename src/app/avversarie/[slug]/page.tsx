import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Link as MuiLink,
  Paper,
  Typography,
} from "@mui/material";
import { columnSx } from "@/lib/layout";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import LanguageIcon from "@mui/icons-material/Language";
import PaletteIcon from "@mui/icons-material/Palette";
import PlaceIcon from "@mui/icons-material/Place";
import StadiumIcon from "@mui/icons-material/Stadium";
import EventIcon from "@mui/icons-material/Event";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import EntityHero, { HeroMeta } from "@/components/common/EntityHero";
import OpponentCrest from "@/components/teams/OpponentCrest";
import { mapsSearchUrl, matchLocation } from "@/lib/clubVenue";
import { LIVE_WINDOW_MS } from "@/lib/matches/matchPhase";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import type { Metadata } from "next";
import type { MatchType } from "@prisma/client";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { buildMetadata } from "@/lib/seo";
import { MATCH_RESULT_META } from "@/lib/matches/matchResults";
import { getEntityLabels } from "@/lib/entityLabels";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import TeamChip from "@/components/teams/TeamChip";
import { auth } from "@/lib/authjs";
import OpposingTeamEditButton from "@/components/matches/OpposingTeamEditButton";
import { TYPE_SCALE } from "@/lib/typeScale";
import { formatRome } from "@/lib/dateUtils";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const team = await prisma.opposingTeam.findUnique({ where: { slug }, select: { name: true } });
  if (!team) {
    return buildMetadata({
      title: "Squadra avversaria non trovata",
      description: "Questa squadra avversaria non esiste o è stata rimossa.",
      path: `/avversarie/${slug}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `Storico con ${team.name}`,
    description: `Storico dei confronti tra il Karibu Baskin e ${team.name}: risultati, date e statistiche.`,
    path: `/avversarie/${slug}`,
  });
}

export default async function OpposingTeamPublicPage({ params }: Params) {
  const { slug } = await params;
  const [t, tMatches, locale, { matchResultShort }, session, currentSeason, team] =
    await Promise.all([
      getTranslations("teams"),
      getTranslations("matches"),
      getLocale(),
      getEntityLabels(),
      auth(),
      getCurrentSeasonLabel(),
      prisma.opposingTeam.findUnique({
        where: { slug },
        include: {
          matches: {
            orderBy: { date: "desc" },
            include: {
              team: { select: { id: true, name: true, season: true, color: true } },
            },
          },
        },
      }),
    ]);
  const isStaff = session?.user?.appRole === "COACH" || session?.user?.appRole === "ADMIN";
  const dateLocale = getDateFnsLocale(locale);
  const matchTypeLabel = (type: string) =>
    ({
      LEAGUE: tMatches("typeLeague"),
      TOURNAMENT: tMatches("typeTournament"),
      FRIENDLY: tMatches("typeFriendly"),
    })[type] ?? type;
  if (!team) notFound();

  // In programma: senza punteggio e non ancora finite (future o in corso).
  // Stanno in cima, come blocco a sé; tutto il resto sono i precedenti.
  // eslint-disable-next-line react-hooks/purity -- Server Component, renders once
  const now = Date.now();
  const upcoming = team.matches
    .filter(
      (m) =>
        (m.ourScore === null || m.theirScore === null) &&
        new Date(m.date).getTime() + LIVE_WINDOW_MS > now
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingIds = new Set(upcoming.map((m) => m.id));
  const pastMatches = team.matches.filter((m) => !upcomingIds.has(m.id));

  // Aggrega per stagione
  type SeasonStat = {
    season: string;
    wins: number;
    draws: number;
    losses: number;
    played: number;
    scored: number;
    conceded: number;
    pending: number;
  };
  const seasonsMap = new Map<string, SeasonStat>();
  for (const m of pastMatches) {
    const season = m.team.season;
    if (!seasonsMap.has(season)) {
      seasonsMap.set(season, {
        season,
        wins: 0,
        draws: 0,
        losses: 0,
        played: 0,
        scored: 0,
        conceded: 0,
        pending: 0,
      });
    }
    const s = seasonsMap.get(season)!;
    if (m.result && m.ourScore !== null && m.theirScore !== null) {
      s.played++;
      s.scored += m.ourScore;
      s.conceded += m.theirScore;
      if (m.result === "WIN") s.wins++;
      else if (m.result === "DRAW") s.draws++;
      else if (m.result === "LOSS") s.losses++;
    } else {
      s.pending++;
    }
  }
  const seasons = Array.from(seasonsMap.values()).sort((a, b) => b.season.localeCompare(a.season));

  // Indirizzo per Maps: con la città, se l'indirizzo non la dice già.
  const venueAddress =
    team.address && team.city && !team.address.toLowerCase().includes(team.city.toLowerCase())
      ? `${team.address}, ${team.city}`
      : (team.address ?? "");

  const seasonsPlayed = seasons.map((s) => s.season);
  const lastSeason = seasonsPlayed[0]; // seasons sono ordinate desc
  const playedInCurrentSeason = seasonsPlayed.includes(currentSeason);

  const totals = seasons.reduce(
    (acc, s) => ({
      played: acc.played + s.played,
      wins: acc.wins + s.wins,
      draws: acc.draws + s.draws,
      losses: acc.losses + s.losses,
      scored: acc.scored + s.scored,
      conceded: acc.conceded + s.conceded,
    }),
    { played: 0, wins: 0, draws: 0, losses: 0, scored: 0, conceded: 0 }
  );

  return (
    <>
      <EntityHero
        // "Partite", non "Risultati": un'avversaria mai affrontata non ne ha.
        breadcrumb={[{ label: tMatches("breadcrumb"), href: "/partite" }, { label: team.name }]}
        title={team.name}
        leading={team.imageUrl && <OpponentCrest imageUrl={team.imageUrl} name={team.name} />}
        meta={
          (team.city || team.address || team.colors || team.website) && (
            <>
              {team.city && <HeroMeta icon={<PlaceIcon />}>{team.city}</HeroMeta>}
              {team.address && (
                <HeroMeta icon={<StadiumIcon />}>
                  <MuiLink
                    href={mapsSearchUrl(venueAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    aria-label={tMatches("whereWhen.openInMaps", { place: team.address })}
                  >
                    {team.address}
                  </MuiLink>
                </HeroMeta>
              )}
              {team.colors && (
                <HeroMeta icon={<PaletteIcon />}>
                  {t("opponentColors", { colors: team.colors })}
                </HeroMeta>
              )}
              {team.website && (
                <HeroMeta icon={<LanguageIcon />}>
                  <MuiLink
                    href={
                      team.website.startsWith("http") ? team.website : `https://${team.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    color="inherit"
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    {team.website.replace(/^https?:\/\//, "")}
                  </MuiLink>
                </HeroMeta>
              )}
            </>
          )
        }
        manage={
          isStaff && (
            <OpposingTeamEditButton
              teamId={team.id}
              initial={{
                name: team.name,
                city: team.city,
                address: team.address,
                website: team.website,
                colors: team.colors,
                notes: team.notes,
                imageUrl: team.imageUrl,
              }}
            />
          )
        }
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("main")}>
          {upcoming.length > 0 && (
            <Box component="section" sx={{ mb: 5 }}>
              <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
                {upcoming.length === 1 ? tMatches("nextMatch") : t("upcomingMatches")}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {upcoming.map((m) => {
                  const location = matchLocation({
                    isHome: m.isHome,
                    venue: m.venue,
                    opponent: team,
                  });
                  return (
                    <Paper
                      key={m.id}
                      elevation={0}
                      variant="outlined"
                      sx={{
                        transition: "border-color 0.15s",
                        "&:hover": { borderColor: "primary.main" },
                        "&:hover .next-match-arrow": { color: "primary.main" },
                      }}
                    >
                      {/* La parte alta apre la partita; sotto, Maps e calendario
                          sono link loro (un link dentro un link non è valido). */}
                      <MuiLink
                        href={`/partite/${m.slug ?? m.id}`}
                        underline="none"
                        color="inherit"
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                          p: { xs: 2, sm: 2.5 },
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            component="p"
                            sx={{ "&::first-letter": { textTransform: "uppercase" } }}
                          >
                            {formatRome(new Date(m.date), "EEEE d MMMM yyyy · HH:mm", {
                              locale: dateLocale,
                            })}
                          </Typography>
                          {/* Chi gioca in casa prima, come nel tabellino (UX-35). */}
                          <Typography variant="body1" sx={{ mt: 0.25, overflowWrap: "anywhere" }}>
                            {m.isHome
                              ? `${m.team.name} vs ${team.name}`
                              : `${team.name} vs ${m.team.name}`}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              mt: 1,
                              color: "text.secondary",
                            }}
                          >
                            {m.isHome ? (
                              <HomeIcon fontSize="small" />
                            ) : (
                              <FlightIcon fontSize="small" />
                            )}
                            <Typography variant="body2">
                              {m.isHome ? tMatches("home") : tMatches("away")}
                              {" · "}
                              {matchTypeLabel(m.matchType)}
                            </Typography>
                          </Box>
                        </Box>
                        <ArrowForwardIcon
                          className="next-match-arrow"
                          sx={{ color: "text.secondary", flexShrink: 0, mt: 0.5 }}
                        />
                      </MuiLink>
                      <Divider />
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          columnGap: 2,
                          rowGap: 1.5,
                          p: { xs: 2, sm: 2.5 },
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}
                        >
                          <PlaceIcon
                            fontSize="small"
                            sx={{ color: "text.secondary", mt: 0.25 }}
                            aria-hidden="true"
                          />
                          {location.label ? (
                            <MuiLink
                              href={mapsSearchUrl(location.label)}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="body2"
                              aria-label={tMatches("whereWhen.openInMaps", {
                                place: location.label,
                              })}
                              sx={{ overflowWrap: "anywhere" }}
                            >
                              {location.label}
                            </MuiLink>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {tMatches("whereWhen.locationTbc")}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          href={`/api/matches/${m.id}/event.ics`}
                          variant="outlined"
                          startIcon={<EventIcon />}
                          sx={TOUCH_TARGET_ON_PHONE}
                        >
                          {tMatches("whereWhen.addToCalendar")}
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          )}

          <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
            {t("previousMatches")}
          </Typography>

          {pastMatches.length === 0 ? (
            <Typography color="text.secondary">{t("noPreviousMatches")}</Typography>
          ) : (
            <>
              {upcoming.length === 0 && !playedInCurrentSeason && lastSeason && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t("lastFacedAlert", { season: lastSeason, current: currentSeason })}
                </Alert>
              )}

              {/* Totale storico */}
              {totals.played > 0 &&
                (() => {
                  const last5 = pastMatches.filter((m) => m.result !== null).slice(0, 5);
                  return (
                    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t("historicalBalance", { count: totals.played })}
                      </Typography>
                      <Box
                        sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}
                      >
                        <Chip
                          label={tMatches("resultWins", { count: totals.wins })}
                          sx={{
                            bgcolor: "match.win",
                            color: "match.onFill",
                            minWidth: 60,
                          }}
                        />
                        <Chip
                          label={tMatches("resultDraws", { count: totals.draws })}
                          sx={{
                            bgcolor: "match.draw",
                            color: "match.onFill",
                            minWidth: 60,
                          }}
                        />
                        <Chip
                          label={tMatches("resultLosses", { count: totals.losses })}
                          sx={{
                            bgcolor: "match.loss",
                            color: "match.onFill",
                            minWidth: 60,
                          }}
                        />
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {t("pointsScored")}{" "}
                          <strong style={{ color: "inherit" }}>{totals.scored}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t("pointsConceded")}{" "}
                          <strong style={{ color: "inherit" }}>{totals.conceded}</strong>
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              totals.scored - totals.conceded >= 0 ? "success.dark" : "error.dark",
                            fontWeight: FONT_WEIGHT.semibold,
                          }}
                        >
                          {t("pointsDiff")} {totals.scored - totals.conceded >= 0 ? "+" : ""}
                          {totals.scored - totals.conceded}
                        </Typography>
                      </Box>

                      {last5.length > 0 && (
                        <Box
                          sx={{
                            mt: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={FONT_WEIGHT.semibold}
                          >
                            {t("lastMatches", { count: last5.length })}
                          </Typography>
                          {last5.map((m) => {
                            const badge = (
                              <Box
                                title={`${formatRome(new Date(m.date), "d MMM yyyy", { locale: dateLocale })} · ${m.ourScore}–${m.theirScore}`}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  bgcolor: MATCH_RESULT_META[m.result!].color,
                                  color: "match.onFill",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: TYPE_SCALE.xs,
                                  fontWeight: FONT_WEIGHT.bold,
                                  cursor: m.slug ? "pointer" : "default",
                                }}
                              >
                                {matchResultShort(m.result!)}
                              </Box>
                            );
                            return m.slug ? (
                              <Link
                                key={m.id}
                                href={`/partite/${m.slug}`}
                                style={{ textDecoration: "none" }}
                              >
                                {badge}
                              </Link>
                            ) : (
                              <Box key={m.id}>{badge}</Box>
                            );
                          })}
                        </Box>
                      )}
                    </Paper>
                  );
                })()}

              {seasons.map((s) => (
                <Paper key={s.season} elevation={0} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1.5,
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="h6" component="h3" fontWeight={FONT_WEIGHT.bold}>
                      {t("seasonLabel")} {s.season}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                      {s.played > 0 && (
                        <>
                          <Chip
                            label={tMatches("resultWins", { count: s.wins })}
                            size="small"
                            sx={{ bgcolor: "match.win", color: "match.onFill" }}
                          />
                          <Chip
                            label={tMatches("resultDraws", { count: s.draws })}
                            size="small"
                            sx={{ bgcolor: "match.draw", color: "match.onFill" }}
                          />
                          <Chip
                            label={tMatches("resultLosses", { count: s.losses })}
                            size="small"
                            sx={{ bgcolor: "match.loss", color: "match.onFill" }}
                          />
                          <Chip
                            label={`${s.scored}–${s.conceded}`}
                            size="small"
                            variant="outlined"
                          />
                        </>
                      )}
                      {s.pending > 0 && (
                        <Chip
                          label={t("awaitingResults", { count: s.pending })}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {pastMatches
                      .filter((m) => m.team.season === s.season)
                      .map((m) => {
                        const card = (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              py: 0.75,
                              px: 1,
                              borderRadius: RADIUS.md,
                              "&:hover": { bgcolor: "action.hover" },
                              "&:hover .match-row-arrow": { color: "primary.main" },
                            }}
                          >
                            <Box sx={{ minWidth: 90 }}>
                              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                                {formatRome(new Date(m.date), "d MMM yy", { locale: dateLocale })}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.4,
                                  color: "text.secondary",
                                }}
                              >
                                {m.isHome ? (
                                  <HomeIcon sx={{ fontSize: 11 }} />
                                ) : (
                                  <FlightIcon sx={{ fontSize: 11 }} />
                                )}
                                <Typography variant="caption">
                                  {m.isHome ? tMatches("home") : tMatches("away")}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  flexWrap: "wrap",
                                }}
                              >
                                <TeamChip name={m.team.name} color={m.team.color} compact />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: TYPE_SCALE.xs }}
                                >
                                  {matchTypeLabel(m.matchType)}
                                  {m.matchday ? ` · G${m.matchday}` : ""}
                                </Typography>
                              </Box>
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                minWidth: 130,
                                justifyContent: "flex-end",
                              }}
                            >
                              {m.ourScore !== null && m.theirScore !== null ? (
                                <Typography variant="body1" fontWeight={FONT_WEIGHT.bold}>
                                  {m.ourScore} – {m.theirScore}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {tMatches("phaseAwaitingResult")}
                                </Typography>
                              )}
                              {m.result && (
                                <Chip
                                  label={matchResultShort(m.result)}
                                  size="small"
                                  sx={{
                                    bgcolor: MATCH_RESULT_META[m.result].color,
                                    color: "match.onFill",
                                    fontSize: TYPE_SCALE.xs,
                                    height: 20,
                                    minWidth: 28,
                                  }}
                                />
                              )}
                              {m.slug && (
                                <ChevronRightIcon
                                  className="match-row-arrow"
                                  fontSize="small"
                                  sx={{ color: "text.secondary" }}
                                />
                              )}
                            </Box>
                          </Box>
                        );
                        return m.slug ? (
                          <Link
                            key={m.id}
                            href={`/partite/${m.slug}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            {card}
                          </Link>
                        ) : (
                          <Box key={m.id}>{card}</Box>
                        );
                      })}
                  </Box>
                </Paper>
              ))}
            </>
          )}
        </Box>
      </Container>
    </>
  );
}
