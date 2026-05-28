import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { Container, Typography, Box, Chip, Breadcrumbs, Link as MuiLink } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MatchEditButton from "@/components/MatchEditButton";
import SiteHeader from "@/components/SiteHeader";
import MatchDetailTabs from "@/components/MatchDetailTabs";
import MatchCountdown from "@/components/MatchCountdown";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Metadata } from "next";
import { slugify } from "@/lib/slugUtils";
import { computeStandings } from "@/lib/standings";
import MatchTabellinoButton from "@/components/MatchTabellinoButton";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { ROLE_COLORS } from "@/lib/constants";
import { MATCH_RESULT_META } from "@/lib/matchResults";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

const RESULT_GRADIENT: Record<"WIN" | "LOSS" | "DRAW", string> = {
  WIN: "linear-gradient(150deg, #1A2E1A 0%, #1B3A1B 60%, #1F4A1F 100%)",
  LOSS: "linear-gradient(150deg, #2E1A1A 0%, #3A1B1B 60%, #4A1F1F 100%)",
  DRAW: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
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
      mvps: {
        include: {
          user: {
            select: { id: true, name: true, image: true, slug: true, sportRole: true },
          },
          child: { select: { id: true, name: true, sportRole: true } },
        },
        orderBy: { createdAt: "asc" },
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

  // Filtro avversario per scontri diretti
  const opponentWhere = match.opponentId
    ? { opponentId: match.opponentId }
    : match.opponentTeamId
      ? { opponentTeamId: match.opponentTeamId }
      : null;

  const [
    prevMatchesRaw,
    ourGroupMatchesRaw,
    groupMatchesRaw,
    opposingTeamsForEdit,
    internalTeamsForEdit,
    groupsForEdit,
  ] = await Promise.all([
    opponentWhere
      ? prisma.match.findMany({
          where: { id: { not: match.id }, teamId: match.team.id, ...opponentWhere },
          select: {
            id: true,
            slug: true,
            date: true,
            ourScore: true,
            theirScore: true,
            result: true,
            isHome: true,
          },
          orderBy: { date: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    match.groupId
      ? prisma.match.findMany({
          where: { groupId: match.groupId, teamId: match.team.id },
          select: {
            ourScore: true,
            theirScore: true,
            teamId: true,
            opponent: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    match.groupId
      ? prisma.groupMatch.findMany({
          where: { groupId: match.groupId },
          select: {
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    isStaffEarly
      ? prisma.opposingTeam.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, city: true },
        })
      : Promise.resolve([]),
    isStaffEarly
      ? prisma.competitiveTeam.findMany({
          where: { id: { not: match.team.id }, season: match.team.season },
          orderBy: { name: "asc" },
          select: { id: true, name: true, season: true },
        })
      : Promise.resolve([]),
    isStaffEarly
      ? prisma.group.findMany({
          where: {
            competitiveTeams: { some: { competitiveTeamId: match.team.id } },
            season: match.team.season,
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true, championship: true, season: true },
        })
      : Promise.resolve([]),
  ]);

  const groupStandings =
    match.groupId && ourGroupMatchesRaw.length > 0
      ? computeStandings(
          [{ id: match.team.id, name: match.team.name }],
          ourGroupMatchesRaw,
          groupMatchesRaw
        )
      : null;

  const prevMatches = prevMatchesRaw.map((m) => ({
    id: m.id,
    slug: m.slug,
    date: m.date.toISOString(),
    ourScore: m.ourScore,
    theirScore: m.theirScore,
    result: m.result as string | null,
    isHome: m.isHome,
  }));

  // I convocati sono visibili solo agli utenti loggati con un ruolo
  // diverso da GUEST. Gli ospiti e gli anonimi vedono un invito al login.
  const canSeeCallups = !!session?.user && session.user.appRole !== "GUEST";
  const isStaff = isStaffEarly;

  const meta = match.result ? MATCH_RESULT_META[match.result] : null;
  const hasScore = match.ourScore !== null && match.theirScore !== null;
  // eslint-disable-next-line react-hooks/purity -- Server Component, renders once
  const now = Date.now();
  const isUpcoming = !hasScore && new Date(match.date).getTime() > now;
  const isImminent = isUpcoming && new Date(match.date).getTime() - now <= 48 * 60 * 60 * 1000;

  const heroBg = match.result
    ? RESULT_GRADIENT[match.result]
    : isUpcoming
      ? "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #E65100 130%)"
      : "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)";

  const teamSeasonParam = match.team.season.replace("-", "");
  const teamSlug = slugify(match.team.name);

  return (
    <>
      <SiteHeader />

      <Box
        style={{
          backgroundImage: match.imageUrl
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${match.imageUrl})`
            : heroBg,
          backgroundSize: match.imageUrl ? "cover" : undefined,
          backgroundPosition: match.imageUrl ? "center" : undefined,
        }}
        sx={{
          color: "common.white",
          pt: { xs: 4, md: 5 },
          pb: { xs: 5, md: 7 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
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
              href="/partite"
              underline="hover"
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.65)",
                fontWeight: 500,
                "&:hover": { color: "#fff" },
              }}
            >
              Partite
            </MuiLink>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}
              noWrap
            >
              {match.team.name} vs {opponentName}
            </Typography>
          </Breadcrumbs>
        </Box>

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

        {/* Azioni in alto a destra: share tabellino + edit (staff) */}
        <Box
          sx={{
            position: "absolute",
            top: { xs: 12, md: 16 },
            right: { xs: 12, md: 20 },
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {hasScore && (
            <MatchTabellinoButton
              matchId={match.id}
              filename={`tabellino-${slugify(match.team.name)}-vs-${slugify(opponentName)}-${format(new Date(match.date), "yyyy-MM-dd")}.png`}
            />
          )}
          {isStaff && (
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
          )}
        </Box>

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
                    bgcolor: match.team.color ?? "primary.main",
                    color: "common.white",
                    fontWeight: 700,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.85 },
                  }}
                />
              </Link>
              {match.group?.name && (
                <Typography
                  variant="caption"
                  sx={{ color: alpha("#ffffff", 0.5), fontWeight: 600 }}
                >
                  {match.group.name}
                </Typography>
              )}
              <Chip
                label={MATCH_TYPE_LABEL[match.matchType]}
                size="small"
                variant="outlined"
                sx={{
                  color: alpha("#ffffff", 0.6),
                  borderColor: alpha("#ffffff", 0.2),
                  fontSize: "0.68rem",
                }}
              />
            </Box>

            {/* Score block o Matchup upcoming (anche per partite passate senza risultato) */}
            {!hasScore ? (
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
                            color: "common.white",
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
                            color: alpha("#ffffff", 0.92),
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
                          color: alpha("#ffffff", 0.35),
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

                {/* Countdown + badge come supporto (solo se la partita è ancora futura) */}
                {isUpcoming && (
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
                          color: "common.white",
                          letterSpacing: "0.05em",
                          height: 26,
                          animation: "karibuMatchPulse 1.6s ease-in-out infinite",
                          "@keyframes karibuMatchPulse": {
                            "0%, 100%": {
                              boxShadow: `0 0 0 0 ${alpha("#E65100", 0.7)}`,
                            },
                            "50%": {
                              boxShadow: `0 0 0 8px ${alpha("#E65100", 0)}`,
                            },
                          },
                        }}
                      />
                    )}
                  </Box>
                )}
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
                          color: "common.white",
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
                          color: alpha("#ffffff", 0.45),
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
                          color: alpha("#ffffff", 0.55),
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
                            color: "common.white",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            height: 32,
                            px: 1,
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            color: alpha("#ffffff", 0.3),
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
                  color: alpha("#ffffff", 0.5),
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
                  color: alpha("#ffffff", 0.5),
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

      {match.mvps.length > 0 && (
        <Container maxWidth="md" sx={{ mt: { xs: 3, md: 4 }, mb: -2 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              background: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)",
              border: "1px solid #F9A825",
              boxShadow: "0 2px 8px rgba(249,168,37,0.15)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1.5,
                justifyContent: "center",
              }}
            >
              <EmojiEventsIcon sx={{ color: "#F57F17" }} />
              <Typography
                variant="overline"
                fontWeight={800}
                sx={{ color: "#F57F17", letterSpacing: "0.12em" }}
              >
                MVP della partita
              </Typography>
              <EmojiEventsIcon sx={{ color: "#F57F17" }} />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                justifyContent: "center",
              }}
            >
              {match.mvps.map((m) => {
                const person = m.user ?? m.child;
                if (!person) return null;
                const role = person.sportRole;
                const name = person.name ?? "—";
                const slug = m.user?.slug ?? null;
                const content = (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      bgcolor: "background.paper",
                      border: `1px solid ${alpha("#F9A825", 0.3)}`,
                      cursor: slug ? "pointer" : "default",
                      transition: "transform 0.15s",
                      "&:hover": slug ? { transform: "translateY(-2px)" } : undefined,
                    }}
                  >
                    <EmojiEventsIcon sx={{ color: "medal.gold", fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={800} sx={{ color: "text.primary" }}>
                        {name}
                      </Typography>
                      {role && (
                        <Box
                          sx={{
                            display: "inline-block",
                            mt: 0.25,
                            px: 0.75,
                            py: 0.125,
                            borderRadius: 0.5,
                            bgcolor: ROLE_COLORS[role],
                            color: "common.white",
                            fontSize: "0.6rem",
                            fontWeight: 700,
                          }}
                        >
                          R{role}
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
                return slug ? (
                  <Link key={m.id} href={`/giocatori/${slug}`} style={{ textDecoration: "none" }}>
                    {content}
                  </Link>
                ) : (
                  <Box key={m.id}>{content}</Box>
                );
              })}
            </Box>
          </Box>
        </Container>
      )}

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <MatchDetailTabs
          notes={match.notes}
          stats={match.playerStats}
          callups={match.callups}
          canSeeCallups={canSeeCallups}
          hasScore={hasScore}
          prevMatches={prevMatches}
          groupStandings={groupStandings}
          ourTeamId={match.team.id}
          groupName={match.group?.name ?? null}
          opponentName={opponentName}
          matchId={match.id}
          isStaff={isStaff}
        />
      </Container>
    </>
  );
}
