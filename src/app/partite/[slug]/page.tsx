import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { Container, Typography, Box, Chip } from "@mui/material";
import MatchEditButton from "@/components/MatchEditButton";
import SiteHeader from "@/components/SiteHeader";
import MatchDetailTabs from "@/components/MatchDetailTabs";
import MatchCountdown from "@/components/MatchCountdown";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Metadata } from "next";
import type { MatchResult } from "@prisma/client";
import { slugify } from "@/lib/slugUtils";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import GroupsIcon from "@mui/icons-material/Groups";
import BoltIcon from "@mui/icons-material/Bolt";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

const RESULT_META: Record<
  MatchResult,
  { label: string; color: string; bg: string; gradient: string }
> = {
  WIN: {
    label: "Vittoria",
    color: "#2E7D32",
    bg: "#E8F5E9",
    gradient: "linear-gradient(150deg, #1A2E1A 0%, #1B3A1B 60%, #1F4A1F 100%)",
  },
  LOSS: {
    label: "Sconfitta",
    color: "#C62828",
    bg: "#FFEBEE",
    gradient: "linear-gradient(150deg, #2E1A1A 0%, #3A1B1B 60%, #4A1F1F 100%)",
  },
  DRAW: {
    label: "Pareggio",
    color: "#E65100",
    bg: "#FFF3E0",
    gradient: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
  },
};

const MATCH_TYPE_LABEL: Record<string, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

async function getMatch(slug: string) {
  // Prima prova per slug, poi per id (retrocompatibilità)
  const match = await prisma.match.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      team: { select: { id: true, name: true, color: true, season: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true, slug: true } },
      opponentTeam: { select: { id: true, name: true, color: true, season: true } },
      group: { select: { id: true, name: true, championship: true } },
      playerStats: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              slug: true,
              sportRole: true,
              sportRoleVariant: true,
            },
          },
          child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
        },
        orderBy: { points: "desc" },
      },
      callups: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              slug: true,
              sportRole: true,
              sportRoleVariant: true,
            },
          },
          child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
        },
        orderBy: { id: "asc" },
      },
      _count: { select: { playerStats: true } },
    },
  });
  return match;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const match = await getMatch(slug);
  if (!match) return { title: "Partita non trovata" };
  const score = match.ourScore !== null ? `${match.ourScore}–${match.theirScore}` : "vs";
  const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";
  return {
    title: `${match.team.name} ${score} ${opponentName} | Karibu Baskin`,
    description: `Dettaglio partita ${match.team.name} vs ${opponentName} — ${format(new Date(match.date), "d MMMM yyyy", { locale: it })}`,
  };
}

