import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Box, Typography, Paper, Chip, Container, Divider, Alert } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LanguageIcon from "@mui/icons-material/Language";
import PaletteIcon from "@mui/icons-material/Palette";
import StadiumIcon from "@mui/icons-material/Stadium";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Metadata } from "next";
import type { MatchResult, MatchType } from "@prisma/client";
import { getCurrentSeason } from "@/lib/seasonUtils";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

const RESULT_LABELS: Record<MatchResult, string> = {
  WIN: "V",
  LOSS: "P",
  DRAW: "N",
};
const RESULT_COLORS: Record<MatchResult, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const team = await prisma.opposingTeam.findUnique({ where: { slug }, select: { name: true } });
  if (!team) return { title: "Squadra avversaria" };
  return { title: `${team.name} — Storico` };
}

export default async function OpposingTeamPublicPage({ params }: Params) {
  const { slug } = await params;
  const team = await prisma.opposingTeam.findUnique({
    where: { slug },
    include: {
      matches: {
        orderBy: { date: "desc" },
        include: {
          team: { select: { id: true, name: true, season: true, color: true } },
        },
      },
    },
  });
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

  const currentSeason = getCurrentSeason();
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
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <EmojiEventsIcon sx={{ color: "primary.main" }} />
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Squadra avversaria
            </Typography>
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.1, mb: 1.5 }}>
            {team.name}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              color: "text.secondary",
              mb: 1.5,
            }}
          >
            {team.city && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <LocationOnIcon fontSize="small" />
                <Typography variant="body2">{team.city}</Typography>
              </Box>
            )}
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
                  href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "primary.main",
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
              <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ mr: 0.5 }}>
                Affrontata nelle stagioni:
              </Typography>
              {seasonsPlayed.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  variant={s === currentSeason ? "filled" : "outlined"}
                  color={s === currentSeason ? "primary" : "default"}
                  sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                />
              ))}
            </Box>
          )}

          {seasonsPlayed.length > 0 && !playedInCurrentSeason && lastSeason && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Ultima volta affrontata nella stagione <strong>{lastSeason}</strong>. Nessuna partita
              registrata nella stagione corrente ({currentSeason}).
            </Alert>
          )}
        </Box>

        {team.matches.length === 0 ? (
          <Paper elevation={0} variant="outlined" sx={{ p: 6, textAlign: "center" }}>
            <Typography color="text.secondary">
              Non abbiamo ancora giocato partite contro questa squadra.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Totale storico */}
            {totals.played > 0 && (
              <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                  gutterBottom
                >
                  Bilancio storico ({totals.played} partite giocate)
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                  <Chip
                    label={`${totals.wins} V`}
                    sx={{
                      bgcolor: RESULT_COLORS.WIN,
                      color: "#fff",
                      fontWeight: 700,
                      minWidth: 60,
                    }}
                  />
                  <Chip
                    label={`${totals.draws} N`}
                    sx={{
                      bgcolor: RESULT_COLORS.DRAW,
                      color: "#fff",
                      fontWeight: 700,
                      minWidth: 60,
                    }}
                  />
                  <Chip
                    label={`${totals.losses} P`}
                    sx={{
                      bgcolor: RESULT_COLORS.LOSS,
                      color: "#fff",
                      fontWeight: 700,
                      minWidth: 60,
                    }}
                  />
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Punti fatti: <strong style={{ color: "inherit" }}>{totals.scored}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Punti subiti: <strong style={{ color: "inherit" }}>{totals.conceded}</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: totals.scored - totals.conceded >= 0 ? "success.dark" : "error.dark",
                      fontWeight: 700,
                    }}
                  >
                    Differenza: {totals.scored - totals.conceded >= 0 ? "+" : ""}
                    {totals.scored - totals.conceded}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Per stagione */}
            <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
              Per stagione
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
                  <Typography variant="h6" fontWeight={800}>
                    Stagione {s.season}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                    {s.played > 0 && (
                      <>
                        <Chip
                          label={`${s.wins} V`}
                          size="small"
                          sx={{ bgcolor: RESULT_COLORS.WIN, color: "#fff", fontWeight: 700 }}
                        />
                        <Chip
                          label={`${s.draws} N`}
                          size="small"
                          sx={{ bgcolor: RESULT_COLORS.DRAW, color: "#fff", fontWeight: 700 }}
                        />
                        <Chip
                          label={`${s.losses} P`}
                          size="small"
                          sx={{ bgcolor: RESULT_COLORS.LOSS, color: "#fff", fontWeight: 700 }}
                        />
                        <Chip
                          label={`${s.scored}–${s.conceded}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </>
                    )}
                    {s.pending > 0 && (
                      <Chip
                        label={`${s.pending} da giocare`}
                        size="small"
                        variant="outlined"
                        color="primary"
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
                            borderRadius: 1,
                            "&:hover": { bgcolor: "rgba(0,0,0,0.03)" },
                          }}
                        >
                          <Box sx={{ minWidth: 90 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {format(new Date(m.date), "d MMM yy", { locale: it })}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.4,
                                color: "text.disabled",
                              }}
                            >
                              {m.isHome ? (
                                <HomeIcon sx={{ fontSize: 11 }} />
                              ) : (
                                <FlightIcon sx={{ fontSize: 11 }} />
                              )}
                              <Typography variant="caption">
                                {m.isHome ? "Casa" : "Trasferta"}
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
                              <Chip
                                label={m.team.name}
                                size="small"
                                sx={{
                                  bgcolor: m.team.color ?? "primary.main",
                                  color: "#fff",
                                  fontWeight: 700,
                                  fontSize: "0.68rem",
                                  height: 20,
                                }}
                              />
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ fontSize: "0.68rem" }}
                              >
                                {MATCH_TYPE_LABELS[m.matchType]}
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
                              <Typography variant="body1" fontWeight={800}>
                                {m.ourScore} – {m.theirScore}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                da giocare
                              </Typography>
                            )}
                            {m.result && (
                              <Chip
                                label={RESULT_LABELS[m.result]}
                                size="small"
                                sx={{
                                  bgcolor: RESULT_COLORS[m.result],
                                  color: "#fff",
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
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
      </Container>
    </>
  );
}
