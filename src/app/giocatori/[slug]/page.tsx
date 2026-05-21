import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Chip,
  Avatar,
  Stack,
  Divider,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import PlayerShareButtons from "@/components/PlayerShareButtons";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ROLE_LABELS, ROLE_COLORS, GENDER_LABELS, sportRoleLabel } from "@/lib/constants";
import { slugify } from "@/lib/slugUtils";
import { getCurrentSeason } from "@/lib/seasonUtils";
import type { Metadata } from "next";
import type { MatchResult } from "@prisma/client";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Cerca per slug, poi per ID (retrocompatibilità)
  const user = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      name: true,
      sportRole: true,
      sportRoleVariant: true,
      matchStats: { select: { points: true } },
    },
  });
  if (!user) return { title: "Giocatore non trovato" };
  const totalPoints = user.matchStats.reduce((s, m) => s + m.points, 0);
  const matchesPlayed = user.matchStats.length;
  const avgPoints = matchesPlayed > 0 ? (totalPoints / matchesPlayed).toFixed(1) : null;
  const roleLabel = user.sportRole
    ? sportRoleLabel(user.sportRole, user.sportRoleVariant ?? null)
    : null;
  const title = `${user.name ?? "Giocatore"} · Karibu Baskin`;
  const descParts: string[] = [];
  if (roleLabel) descParts.push(roleLabel);
  if (matchesPlayed > 0) {
    descParts.push(`${totalPoints} punti totali`);
    if (avgPoints) descParts.push(`${avgPoints} a partita`);
    descParts.push(`${matchesPlayed} ${matchesPlayed === 1 ? "partita" : "partite"}`);
  }
  const description =
    descParts.length > 0
      ? `${descParts.join(" · ")} — Karibu Baskin, Montecchio Maggiore`
      : `Profilo di ${user.name ?? "atleta"} del Karibu Baskin di Montecchio Maggiore.`;
  const url = `https://karibu-baskin.vercel.app/giocatori/${slug}`;
  return {
    title,
    description,
    openGraph: { title, description, url, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export const revalidate = 3600;

const RESULT_COLOR: Record<MatchResult, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const RESULT_LABEL: Record<MatchResult, string> = {
  WIN: "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null; // es. "2025-26"

  // Cerca per slug (es. "mario-rossi"), con fallback su ID (per link esistenti)
  const user = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      name: true,
      image: true,
      sportRole: true,
      sportRoleVariant: true,
      gender: true,
      birthDate: true,
      createdAt: true,
      appRole: true,
      teamMemberships: {
        orderBy: { createdAt: "desc" },
        include: {
          team: { select: { id: true, name: true, season: true, color: true, championship: true } },
        },
      },
      matchStats: {
        orderBy: { match: { date: "desc" } },
        include: {
          match: {
            include: {
              team: { select: { id: true, name: true, color: true, season: true } },
              opponent: { select: { id: true, name: true, city: true } },
              opponentTeam: { select: { id: true, name: true } },
            },
          },
        },
      },
      _count: { select: { registrations: true } },
      registrations: { where: { attended: true }, select: { id: true } },
    },
  });

  if (!user || user.appRole === "GUEST") notFound();

  const currentSeason = getCurrentSeason();
  const currentTeams = user.teamMemberships.filter((m) => m.team.season === currentSeason);

  // ── Medaglie: calcola se l'utente è 1°/2°/3° top scorer per ciascuna (squadra, stagione)
  const teamSeasonPairs = user.teamMemberships.map((m) => ({
    teamId: m.team.id,
    teamName: m.team.name,
    teamColor: m.team.color,
    season: m.team.season,
  }));
  type Medal = {
    teamId: string;
    teamName: string;
    teamColor: string | null;
    season: string;
    rank: 1 | 2 | 3;
    points: number;
  };
  const medals: Medal[] = [];
  if (teamSeasonPairs.length > 0) {
    // Fetch di tutti i playerStats per le (team, season) del giocatore, esclusi i prestiti.
    // Le partite del team in quella stagione vengono filtrate via match.team.season.
    const allRelevantStats = await prisma.playerMatchStats.findMany({
      where: {
        isLoan: false,
        OR: teamSeasonPairs.map((p) => ({
          match: { teamId: p.teamId, team: { season: p.season } },
        })),
      },
      select: {
        points: true,
        userId: true,
        childId: true,
        match: { select: { teamId: true, team: { select: { season: true } } } },
      },
    });
    // Aggrega per (teamId, season, playerKey)
    type Agg = { teamId: string; season: string; playerKey: string; points: number };
    const aggMap = new Map<string, Agg>();
    for (const s of allRelevantStats) {
      const playerKey = s.userId ? `u:${s.userId}` : s.childId ? `c:${s.childId}` : null;
      if (!playerKey) continue;
      const key = `${s.match.teamId}::${s.match.team.season}::${playerKey}`;
      const existing = aggMap.get(key);
      if (existing) existing.points += s.points;
      else
        aggMap.set(key, {
          teamId: s.match.teamId,
          season: s.match.team.season,
          playerKey,
          points: s.points,
        });
    }
    // Raggruppa per (teamId, season) e ordina
    const byTeamSeason = new Map<string, Agg[]>();
    for (const agg of aggMap.values()) {
      const k = `${agg.teamId}::${agg.season}`;
      const arr = byTeamSeason.get(k) ?? [];
      arr.push(agg);
      byTeamSeason.set(k, arr);
    }
    const userKey = `u:${user.id}`;
    for (const pair of teamSeasonPairs) {
      const arr = byTeamSeason.get(`${pair.teamId}::${pair.season}`);
      if (!arr || arr.length === 0) continue;
      const sorted = [...arr].filter((a) => a.points > 0).sort((a, b) => b.points - a.points);
      const idx = sorted.findIndex((a) => a.playerKey === userKey);
      if (idx === -1) continue;
      const rank = idx + 1;
      if (rank > 3) continue;
      medals.push({
        teamId: pair.teamId,
        teamName: pair.teamName,
        teamColor: pair.teamColor,
        season: pair.season,
        rank: rank as 1 | 2 | 3,
        points: sorted[idx].points,
      });
    }
    // Ordina: stagione più recente prima, rank migliore prima
    medals.sort((a, b) => b.season.localeCompare(a.season) || a.rank - b.rank);
  }

  // Stagioni disponibili per il filtro (da matchStats e teamMemberships)
  const seasons = Array.from(
    new Set([
      ...user.matchStats.map((ms) => ms.match.team.season),
      ...user.teamMemberships.map((m) => m.team.season),
    ])
  )
    .sort()
    .reverse();

  // Filtro stagione per le statistiche
  const filteredStats = seasonFilter
    ? user.matchStats.filter((ms) => ms.match.team.season === seasonFilter)
    : user.matchStats;

  // Aggregazioni statistiche
  const totalPoints = filteredStats.reduce((s, ms) => s + ms.points, 0);
  const totalTwo = filteredStats.reduce((s, ms) => s + ms.twoPointers, 0);
  const totalThree = filteredStats.reduce((s, ms) => s + ms.threePointers, 0);
  const totalFreeThrows = filteredStats.reduce((s, ms) => s + ms.freeThrows, 0);
  const totalFouls = filteredStats.reduce((s, ms) => s + ms.fouls, 0);
  const totalIllegalFouls = filteredStats.reduce((s, ms) => s + ms.illegalFouls, 0);
  const totalShots = filteredStats.reduce((s, ms) => s + ms.shotsAttempted, 0);
  const totalBaskets = totalTwo + totalThree + totalFreeThrows;
  const matchesPlayed = filteredStats.length;

  const hasStats = matchesPlayed > 0;

  // Colore dominante: colore della squadra corrente, fallback all'arancione Karibu
  const playerColor = currentTeams[0]?.team.color ?? "#E65100";

  return (
    <>
      <SiteHeader />

      {/* Hero — design "carta giocatore" condivisibile */}
      <Box
        sx={{
          background: `linear-gradient(150deg, #1A1A1A 0%, #1A1A1A 30%, ${playerColor} 130%)`,
          color: "#fff",
          py: { xs: 5, md: 7 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Iniziale gigante in filigrana */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            right: { xs: -40, md: -20 },
            transform: "translateY(-50%)",
            fontSize: { xs: "14rem", md: "20rem" },
            fontWeight: 900,
            color: "#fff",
            opacity: 0.05,
            lineHeight: 1,
            pointerEvents: "none",
            userSelect: "none",
            fontFamily: "inherit",
          }}
        >
          {(user.name ?? "?")[0].toUpperCase()}
        </Box>

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: { xs: 2.5, md: 3.5 },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {/* Avatar grande con ring */}
            <Box
              sx={{
                position: "relative",
                flexShrink: 0,
              }}
            >
              <Avatar
                src={user.image ?? undefined}
                sx={{
                  width: { xs: 110, md: 140 },
                  height: { xs: 110, md: 140 },
                  fontSize: { xs: 42, md: 54 },
                  fontWeight: 800,
                  bgcolor: playerColor,
                  border: `4px solid ${playerColor}`,
                  boxShadow: `0 8px 28px ${playerColor}66, 0 0 0 6px rgba(0,0,0,0.25)`,
                }}
              >
                {(user.name ?? "?")[0].toUpperCase()}
              </Avatar>
              {user.sportRole && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -8,
                    right: -8,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: ROLE_COLORS[user.sportRole],
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "1.2rem",
                    border: "3px solid #1A1A1A",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                  }}
                >
                  {user.sportRole}
                </Box>
              )}
            </Box>

            {/* Info giocatore */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{
                  color: playerColor,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  lineHeight: 1,
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                ★ Karibu Baskin
              </Typography>
              <Typography
                variant="h2"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "2.2rem", md: "3.4rem" },
                  lineHeight: 1.05,
                  mt: 0.5,
                  textShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}
              >
                {user.name ?? "—"}
              </Typography>

              {/* Ruolo + squadra corrente */}
              <Box
                sx={{
                  mt: 1.5,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  alignItems: "center",
                }}
              >
                {user.sportRole && (
                  <Chip
                    label={sportRoleLabel(user.sportRole, user.sportRoleVariant ?? null)}
                    size="small"
                    sx={{
                      bgcolor: ROLE_COLORS[user.sportRole],
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.72rem",
                    }}
                  />
                )}
                {currentTeams.map((m) => (
                  <Chip
                    key={m.id}
                    icon={
                      m.isCaptain ? (
                        <EmojiEventsIcon
                          sx={{ fontSize: "0.95rem !important", color: "#FFD54F !important" }}
                        />
                      ) : undefined
                    }
                    label={m.team.name}
                    size="small"
                    sx={{
                      bgcolor: m.team.color ?? "#424242",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                    }}
                  />
                ))}
              </Box>

              {/* Medaglie top scorer */}
              {medals.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    gap: 0.75,
                    flexWrap: "wrap",
                  }}
                >
                  {medals.slice(0, 4).map((m, i) => {
                    const isFirst = m.rank === 1;
                    const isSecond = m.rank === 2;
                    const medalColor = isFirst ? "#FFC107" : isSecond ? "#BDBDBD" : "#CD7F32";
                    const medalLabel = isFirst
                      ? "Top scorer"
                      : isSecond
                        ? "2° marcatore"
                        : "3° marcatore";
                    return (
                      <Box
                        key={`${m.teamId}-${m.season}-${i}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          bgcolor: "rgba(0,0,0,0.35)",
                          border: `1.5px solid ${medalColor}`,
                          borderRadius: 999,
                          pl: 0.5,
                          pr: 1.25,
                          py: 0.3,
                        }}
                      >
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: `radial-gradient(circle at 30% 30%, ${medalColor} 0%, ${
                              isFirst ? "#FFA000" : isSecond ? "#9E9E9E" : "#8D6E63"
                            } 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <EmojiEventsIcon sx={{ fontSize: 13, color: "#fff" }} />
                        </Box>
                        <Box sx={{ lineHeight: 1 }}>
                          <Typography
                            sx={{
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              color: medalColor,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              display: "block",
                            }}
                          >
                            {medalLabel}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              color: "#E0E0E0",
                            }}
                          >
                            {m.teamName} · {m.season}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                  {medals.length > 4 && (
                    <Chip
                      label={`+${medals.length - 4}`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.7rem",
                      }}
                    />
                  )}
                </Box>
              )}

              {/* Hero stat: punti totali stagione corrente o overall se nessun filtro */}
              {hasStats && (
                <Box
                  sx={{
                    mt: 2.5,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: "2.4rem", md: "3rem" },
                        fontWeight: 900,
                        color: "#fff",
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                      }}
                    >
                      {totalPoints}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "#E0E0E0",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Punti totali
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: "1.4rem", md: "1.7rem" },
                        fontWeight: 800,
                        color: playerColor,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {(totalPoints / matchesPlayed).toFixed(1)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#BDBDBD",
                      }}
                    >
                      a partita
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: "1.4rem", md: "1.7rem" },
                        fontWeight: 800,
                        color: "#fff",
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {matchesPlayed}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#BDBDBD",
                      }}
                    >
                      {matchesPlayed === 1 ? "partita" : "partite"}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Share section */}
              <Box sx={{ mt: 2.5 }}>
                <PlayerShareButtons
                  playerName={user.name ?? "Giocatore"}
                  totalPoints={totalPoints}
                  matchesPlayed={matchesPlayed}
                  medalsCount={medals.length}
                  slug={slug}
                  playerColor={playerColor}
                />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {/* Info atleta */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Dati atleta
          </Typography>
          <Grid container spacing={2}>
            {user.gender && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Genere" value={GENDER_LABELS[user.gender]} />
              </Grid>
            )}
            {user.birthDate && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label="Data di nascita"
                  value={format(new Date(user.birthDate), "d MMMM yyyy", { locale: it })}
                />
              </Grid>
            )}
            {user.sportRole && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label="Ruolo Baskin"
                  value={
                    <Chip
                      label={ROLE_LABELS[user.sportRole as keyof typeof ROLE_LABELS]}
                      size="small"
                      sx={{ bgcolor: ROLE_COLORS[user.sportRole], color: "#fff", fontWeight: 700 }}
                    />
                  }
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoRow
                label="Allenamenti"
                value={
                  user.registrations.length > 0
                    ? `${user._count.registrations} iscrizioni · ${user.registrations.length} presenze`
                    : `${user._count.registrations}`
                }
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Statistiche agonistiche */}
        {hasStats && (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
                mt: 0.5,
                mb: 3,
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight={700}
                  sx={{ letterSpacing: "0.1em" }}
                >
                  Statistiche
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  Agonismo
                </Typography>
              </Box>
              {seasons.length > 1 && (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  <Link href={`/giocatori/${slug}`} style={{ textDecoration: "none" }}>
                    <Chip
                      label="Tutto"
                      size="small"
                      variant={!seasonFilter ? "filled" : "outlined"}
                      color={!seasonFilter ? "primary" : "default"}
                      sx={{ cursor: "pointer", fontWeight: 600 }}
                    />
                  </Link>
                  {seasons.map((s) => (
                    <Link
                      key={s}
                      href={`/giocatori/${slug}?season=${encodeURIComponent(s)}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Chip
                        label={`Stagione ${s}`}
                        size="small"
                        variant={seasonFilter === s ? "filled" : "outlined"}
                        color={seasonFilter === s ? "primary" : "default"}
                        sx={{ cursor: "pointer", fontWeight: 600 }}
                      />
                    </Link>
                  ))}
                </Box>
              )}
            </Box>
            <Grid container spacing={2} sx={{ mb: 5 }}>
              {[
                { label: "Partite", value: matchesPlayed, color: "#1565C0" },
                { label: "Punti totali", value: totalPoints, color: "#E65100" },
                {
                  label: "Media punti",
                  value: matchesPlayed > 0 ? (totalPoints / matchesPlayed).toFixed(1) : "—",
                  color: "#1A1A1A",
                },
                { label: "Canestri 2pt", value: totalTwo, color: "#2E7D32" },
                { label: "Canestri 3pt", value: totalThree, color: "#7B1FA2" },
                { label: "Tiri liberi", value: totalFreeThrows, color: "#00838F" },
                { label: "Falli", value: totalFouls, color: "#C62828" },
                ...(totalIllegalFouls > 0
                  ? [{ label: "Falli illegali", value: totalIllegalFouls, color: "#B71C1C" }]
                  : []),
                ...(totalShots > 0
                  ? [{ label: "Tiri tentati", value: totalShots, color: "#555" }]
                  : []),
              ].map((s) => (
                <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{ p: 2, textAlign: "center", border: "1px solid rgba(0,0,0,0.07)" }}
                  >
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{ color: s.color, fontSize: { xs: "1.6rem", md: "1.8rem" } }}
                    >
                      {s.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}
                    >
                      {s.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Albo medaglie */}
        {medals.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <EmojiEventsIcon sx={{ color: "#FFC107" }} />
                <Typography
                  variant="overline"
                  sx={{ color: "#FFC107", fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  Albo
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                Medaglie e riconoscimenti
              </Typography>
              <Grid container spacing={2}>
                {medals.map((m, i) => {
                  const isFirst = m.rank === 1;
                  const isSecond = m.rank === 2;
                  const medalColor = isFirst ? "#FFC107" : isSecond ? "#9E9E9E" : "#CD7F32";
                  const medalGradient = isFirst
                    ? "linear-gradient(135deg, #FFD54F 0%, #FFA000 100%)"
                    : isSecond
                      ? "linear-gradient(135deg, #E0E0E0 0%, #9E9E9E 100%)"
                      : "linear-gradient(135deg, #D7A56B 0%, #8D6E63 100%)";
                  const medalLabel = isFirst
                    ? "Top scorer"
                    : isSecond
                      ? "2° marcatore"
                      : "3° marcatore";
                  return (
                    <Grid key={`${m.teamId}-${m.season}-${i}`} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          border: "1px solid",
                          borderColor: isFirst ? medalColor : "rgba(0,0,0,0.07)",
                          boxShadow: isFirst ? `0 4px 16px ${medalColor}33` : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          height: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            borderRadius: "50%",
                            background: medalGradient,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            border: "3px solid #fff",
                            boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
                            flexShrink: 0,
                          }}
                        >
                          <EmojiEventsIcon sx={{ fontSize: 22, color: "#fff" }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: medalColor,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontSize: "0.65rem",
                              display: "block",
                            }}
                          >
                            {medalLabel}
                          </Typography>
                          <Typography variant="body2" fontWeight={800} noWrap>
                            {m.teamName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Stagione {m.season} · {m.points} punti
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </>
        )}

        {/* Squadre */}
        {user.teamMemberships.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <GroupsIcon color="primary" />
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight={700}
                  sx={{ letterSpacing: "0.1em" }}
                >
                  Squadre
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                Storico agonistico
              </Typography>
              <Stack spacing={1.5}>
                {user.teamMemberships.map((m) => (
                  <Link
                    key={m.id}
                    href={`/squadre/${m.team.season}/${slugify(m.team.name)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1px solid rgba(0,0,0,0.07)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "stretch",
                        cursor: "pointer",
                        transition: "all 0.12s",
                        "&:hover": { transform: "translateX(4px)", boxShadow: 2 },
                      }}
                    >
                      <Box
                        sx={{ width: 6, flexShrink: 0, backgroundColor: m.team.color ?? "#E65100" }}
                      />
                      <Box
                        sx={{
                          flex: 1,
                          p: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {m.team.name}
                            </Typography>
                            {m.isCaptain && (
                              <EmojiEventsIcon sx={{ fontSize: 14, color: "#F9A825" }} />
                            )}
                          </Box>
                          {m.team.championship && (
                            <Typography variant="caption" color="text.secondary">
                              {m.team.championship}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={`Stagione ${m.team.season}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                        />
                      </Box>
                    </Paper>
                  </Link>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {/* Partite giocate con statistiche */}
        {filteredStats.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <SportsSoccerIcon color="primary" />
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight={700}
                  sx={{ letterSpacing: "0.1em" }}
                >
                  Partite
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                Statistiche per partita
              </Typography>
              <Stack spacing={1.5}>
                {filteredStats.map((ms) => (
                  <Link
                    key={ms.id}
                    href={`/partite/${ms.match.slug ?? ms.match.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1px solid rgba(0,0,0,0.07)",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "box-shadow 0.12s, transform 0.12s",
                        "&:hover": { boxShadow: 2, transform: "translateX(3px)" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "stretch" }}>
                        <Box
                          sx={{
                            width: 6,
                            flexShrink: 0,
                            backgroundColor: ms.match.result
                              ? RESULT_COLOR[ms.match.result]
                              : "rgba(0,0,0,0.08)",
                          }}
                        />
                        <Box sx={{ flex: 1, p: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {ms.match.team.name} vs{" "}
                                {ms.match.opponent?.name ??
                                  ms.match.opponentTeam?.name ??
                                  "Avversario"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(ms.match.date), "d MMMM yyyy", { locale: it })}
                                {ms.match.ourScore !== null && ms.match.theirScore !== null
                                  ? `  ·  ${ms.match.ourScore} – ${ms.match.theirScore}`
                                  : ""}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {ms.match.result && (
                                <Chip
                                  label={RESULT_LABEL[ms.match.result]}
                                  size="small"
                                  sx={{
                                    backgroundColor: RESULT_COLOR[ms.match.result],
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: "0.7rem",
                                  }}
                                />
                              )}
                              <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            <StatItem label="Punti" value={ms.points} />
                            {ms.twoPointers > 0 && <StatItem label="2pt" value={ms.twoPointers} />}
                            {ms.threePointers > 0 && (
                              <StatItem label="3pt" value={ms.threePointers} />
                            )}
                            {ms.freeThrows > 0 && <StatItem label="TL" value={ms.freeThrows} />}
                            {ms.fouls > 0 && <StatItem label="Falli" value={ms.fouls} />}
                            {ms.illegalFouls > 0 && (
                              <StatItem label="Falli ill." value={ms.illegalFouls} />
                            )}
                            {ms.shotsAttempted > 0 && (
                              <StatItem label="Tiri" value={ms.shotsAttempted} />
                            )}
                          </Box>
                          {ms.notes && (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ display: "block", mt: 1 }}
                            >
                              {ms.notes}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Link>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {user.teamMemberships.length === 0 && !hasStats && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <SportsSoccerIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessuna statistica disponibile
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Le statistiche agonistiche verranno pubblicate al termine delle partite.
            </Typography>
          </Box>
        )}
      </Container>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {typeof value === "string" ? (
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      ) : (
        value
      )}
    </Box>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        {label}
      </Typography>
    </Box>
  );
}
