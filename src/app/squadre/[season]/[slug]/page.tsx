import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Avatar, Stack, Divider,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ROLE_LABELS, ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { slugify } from "@/lib/slugUtils";
import type { Metadata } from "next";
import type { MatchResult } from "@prisma/client";

type Props = { params: Promise<{ season: string; slug: string }> };

/** "202526" → "2025-26" */
function parseSeasonParam(s: string): string {
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return s;
}

async function getTeam(season: string, slug: string) {
  const teams = await prisma.competitiveTeam.findMany({
    where: { season },
    include: {
      memberships: {
        orderBy: [{ isCaptain: "desc" }, { createdAt: "asc" }],
        include: {
          user: { select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true, gender: true, slug: true } },
          child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true, gender: true } },
        },
      },
      matches: {
        orderBy: { date: "desc" },
        include: {
          opponent: { select: { id: true, name: true, city: true } },
        },
      },
    },
  });
  return teams.find((t) => slugify(t.name) === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { season, slug } = await params;
  const team = await getTeam(parseSeasonParam(season), slug);
  if (!team) return { title: "Squadra non trovata" };
  const title = `${team.name} — Stagione ${team.season} | Karibu Baskin`;
  const description = team.championship
    ? `${team.name} nel ${team.championship}. Roster, partite e statistiche della stagione ${team.season}.`
    : `Roster, partite e statistiche di ${team.name} — stagione ${team.season}.`;
  const url = `https://karibu-baskin.vercel.app/squadre/${season}/${slug}`;
  return {
    title,
    description,
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export const revalidate = 3600;

const RESULT_LABEL: Record<MatchResult, string> = {
  WIN: "V",
  LOSS: "S",
  DRAW: "P",
};
const RESULT_COLOR: Record<MatchResult, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const MATCH_TYPE_LABEL = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
} as const;

export default async function TeamProfilePage({ params }: Props) {
  const { season: seasonParam, slug } = await params;
  const season = parseSeasonParam(seasonParam);
  const team = await getTeam(season, slug);

  if (!team) notFound();

  const playedMatches = team.matches.filter((m) => m.result !== null);
  const wins = playedMatches.filter((m) => m.result === "WIN").length;
  const losses = playedMatches.filter((m) => m.result === "LOSS").length;
  const draws = playedMatches.filter((m) => m.result === "DRAW").length;
  const pointsFor = playedMatches.reduce((s, m) => s + (m.ourScore ?? 0), 0);
  const pointsAgainst = playedMatches.reduce((s, m) => s + (m.theirScore ?? 0), 0);

  const teamColor = team.color ?? "#E65100";

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <Box
        sx={{
          background: `linear-gradient(150deg, #1A1A1A 0%, ${teamColor}33 60%, ${teamColor}55 100%)`,
          color: "#fff",
          py: { xs: 6, md: 8 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: `${teamColor}22`, pointerEvents: "none" }} />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip
            label={`Stagione ${team.season}`}
            size="small"
            sx={{ mb: 2, fontWeight: 700, backgroundColor: teamColor, color: "#fff" }}
          />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 1, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            {team.name}
          </Typography>
          {team.championship && (
            <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, mb: 1 }}>
              {team.championship}
            </Typography>
          )}
          {team.description && (
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", maxWidth: 580, mt: 1 }}>
              {team.description}
            </Typography>
          )}
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>

        {/* Statistiche */}
        {playedMatches.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
              Statistiche
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 3 }}>
              Risultati stagione
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: "Vittorie", value: wins, color: "#2E7D32" },
                { label: "Sconfitte", value: losses, color: "#C62828" },
                { label: "Pareggi", value: draws, color: "#E65100" },
                { label: "Partite giocate", value: playedMatches.length, color: "#1565C0" },
                { label: "Punti fatti", value: pointsFor, color: "#1A1A1A" },
                { label: "Punti subiti", value: pointsAgainst, color: "#757575" },
              ].map((s) => (
                <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper elevation={0} sx={{ p: 2, textAlign: "center", border: "1px solid rgba(0,0,0,0.07)" }}>
                    <Typography variant="h4" fontWeight={800} sx={{ color: s.color, fontSize: { xs: "1.8rem", md: "2rem" } }}>
                      {s.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      {s.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Rosa */}
        {team.memberships.length > 0 && (
          <>
            <Divider sx={{ mb: 6 }} />
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <GroupsIcon color="primary" />
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                  Rosa
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                {team.memberships.length} atleti
              </Typography>
              <Grid container spacing={2}>
                {team.memberships.map((m) => {
                  const athlete = m.user ?? m.child;
                  if (!athlete) return null;
                  const isUser = !!m.user;
                  const roleNum = athlete.sportRole;

                  return (
                    <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      {isUser ? (
                        <Link href={`/giocatori/${m.user!.slug ?? m.user!.id}`} style={{ textDecoration: "none" }}>
                          <AthleteCard
                            name={athlete.name ?? "—"}
                            image={"image" in athlete ? athlete.image ?? undefined : undefined}
                            roleNum={roleNum}
                            roleVariant={athlete.sportRoleVariant}
                            isCaptain={m.isCaptain}
                            teamColor={teamColor}
                          />
                        </Link>
                      ) : (
                        <AthleteCard
                          name={athlete.name ?? "—"}
                          roleNum={roleNum}
                          roleVariant={athlete.sportRoleVariant}
                          isCaptain={m.isCaptain}
                          teamColor={teamColor}
                        />
                      )}
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </>
        )}

        {/* Partite */}
        {team.matches.length > 0 && (
          <>
            <Divider sx={{ mb: 6 }} />
            <Box>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Calendario
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 3 }}>
                Partite
              </Typography>
              <Stack spacing={1.5}>
                {team.matches.map((match) => (
                  <Paper key={match.id} elevation={0} sx={{ border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
                    <Box sx={{ display: "flex", alignItems: "stretch" }}>
                      <Box
                        sx={{
                          width: 6,
                          flexShrink: 0,
                          backgroundColor: match.result ? RESULT_COLOR[match.result] : "rgba(0,0,0,0.08)",
                        }}
                      />
                      <Box sx={{ flex: 1, p: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <Box sx={{ minWidth: 80 }}>
                          <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ display: "block" }}>
                            {format(new Date(match.date), "d MMM yyyy", { locale: it })}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                            {match.isHome
                              ? <HomeIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                              : <FlightIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                            }
                            <Typography variant="caption" color="text.disabled">
                              {match.isHome ? "Casa" : "Trasferta"}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 120 }}>
                          <Typography variant="body2" fontWeight={700}>
                            vs {match.opponent.name}
                          </Typography>
                          {match.opponent.city && (
                            <Typography variant="caption" color="text.secondary">
                              {match.opponent.city}
                            </Typography>
                          )}
                        </Box>

                        {(match.ourScore !== null || match.theirScore !== null) && (
                          <Box sx={{ textAlign: "center", minWidth: 60 }}>
                            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1 }}>
                              {match.ourScore ?? "—"} – {match.theirScore ?? "—"}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Chip
                            label={MATCH_TYPE_LABEL[match.matchType]}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                          />
                          {match.result && (
                            <Chip
                              label={RESULT_LABEL[match.result]}
                              size="small"
                              sx={{
                                backgroundColor: RESULT_COLOR[match.result],
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: "0.7rem",
                                minWidth: 28,
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {team.matches.length === 0 && team.memberships.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Stagione in preparazione
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Rosa e calendario verranno pubblicati a breve.
            </Typography>
          </Box>
        )}
      </Container>
    </>
  );
}

function AthleteCard({
  name,
  image,
  roleNum,
  roleVariant,
  isCaptain,
  teamColor,
}: {
  name: string;
  image?: string;
  roleNum: number | null | undefined;
  roleVariant: string | null | undefined;
  isCaptain: boolean;
  teamColor: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        height: "100%",
        transition: "all 0.12s",
        "&:hover": { borderColor: teamColor, backgroundColor: `${teamColor}08` },
      }}
    >
      <Avatar src={image} sx={{ width: 40, height: 40, bgcolor: teamColor, fontSize: 16 }}>
        {name[0].toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography variant="body2" fontWeight={700} noWrap>{name}</Typography>
          {isCaptain && (
            <EmojiEventsIcon sx={{ fontSize: 14, color: "#F9A825", flexShrink: 0 }} />
          )}
        </Box>
        {roleNum && (
          <Chip
            label={sportRoleLabel(roleNum, roleVariant ?? null)}
            size="small"
            sx={{
              mt: 0.25,
              bgcolor: ROLE_COLORS[roleNum],
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.68rem",
              height: 18,
            }}
          />
        )}
      </Box>
    </Paper>
  );
}
