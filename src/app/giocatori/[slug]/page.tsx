import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
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
  Breadcrumbs,
  Link as MuiLink,
  Button,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SiteHeader from "@/components/layout/SiteHeader";
import PlayerShareButtons from "@/components/common/PlayerShareButtons";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import { format } from "date-fns";
import { ROLE_COLORS, sportRoleLabel as sportRoleLabelRaw } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import { getEntityLabels } from "@/lib/entityLabels";
import { computeBadgeState } from "@/lib/rating/badges";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import BadgeShowcase, { type EarnedBadgeView } from "@/components/rating/BadgeShowcase";
import PointsTrendChart from "@/components/rating/PointsTrendChart";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { slugify } from "@/lib/slugUtils";
import { isMinor } from "@/lib/minors";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import type { Metadata } from "next";
import { MATCH_RESULT_META } from "@/lib/matches/matchResults";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const metaSelect = {
    name: true,
    slug: true,
    sportRole: true,
    sportRoleVariant: true,
    birthDate: true,
    matchStats: { select: { points: true } },
  };
  // Cerca prima tra gli utenti, poi tra i figli (per slug, fallback su ID).
  const userRow = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: metaSelect,
  });
  const childRow = userRow
    ? null
    : await prisma.child.findFirst({ where: { OR: [{ slug }, { id: slug }] }, select: metaSelect });
  const p = userRow ?? childRow;
  if (!p) {
    return buildMetadata({
      title: "Giocatore non trovato",
      description: "Questo giocatore non esiste o non ha un profilo pubblico.",
      path: `/giocatori/${slug}`,
      noindex: true,
    });
  }

  const isChild = !userRow;
  const totalPoints = p.matchStats.reduce((s, m) => s + m.points, 0);
  const matchesPlayed = p.matchStats.length;
  const avgPoints = matchesPlayed > 0 ? (totalPoints / matchesPlayed).toFixed(1) : null;
  const roleLabel = p.sportRole ? sportRoleLabelRaw(p.sportRole, p.sportRoleVariant ?? null) : null;
  const title = p.name ?? "Giocatore";
  const descParts: string[] = [];
  if (roleLabel) descParts.push(roleLabel);
  if (matchesPlayed > 0) {
    descParts.push(`${totalPoints} punti totali`);
    if (avgPoints) descParts.push(`${avgPoints} a partita`);
    descParts.push(`${matchesPlayed} ${matchesPlayed === 1 ? "partita" : "partite"}`);
  }
  const description =
    descParts.length > 0
      ? `${descParts.join(" · ")} · Karibu Baskin, Montecchio Maggiore`
      : `Profilo di ${p.name ?? "atleta"} del Karibu Baskin di Montecchio Maggiore.`;
  return buildMetadata({
    title,
    description,
    // Canonical sullo slug: la pagina risponde anche per id, e due URL che si
    // auto-canonicalizzano non consolidano nulla.
    path: `/giocatori/${p.slug ?? slug}`,
    type: "profile",
    image: "own",
    // Non vengono indicizzati né i profili dei figli (potenzialmente minori)
    // né quelli dei minorenni accertati — anche se hanno un account utente.
    noindex: isChild || isMinor(p.birthDate),
  });
}

