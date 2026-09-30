import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Box, Typography, Paper, Chip, Container, Divider, Alert } from "@mui/material";
import { columnSx } from "@/lib/layout";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import LanguageIcon from "@mui/icons-material/Language";
import PaletteIcon from "@mui/icons-material/Palette";
import StadiumIcon from "@mui/icons-material/Stadium";
import Link from "next/link";
import EntityHero from "@/components/common/EntityHero";
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
  for (const m of team.matches) {
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
        breadcrumb={[
          { label: tMatches("resultsHeroChip"), href: "/risultati" },
          { label: team.name },
        ]}
        title={team.name}
        subtitle={team.city}
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
          {team.imageUrl && (
            <Box
              component="img"
              src={team.imageUrl}
              alt={team.name}
              sx={{
                width: "100%",
                maxHeight: 280,
                objectFit: "cover",
                borderRadius: RADIUS.lg,
                border: "1px solid",
                borderColor: "divider",
                display: "block",
                mb: 3,
              }}
            />
          )}

          {/* Info aggiuntive squadra */}
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                color: "text.secondary",
                mb: 1.5,
              }}
            >
              {team.address && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <StadiumIcon fontSize="small" />
                  <Typography variant="body2">{team.address}</Typography>
                </Box>
              )}
              {team.colors && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <PaletteIcon fontSize="small" />
                  <Typography variant="body2">{team.colors}</Typography>
                </Box>
              )}
              {team.website && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <LanguageIcon fontSize="small" />
                  <Typography
                    variant="body2"
                    component="a"
                    href={
                      team.website.startsWith("http") ? team.website : `https://${team.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "primary.onLight",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {team.website.replace(/^https?:\/\//, "")}
                  </Typography>
                </Box>
              )}
            </Box>

            {seasonsPlayed.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={FONT_WEIGHT.semibold}
                  sx={{ mr: 0.5 }}
                >
                  {t("facedInSeasons")}
                </Typography>
                {seasonsPlayed.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    size="small"
                    variant={s === currentSeason ? "filled" : "outlined"}
                    color={s === currentSeason ? "primary" : "default"}
                    sx={{ fontSize: TYPE_SCALE.xs, height: 22 }}
                  />
                ))}
              </Box>
            )}

            {seasonsPlayed.length > 0 && !playedInCurrentSeason && lastSeason && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {t("lastFacedAlert", { season: lastSeason, current: currentSeason })}
              </Alert>
            )}
          </Box>

          {team.matches.length === 0 ? (
            <Paper elevation={0} variant="outlined" sx={{ p: 6, textAlign: "center" }}>
              <Typography color="text.secondary">{t("noMatchesAgainst")}</Typography>
            </Paper>
          ) : (
            <>
              {/* Totale storico */}
              {totals.played > 0 &&
                (() => {
                  const last5 = team.matches.filter((m) => m.result !== null).slice(0, 5);
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

              {/* Per stagione */}
              <Typography variant="h4" sx={{ mb: 2 }}>
                {t("bySeason")}
              </Typography>
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
                    <Typography variant="h6" fontWeight={FONT_WEIGHT.bold}>
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
                          label={`${s.pending} ${t("toPlay")}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {team.matches
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
                                minWidth: 110,
                                justifyContent: "flex-end",
                              }}
                            >
                              {m.ourScore !== null && m.theirScore !== null ? (
                                <Typography variant="body1" fontWeight={FONT_WEIGHT.bold}>
                                  {m.ourScore} – {m.theirScore}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {t("toPlay")}
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