export default async function MatchDetailPage({ params }: Props) {
  const { slug } = await params;
  const [match, session] = await Promise.all([getMatch(slug), auth()]);
  if (!match) notFound();

  // Nome avversario normalizzato (esterno o squadra interna)
  const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";

  const isStaffEarly = session?.user?.appRole === "COACH" || session?.user?.appRole === "ADMIN";

  // Per lo staff: precarica avversarie esterne, squadre interne (per amichevoli
  // tra le nostre squadre) e gironi della squadra/stagione per il dialog di modifica.
  const [opposingTeamsForEdit, internalTeamsForEdit, groupsForEdit] = isStaffEarly
    ? await Promise.all([
        prisma.opposingTeam.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, city: true },
        }),
        prisma.competitiveTeam.findMany({
          where: { id: { not: match.team.id }, season: match.team.season },
          orderBy: { name: "asc" },
          select: { id: true, name: true, season: true },
        }),
        prisma.group.findMany({
          where: { teamId: match.team.id, season: match.team.season },
          orderBy: { name: "asc" },
          select: { id: true, name: true, championship: true, season: true },
        }),
      ])
    : [[], [], []];

  // I convocati sono visibili solo agli utenti loggati con un ruolo
  // diverso da GUEST. Gli ospiti e gli anonimi vedono un invito al login.
  const canSeeCallups = !!session?.user && session.user.appRole !== "GUEST";
  const isStaff = isStaffEarly;

  const meta = match.result ? RESULT_META[match.result] : null;
  const hasScore = match.ourScore !== null && match.theirScore !== null;
  // eslint-disable-next-line react-hooks/purity -- Server Component, renders once
  const now = Date.now();
  const isUpcoming = !hasScore && new Date(match.date).getTime() > now;
  const isImminent = isUpcoming && new Date(match.date).getTime() - now <= 48 * 60 * 60 * 1000;

  const heroBg = meta?.gradient
    ? meta.gradient
    : isUpcoming
      ? "linear-gradient(150deg, #1A1A1A 0%, #4A2A0A 55%, #E65100 130%)"
      : "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)";

  const teamSeasonParam = match.team.season.replace("-", "");
  const teamSlug = slugify(match.team.name);

  const infoCards = [
    {
      icon: <EmojiEventsIcon sx={{ fontSize: 20, color: "primary.main" }} />,
      label: "Competizione",
      value: match.team.championship ?? MATCH_TYPE_LABEL[match.matchType],
    },
    {
      icon: <CalendarTodayIcon sx={{ fontSize: 20, color: "primary.main" }} />,
      label: "Stagione",
      value: match.team.season,
    },
    {
      icon: match.isHome ? (
        <HomeIcon sx={{ fontSize: 20, color: "primary.main" }} />
      ) : (
        <FlightIcon sx={{ fontSize: 20, color: "primary.main" }} />
      ),
      label: "Campo",
      value: match.isHome ? "Casa" : "Trasferta",
    },
    {
      icon: <GroupsIcon sx={{ fontSize: 20, color: "primary.main" }} />,
      label: "Girone",
      value: match.group?.name ?? "—",
      ...(match.group?.id ? { href: `/classifiche` } : {}),
    },
  ];

  return (
    <>
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: heroBg,
          color: "#fff",
          pt: { xs: 4, md: 5 },
          pb: { xs: 5, md: 7 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* sfere decorative */}
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.03)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.02)",
            pointerEvents: "none",
          }}
        />

        {isStaff && (
          <Box
            sx={{
              position: "absolute",
              top: { xs: 12, md: 16 },
              right: { xs: 12, md: 20 },
              zIndex: 2,
            }}
          >
            <MatchEditButton
              matchId={match.id}
              initial={{
                date: match.date,
                isHome: match.isHome,
                venue: match.venue,
                matchType: match.matchType,
                ourScore: match.ourScore,
                theirScore: match.theirScore,
                result: match.result,
                notes: match.notes,
                matchday: match.matchday,
                opponentId: match.opponentId ?? null,
                opponentTeamId: match.opponentTeamId ?? null,
                groupId: match.groupId,
              }}
              opposingTeams={opposingTeamsForEdit}
              internalTeams={internalTeamsForEdit}
              groups={groupsForEdit}
            />
          </Box>
        )}

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          {/* Contenuto centrato */}
          <Box sx={{ textAlign: "center" }}>
            {/* Team + championship */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                mb: 3,
                flexWrap: "wrap",
              }}
            >
              <Link
                href={`/squadre/${teamSeasonParam}/${teamSlug}`}
                style={{ textDecoration: "none" }}
              >
                <Chip
                  label={match.team.name}
                  size="small"
                  sx={{
                    bgcolor: match.team.color ?? "#E65100",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.85 },
                  }}
                />
              </Link>
              {match.group?.name && (
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}
                >
                  {match.group.name}
                </Typography>
              )}
              <Chip
                label={MATCH_TYPE_LABEL[match.matchType]}
                size="small"
                variant="outlined"
                sx={{
                  color: "rgba(255,255,255,0.6)",
                  borderColor: "rgba(255,255,255,0.2)",
                  fontSize: "0.68rem",
                }}
              />
            </Box>

            {/* Score block o Matchup upcoming */}
            {isUpcoming ? (
              <Box sx={{ mb: 3 }}>
                {/* Squadre come main point — in casa: noi vs loro, in trasferta: loro vs noi */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: { xs: 2, md: 5 },
                    mb: 2.5,
                  }}
                >
                  {(() => {
                    const us = (
                      <Box
                        key="us"
                        sx={{ textAlign: "center", flex: "1 1 0", minWidth: 0, maxWidth: 280 }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: "1.8rem", md: "2.8rem" },
                            fontWeight: 900,
                            lineHeight: 1.05,
                            color: "#fff",
                            wordBreak: "break-word",
                          }}
                        >
                          {match.team.name}
                        </Typography>
                      </Box>
                    );
                    const them = (
                      <Box
                        key="them"
                        sx={{ textAlign: "center", flex: "1 1 0", minWidth: 0, maxWidth: 280 }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: "1.8rem", md: "2.8rem" },
                            fontWeight: 900,
                            lineHeight: 1.05,
                            color: "rgba(255,255,255,0.92)",
                            wordBreak: "break-word",
                          }}
                        >
                          {opponentName}
                        </Typography>
                      </Box>
                    );
                    const vs = (
                      <Typography
                        key="vs"
                        sx={{
                          flex: "0 0 auto",
                          color: "rgba(255,255,255,0.35)",
                          fontWeight: 800,
                          fontSize: { xs: "1.2rem", md: "1.6rem" },
                          letterSpacing: "0.05em",
                        }}
                      >
                        vs
                      </Typography>
                    );
                    return match.isHome ? [us, vs, them] : [them, vs, us];
                  })()}
                </Box>

                {/* Countdown + badge come supporto */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <MatchCountdown targetIso={new Date(match.date).toISOString()} />
                  {isImminent && (
                    <Chip
                      icon={<BoltIcon sx={{ fontSize: 14 }} />}
                      label="Imminente"
                      size="small"
                      sx={{
                        fontWeight: 800,
                        bgcolor: "primary.main",
                        color: "#fff",
                        letterSpacing: "0.05em",
                        height: 26,
                        animation: "karibuMatchPulse 1.6s ease-in-out infinite",
                        "@keyframes karibuMatchPulse": {
                          "0%, 100%": { boxShadow: "0 0 0 0 rgba(230,81,0,0.7)" },
                          "50%": { boxShadow: "0 0 0 8px rgba(230,81,0,0)" },
                        },
                      }}
                    />
                  )}
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: { xs: 3, md: 6 },
                  mb: 3,
                }}
              >
                {(() => {
                  const us = (
                    <Box key="us" sx={{ textAlign: "center", minWidth: 100 }}>
                      <Typography
                        sx={{
                          fontSize: { xs: "3.5rem", md: "5rem" },
                          fontWeight: 900,
                          lineHeight: 1,
                          color: "#fff",
                        }}
                      >
                        {hasScore ? match.ourScore : "–"}
                      </Typography>
                    </Box>
                  );
                  const them = (
                    <Box key="them" sx={{ textAlign: "center", minWidth: 100 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.45)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 700,
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        {opponentName}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: "3.5rem", md: "5rem" },
                          fontWeight: 900,
                          lineHeight: 1,
                          color: "rgba(255,255,255,0.55)",
                        }}
                      >
                        {hasScore ? match.theirScore : "–"}
                      </Typography>
                    </Box>
                  );
                  const middle = (
                    <Box key="middle" sx={{ textAlign: "center", flex: "0 0 auto" }}>
                      {meta ? (
                        <Chip
                          label={meta.label}
                          sx={{
                            bgcolor: meta.color,
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            height: 32,
                            px: 1,
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            color: "rgba(255,255,255,0.3)",
                            fontWeight: 700,
                            fontSize: "1.4rem",
                          }}
                        >
                          vs
                        </Typography>
                      )}
                    </Box>
                  );
                  return match.isHome ? [us, middle, them] : [them, middle, us];
                })()}
              </Box>
            )}

            {/* Data e luogo */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <CalendarTodayIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={600}>
                  {format(new Date(match.date), "EEEE d MMMM yyyy · HH:mm", { locale: it })}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {match.isHome ? (
                  <HomeIcon sx={{ fontSize: 14 }} />
                ) : (
                  <FlightIcon sx={{ fontSize: 14 }} />
                )}
                <Typography variant="caption" fontWeight={600}>
                  {match.isHome ? "Casa" : "Trasferta"}
                </Typography>
              </Box>
              {match.venue && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <PlaceIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" fontWeight={600}>
                    {match.venue}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          {/* fine Box centrato */}
        </Container>
      </Box>

      {/* ── Body con tabs ──────────────────────────────────────────────────── */}
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <MatchDetailTabs
          infoCards={infoCards}
          notes={match.notes}
          stats={match.playerStats}
          callups={match.callups}
          matchType={match.matchType}
          canSeeCallups={canSeeCallups}
        />
      </Container>
    </>
  );
}