export const revalidate = 3600;

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null; // es. "2025-26"

  const [t, tTeams, locale] = await Promise.all([
    getTranslations("players"),
    getTranslations("teams"),
    getLocale(),
  ]);
  const { roleLabel, sportRoleLabel, genderLabel, matchResultLabel } = await getEntityLabels();
  const dateLocale = getDateFnsLocale(locale);

  // Relazioni comuni a User e Child (stesse `include` → stessa forma dei dati).
  const relationSelect = {
    teamMemberships: {
      orderBy: { createdAt: "desc" as const },
      include: {
        team: { select: { id: true, name: true, season: true, color: true, championship: true } },
      },
    },
    matchStats: {
      orderBy: { match: { date: "desc" as const } },
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
    _count: { select: { registrations: true, matchMvps: true } },
    registrations: { where: { attended: true }, select: { id: true } },
    sportRoleHistory: {
      orderBy: { changedAt: "asc" as const },
      select: { sportRole: true, changedAt: true },
    },
  };

  // Cerca per slug (es. "mario-rossi"), con fallback su ID (per link esistenti)
  const userRow = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      name: true,
      image: true,
      customImage: true,
      sportRole: true,
      sportRoleVariant: true,
      gender: true,
      birthDate: true,
      appRole: true,
      ...relationSelect,
    },
  });

  // Se non è un utente (o è un GUEST), prova tra i figli senza account.
  const childRow =
    userRow && userRow.appRole !== "GUEST"
      ? null
      : await prisma.child.findFirst({
          where: { OR: [{ slug }, { id: slug }] },
          select: {
            id: true,
            name: true,
            sportRole: true,
            sportRoleVariant: true,
            gender: true,
            birthDate: true,
            ...relationSelect,
          },
        });

  if ((!userRow || userRow.appRole === "GUEST") && !childRow) notFound();

  // Vista unificata: stesso shape per User e Child (i figli non hanno immagine).
  const player = childRow
    ? {
        playerKey: `c:${childRow.id}`,
        id: childRow.id,
        name: childRow.name,
        image: null as string | null,
        customImage: null as string | null,
        sportRole: childRow.sportRole,
        sportRoleVariant: childRow.sportRoleVariant,
        gender: childRow.gender,
        birthDate: childRow.birthDate,
        teamMemberships: childRow.teamMemberships,
        matchStats: childRow.matchStats,
        _count: childRow._count,
        registrations: childRow.registrations,
        sportRoleHistory: childRow.sportRoleHistory,
      }
    : {
        playerKey: `u:${userRow!.id}`,
        id: userRow!.id,
        name: userRow!.name,
        image: userRow!.image,
        customImage: userRow!.customImage,
        sportRole: userRow!.sportRole,
        sportRoleVariant: userRow!.sportRoleVariant,
        gender: userRow!.gender,
        birthDate: userRow!.birthDate,
        teamMemberships: userRow!.teamMemberships,
        matchStats: userRow!.matchStats,
        _count: userRow!._count,
        registrations: userRow!.registrations,
        sportRoleHistory: userRow!.sportRoleHistory,
      };

  const currentSeason = getCurrentSeason();
  const currentTeams = player.teamMemberships.filter((m) => m.team.season === currentSeason);

  // Medaglie: calcola se l'utente è 1°/2°/3° top scorer per ciascuna (squadra, stagione)
  const teamSeasonPairs = player.teamMemberships.map((m) => ({
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
  // Il "top scorer" è calcolato PER RUOLO: confrontare i punti totali tra ruoli
  // diversi (es. R1 vs R5) non sarebbe equo. Serve quindi il ruolo del giocatore.
  const subjectRole = player.sportRole;
  if (teamSeasonPairs.length > 0 && subjectRole != null) {
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

    // Ruolo (attuale) di ogni marcatore, per limitare il confronto allo stesso ruolo.
    const uIds = [
      ...new Set(allRelevantStats.map((s) => s.userId).filter((x): x is string => !!x)),
    ];
    const cIds = [
      ...new Set(allRelevantStats.map((s) => s.childId).filter((x): x is string => !!x)),
    ];
    const [statUsers, statChildren] = await Promise.all([
      uIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: uIds } },
            select: { id: true, sportRole: true },
          })
        : [],
      cIds.length > 0
        ? prisma.child.findMany({
            where: { id: { in: cIds } },
            select: { id: true, sportRole: true },
          })
        : [],
    ]);
    const roleByKey = new Map<string, number | null>();
    for (const u of statUsers) roleByKey.set(`u:${u.id}`, u.sportRole);
    for (const c of statChildren) roleByKey.set(`c:${c.id}`, c.sportRole);

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
    // Raggruppa per (teamId, season), considerando solo i giocatori dello stesso ruolo
    const byTeamSeason = new Map<string, Agg[]>();
    for (const agg of aggMap.values()) {
      if (roleByKey.get(agg.playerKey) !== subjectRole) continue;
      const k = `${agg.teamId}::${agg.season}`;
      const arr = byTeamSeason.get(k) ?? [];
      arr.push(agg);
      byTeamSeason.set(k, arr);
    }
    const userKey = player.playerKey;
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

  const { earned: earnedBadges, locked: lockedBadges } = computeBadgeState({
    matchStats: player.matchStats.map((ms) => ({
      points: ms.points,
      twoPointers: ms.twoPointers,
      threePointers: ms.threePointers,
      freeThrows: ms.freeThrows,
      shotsAttempted: ms.shotsAttempted,
      fouls: ms.fouls,
      illegalFouls: ms.illegalFouls,
      isLoan: ms.isLoan,
      won: ms.match.result === "WIN",
      date: ms.match.date,
      season: ms.match.team.season,
    })),
    mvpCount: player._count.matchMvps,
    topScorerCount: medals.filter((m) => m.rank === 1).length,
    sportRole: player.sportRole,
  });

  // Data di sblocco dei badge (da EarnedBadge), per mostrare "Sbloccato il …".
  const earnedBadgeRows = await prisma.earnedBadge.findMany({
    where: childRow ? { childId: player.id } : { userId: player.id },
    select: { badgeId: true, unlockedAt: true },
  });
  const unlockedAtMap = new Map(earnedBadgeRows.map((r) => [r.badgeId, r.unlockedAt]));
  const badgeI18n = await getBadgeI18n();
  const earnedBadgesView: EarnedBadgeView[] = earnedBadges.map((b) => {
    const at = unlockedAtMap.get(b.id);
    return {
      ...badgeI18n.translate(b),
      unlockedAtLabel: at
        ? t("unlockedOn", { date: format(at, "d MMM yyyy", { locale: dateLocale }) })
        : null,
    };
  });
  const lockedBadgesView = lockedBadges.map((b) => badgeI18n.translate(b));

  // Stagioni disponibili per il filtro (da matchStats e teamMemberships)
  const seasons = Array.from(
    new Set([
      ...player.matchStats.map((ms) => ms.match.team.season),
      ...player.teamMemberships.map((m) => m.team.season),
    ])
  )
    .sort()
    .reverse();

  // Filtro stagione per le statistiche
  const filteredStats = seasonFilter
    ? player.matchStats.filter((ms) => ms.match.team.season === seasonFilter)
    : player.matchStats;

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

  // Andamento punti per partita in ordine cronologico (filteredStats è desc).
  const trendValues = [...filteredStats].reverse().map((ms) => ms.points);

  // Colore dominante: colore della squadra corrente, fallback all'arancione Karibu
  const playerColor = currentTeams[0]?.team.color ?? "#E65100";

  return (
    <>
      <SiteHeader />

      {/* Hero — design "carta giocatore" condivisibile */}
      <Box
        style={{
          backgroundImage: `linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, ${playerColor} 130%)`,
        }}
        sx={{
          color: "common.white",
          py: { xs: 5, md: 7 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Sfere decorative */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            backgroundColor: alpha("#E65100", 0.1),
            pointerEvents: "none",
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            backgroundColor: alpha("#E65100", 0.06),
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            top: { xs: 12, md: 16 },
            left: { xs: 12, md: 20 },
            right: { xs: 60, md: 80 },
            zIndex: 2,
          }}
        >
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" } }}
          >
            <MuiLink
              href="/squadre"
              underline="hover"
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.65)",
                fontWeight: 500,
                "&:hover": { color: "#fff" },
              }}
            >
              {tTeams("teamBreadcrumb")}
            </MuiLink>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}
              noWrap
            >
              {player.name ?? "Giocatore"}
            </Typography>
          </Breadcrumbs>
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
                src={player.customImage ?? player.image ?? undefined}
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
                {(player.name ?? "?")[0].toUpperCase()}
              </Avatar>
              {player.sportRole && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -8,
                    right: -8,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: ROLE_COLORS[player.sportRole],
                    color: "common.white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "1.2rem",
                    border: "3px solid",
                    borderColor: "secondary.main",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                  }}
                >
                  {player.sportRole}
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
                {player.name ?? "—"}
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
                {player.sportRole && (
                  <Chip
                    label={sportRoleLabel(player.sportRole, player.sportRoleVariant ?? null)}
                    size="small"
                    sx={{
                      bgcolor: ROLE_COLORS[player.sportRole],
                      color: "common.white",
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
                      bgcolor: m.team.color ?? "text.primary",
                      color: contrastText(m.team.color),
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
                    const medalColorToken = isFirst
                      ? "medal.gold"
                      : isSecond
                        ? "medal.silver"
                        : "medal.bronze";
                    const medalLabel = isFirst
                      ? "Top scorer di ruolo"
                      : isSecond
                        ? "2° marcatore di ruolo"
                        : "3° marcatore di ruolo";
                    return (
                      <Box
                        key={`${m.teamId}-${m.season}-${i}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          bgcolor: alpha("#000000", 0.35),
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
                          <EmojiEventsIcon sx={{ fontSize: 13, color: "common.white" }} />
                        </Box>
                        <Box sx={{ lineHeight: 1 }}>
                          <Typography
                            sx={{
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              color: medalColorToken,
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
                              color: "rgba(255,255,255,0.75)",
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
                        bgcolor: alpha("#ffffff", 0.1),
                        color: "common.white",
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
                        color: "common.white",
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
                        color: "rgba(255,255,255,0.75)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {t("totalPoints")}
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
                        color: "rgba(255,255,255,0.75)",
                      }}
                    >
                      {t("perGame")}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: "1.4rem", md: "1.7rem" },
                        fontWeight: 800,
                        color: "common.white",
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
                        color: "rgba(255,255,255,0.75)",
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
                  playerName={player.name ?? "Giocatore"}
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
            {t("athleteInfo")}
          </Typography>
          <Grid container spacing={2}>
            {player.gender && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label={t("gender")} value={genderLabel(player.gender)} />
              </Grid>
            )}
            {/* Privacy: la data di nascita dei minorenni non è mai pubblica. */}
            {player.birthDate && !isMinor(player.birthDate) && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label={t("birthDate")}
                  value={format(new Date(player.birthDate), "d MMMM yyyy", { locale: dateLocale })}
                />
              </Grid>
            )}
            {player.sportRole && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label={t("baskinRole")}
                  value={
                    <Chip
                      label={roleLabel(player.sportRole)}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[player.sportRole],
                        color: "common.white",
                        fontWeight: 700,
                      }}
                    />
                  }
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoRow
                label={t("trainingsLabel")}
                value={
                  player.registrations.length > 0
                    ? `${player._count.registrations} iscrizioni · ${player.registrations.length} presenze`
                    : `${player._count.registrations}`
                }
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Badge / achievement */}
        {(earnedBadgesView.length > 0 || lockedBadgesView.length > 0) && (
          <Box sx={{ mb: 5 }}>
            <BadgeShowcase
              earned={earnedBadgesView}
              locked={lockedBadgesView}
              title={t("achievements")}
              nextTitle={t("nextAchievements")}
            />
          </Box>
        )}

        {/* Storico ruolo sportivo */}
        {player.sportRoleHistory.length > 1 && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {t("roleHistory")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              {player.sportRoleHistory.map((entry, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box>
                    <Chip
                      label={roleLabel(entry.sportRole)}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[entry.sportRole],
                        color: "common.white",
                        fontWeight: 700,
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ display: "block", textAlign: "center", mt: 0.25 }}
                    >
                      {format(new Date(entry.changedAt), "MMM yyyy", { locale: dateLocale })}
                    </Typography>
                  </Box>
                  {i < player.sportRoleHistory.length - 1 && (
                    <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled", mb: 2.5 }} />
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        )}

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
                  {t("statistics")}
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {t("competitive")}
                </Typography>
              </Box>
              {seasons.length > 1 && (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  <Link href={`/giocatori/${slug}`} style={{ textDecoration: "none" }}>
                    <Chip
                      label={t("all")}
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
                { label: t("matches"), value: matchesPlayed, color: "stats.games" },
                { label: t("totalPoints"), value: totalPoints, color: "stats.points" },
                {
                  label: t("avgPoints"),
                  value: matchesPlayed > 0 ? (totalPoints / matchesPlayed).toFixed(1) : "—",
                  color: "text.primary",
                },
                { label: t("twoPointers"), value: totalTwo, color: "stats.twopt" },
                { label: t("threePointers"), value: totalThree, color: "stats.threept" },
                { label: t("freeThrows"), value: totalFreeThrows, color: "stats.ft" },
                { label: t("fouls"), value: totalFouls, color: "stats.fouls" },
                ...(totalIllegalFouls > 0
                  ? [
                      {
                        label: t("illegalFouls"),
                        value: totalIllegalFouls,
                        color: "stats.illegalFouls",
                      },
                    ]
                  : []),
                ...(totalShots > 0
                  ? [
                      {
                        label: t("shotsAttempted"),
                        value: totalShots,
                        color: "stats.shotsAttempted",
                      },
                    ]
                  : []),
              ].map((s) => (
                <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{ p: 2, textAlign: "center", border: "1px solid", borderColor: "divider" }}
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

            {trendValues.length >= 3 && (
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 3 }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, display: "block", mb: 1 }}
                >
                  {t("pointsTrend")}
                </Typography>
                <PointsTrendChart values={trendValues} colorToken={playerColor} />
              </Paper>
            )}

            <Box sx={{ mb: 5 }}>
              <Link
                href={`/giocatori/confronta?a=${encodeURIComponent(slug)}`}
                style={{ textDecoration: "none" }}
              >
                <Button size="small" variant="outlined" startIcon={<CompareArrowsIcon />}>
                  {t("compare")}
                </Button>
              </Link>
            </Box>
          </>
        )}

        {/* Albo medaglie */}
        {medals.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <EmojiEventsIcon sx={{ color: "medal.gold" }} />
                <Typography
                  variant="overline"
                  sx={{ color: "#FFC107", fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  {t("honors")}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                {t("medals")}
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
                    ? "Top scorer di ruolo"
                    : isSecond
                      ? "2° marcatore di ruolo"
                      : "3° marcatore di ruolo";
                  return (
                    <Grid key={`${m.teamId}-${m.season}-${i}`} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          border: "1px solid",
                          borderColor: isFirst ? medalColor : "divider",
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
                            color: "common.white",
                            border: "3px solid #fff",
                            boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
                            flexShrink: 0,
                          }}
                        >
                          <EmojiEventsIcon sx={{ fontSize: 22, color: "common.white" }} />
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
        {player.teamMemberships.length > 0 && (
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
                  {t("teamsSection")}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                {t("competitiveHistory")}
              </Typography>
              <Stack spacing={1.5}>
                {player.teamMemberships.map((m) => (
                  <Link
                    key={m.id}
                    href={`/squadre/${m.team.season}/${slugify(m.team.name)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "stretch",
                        cursor: "pointer",
                        transition: "all 0.12s",
                        "&:hover": { transform: "translateX(4px)", boxShadow: 2 },
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          flexShrink: 0,
                          backgroundColor: m.team.color ?? "primary.main",
                        }}
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
                              <EmojiEventsIcon sx={{ fontSize: 14, color: "medal.gold" }} />
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
                  {t("matches")}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                {t("matchStats")}
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
                        border: "1px solid",
                        borderColor: "divider",
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
                              ? MATCH_RESULT_META[ms.match.result].color
                              : "action.hover",
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
                                {format(new Date(ms.match.date), "d MMMM yyyy", {
                                  locale: dateLocale,
                                })}
                                {ms.match.ourScore !== null && ms.match.theirScore !== null
                                  ? `  ·  ${ms.match.ourScore} – ${ms.match.theirScore}`
                                  : ""}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {ms.match.result && (
                                <Chip
                                  label={matchResultLabel(ms.match.result)}
                                  size="small"
                                  sx={{
                                    backgroundColor: MATCH_RESULT_META[ms.match.result].color,
                                    color: "common.white",
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

        {player.teamMemberships.length === 0 && !hasStats && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <SportsSoccerIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {t("noStats")}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              {t("noStatsDesc")}
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
