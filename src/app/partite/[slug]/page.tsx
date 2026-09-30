import { prisma } from "@/lib/db";
import JsonLd from "@/components/common/JsonLd";
import { sportsEventJsonLd } from "@/lib/structuredData";
import { isMemberRole } from "@/lib/authRoles";
import { publicSubjects } from "@/lib/minors";
import { PUBLIC_PROFILE_SELECT, withProfileLink } from "@/lib/publicProfile";
import { auth } from "@/lib/authjs";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { buildMetadata } from "@/lib/seo";
import { Container, Typography, Box, Chip, Breadcrumbs, Link as MuiLink } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  brandColor,
  heroBottomBorder,
  heroGradient,
  heroImage,
  heroResultColor,
  heroText,
  heroTint,
} from "@/lib/heroStyles";
import { Fragment } from "react";
import { visuallyHidden } from "@mui/utils";
import StaffManageButton from "@/components/common/StaffManageButton";
import MatchDetailTabs from "@/components/matches/MatchDetailTabs";
import MatchAvailabilityCard, {
  type MatchAvailabilityEntity,
} from "@/components/matches/MatchAvailabilityCard";
import MatchCountdown from "@/components/matches/MatchCountdown";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { slugify } from "@/lib/slugUtils";
import { computeStandings } from "@/lib/season/standings";
import { rosterTeamIds } from "@/lib/matches/mixedTeam";
import MatchTabellinoButton from "@/components/matches/MatchTabellinoButton";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { roleColor, ROLE_TEXT_COLOR } from "@/lib/constants";
import { getEntityLabels } from "@/lib/entityLabels";
import { onHover } from "@/lib/hoverStyles";
import { guardianOf } from "@/lib/guardians";
import { TYPE_SCALE } from "@/lib/typeScale";
import { formatRome } from "@/lib/dateUtils";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

const RESULT_GRADIENT: Record<"WIN" | "LOSS" | "DRAW", string> = {
  WIN: heroTint(heroResultColor.WIN),
  LOSS: heroTint(heroResultColor.LOSS),
  DRAW: heroGradient.dark,
};

/** Nome sopra il punteggio: identico per le due squadre (UX-35). */
const sideNameSx = {
  alignSelf: "end",
  color: heroText.primary,
  fontWeight: FONT_WEIGHT.bold,
  lineHeight: 1.15,
  fontSize: { xs: TYPE_SCALE.md, sm: TYPE_SCALE.xl, md: TYPE_SCALE.xl2 },
  // Nomi avversari lunghi: a capo fra le parole, sillabando solo se una
  // parola da sola non ci sta (mai "Dilettantistic-a" a caso).
  overflowWrap: "break-word",
  hyphens: "auto",
} as const;

/** Punteggio: stessa taglia e peso ai due lati, cifre a larghezza fissa. */
const scoreSx = {
  alignSelf: "start",
  color: heroText.primary,
  fontWeight: FONT_WEIGHT.bold,
  lineHeight: 1,
  fontSize: { xs: TYPE_SCALE.xl6, md: TYPE_SCALE.xl8 },
  fontVariantNumeric: "tabular-nums",
} as const;

async function getMatch(slug: string) {
  // Prima prova per slug, poi per id (retrocompatibilità)
  const match = await prisma.match.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          color: true,
          season: true,
          championship: true,
          isMixed: true,
        },
      },
      opponent: { select: { id: true, name: true, city: true, slug: true } },
      opponentTeam: { select: { id: true, name: true, color: true, season: true, isMixed: true } },
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
              birthDate: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              slug: true,
              sportRole: true,
              sportRoleVariant: true,
              birthDate: true,
            },
          },
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
              birthDate: true,
              ...PUBLIC_PROFILE_SELECT,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              slug: true,
              sportRole: true,
              sportRoleVariant: true,
              birthDate: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
      mvps: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              slug: true,
              sportRole: true,
              birthDate: true,
            },
          },
          child: {
            select: { id: true, name: true, slug: true, sportRole: true, birthDate: true },
          },
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
  const [match, locale] = await Promise.all([getMatch(slug), getLocale()]);
  const dateLocale = getDateFnsLocale(locale);
  if (!match) {
    return buildMetadata({
      title: "Partita non trovata",
      description: "Questa partita non esiste o è stata rimossa.",
      path: `/partite/${slug}`,
      noindex: true,
    });
  }
  // Chi gioca in casa prima, come nel tabellino (UX-35): è il titolo
  // dell'anteprima quando si condivide il link.
  const [homeScore, awayScore] = match.isHome
    ? [match.ourScore, match.theirScore]
    : [match.theirScore, match.ourScore];
  const score = homeScore !== null ? `${homeScore}–${awayScore}` : "vs";
  const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";
  const when = formatRome(new Date(match.date), "d MMMM yyyy", { locale: dateLocale });
  return buildMetadata({
    title: match.isHome
      ? `${match.team.name} ${score} ${opponentName}`
      : `${opponentName} ${score} ${match.team.name}`,
    description: `Dettaglio della partita ${match.team.name} contro ${opponentName} del ${when}: risultato, tabellino e statistiche.`,
    path: `/partite/${match.slug ?? slug}`,
    image: "own",
  });
}

export default async function MatchDetailPage({ params }: Props) {
  const { slug } = await params;
  const [match, session, t, locale, { matchResultLabel }] = await Promise.all([
    getMatch(slug),
    auth(),
    getTranslations("matches"),
    getLocale(),
    getEntityLabels(),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  if (!match) notFound();

  // Tutela dei minori: tabellino, convocati e MVP senza minori per chi non è
  // tesserato. publicSubjects toglie comunque birthDate, perché questi dati
  // passano a un componente client e finirebbero nel payload della pagina.
  const viewerIsMember = isMemberRole(session?.user?.appRole);
  match.playerStats = publicSubjects(match.playerStats, viewerIsMember);
  match.callups = publicSubjects(match.callups, viewerIsMember);
  // Convocati: `slug` del link, null per chi non ha un profilo pubblico (vedi
  // @/lib/publicProfile). Toglie anche appRole prima di passare al client.
  const callups = match.callups.map((c) => ({
    ...c,
    user: c.user && withProfileLink(c.user),
  }));
  match.mvps = publicSubjects(match.mvps, viewerIsMember);

  const matchTypeLabel = (type: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      type
    ] ?? type;

  // Nome avversario normalizzato (esterno o squadra interna)
  const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? t("opponent");

  const isStaff = session?.user?.appRole === "COACH" || session?.user?.appRole === "ADMIN";

  // Filtro avversario per scontri diretti
  const opponentWhere = match.opponentId
    ? { opponentId: match.opponentId }
    : match.opponentTeamId
      ? { opponentTeamId: match.opponentTeamId }
      : null;

  const hasScore = match.ourScore !== null && match.theirScore !== null;
  // eslint-disable-next-line react-hooks/purity -- Server Component, renders once
  const now = Date.now();
  const isUpcoming = !hasScore && new Date(match.date).getTime() > now;
  const isImminent = isUpcoming && new Date(match.date).getTime() - now <= 48 * 60 * 60 * 1000;

  // Disponibilità self-service: per partite future, mostra i toggle a chi è
  // membro di una delle squadre della partita (o genitore di un figlio membro).
  // Tre query in fila: parte nel Promise.all qui sotto, insieme alle altre.
  async function loadAvailabilityEntities(): Promise<MatchAvailabilityEntity[]> {
    if (!match || !session?.user?.id || !isUpcoming) return [];
    const uid = session.user.id;
    // La Karibu di stagione schiera i tesserati di tutte le squadre della stagione:
    // chi è in una di queste risponde per la Karibu, e figura con il suo nome.
    const sideTeams = [match.team, match.opponentTeam].filter(
      (t): t is NonNullable<typeof t> => !!t
    );
    const mixedSide = sideTeams.find((t) => t.isMixed) ?? null;
    const teamIds = await rosterTeamIds(sideTeams);
    const memberships = (
      await prisma.teamMembership.findMany({
        where: {
          teamId: { in: teamIds },
          OR: [{ userId: uid }, { child: guardianOf(uid) }],
        },
        select: {
          user: { select: { id: true, name: true } },
          child: { select: { id: true, name: true } },
          team: { select: { id: true, name: true, color: true } },
        },
      })
    ).map((m) => ({
      ...m,
      team: sideTeams.some((t) => t.id === m.team.id) || !mixedSide ? m.team : mixedSide,
    }));
    if (memberships.length === 0) return [];
    const uIds = memberships.map((m) => m.user?.id).filter((x): x is string => !!x);
    const cIds = memberships.map((m) => m.child?.id).filter((x): x is string => !!x);
    const avails = await prisma.matchAvailability.findMany({
      where: {
        matchId: match.id,
        OR: [
          uIds.length > 0 ? { userId: { in: uIds } } : null,
          cIds.length > 0 ? { childId: { in: cIds } } : null,
        ].filter((x): x is NonNullable<typeof x> => x !== null),
      },
      select: { userId: true, childId: true, available: true },
    });
    const byUser = new Map(avails.filter((a) => a.userId).map((a) => [a.userId!, a.available]));
    const byChild = new Map(avails.filter((a) => a.childId).map((a) => [a.childId!, a.available]));
    return memberships
      .map((m): MatchAvailabilityEntity | null => {
        if (m.user) {
          return {
            kind: "user",
            id: m.user.id,
            name: m.user.name ?? "—",
            teamName: m.team.name,
            teamColor: m.team.color,
            available: byUser.get(m.user.id) ?? null,
          };
        }
        if (m.child) {
          return {
            kind: "child",
            id: m.child.id,
            name: m.child.name,
            teamName: m.team.name,
            teamColor: m.team.color,
            available: byChild.get(m.child.id) ?? null,
          };
        }
        return null;
      })
      .filter((e): e is MatchAvailabilityEntity => e !== null);
  }

  const [prevMatchesRaw, ourGroupMatchesRaw, groupMatchesRaw, availabilityEntities] =
    await Promise.all([
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
      loadAvailabilityEntities(),
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

  const heroBg = match.result ? RESULT_GRADIENT[match.result] : heroGradient.dark;

  // Senza punteggi c'è una riga sola: nomi centrati rispetto all'orario.
  const upcomingNameSx = isUpcoming ? { alignSelf: "center" } : {};
  // Nomi lunghi ("Polisportiva Dilettantistica …"): su telefono tutti e due
  // un gradino più piccoli, così le parole lunghe stanno nella colonna e i
  // due lati restano identici.
  const longNames = Math.max(match.team.name.length, opponentName.length) > 22;
  const nameSizeSx = longNames
    ? { fontSize: { xs: TYPE_SCALE.sm, sm: TYPE_SCALE.lg, md: TYPE_SCALE.xl2 } }
    : {};

  // Breadcrumb e h1 con chi gioca in casa prima, come il tabellino (UX-35).
  const matchupTitle = match.isHome
    ? `${match.team.name} vs ${opponentName}`
    : `${opponentName} vs ${match.team.name}`;

  const teamSeasonParam = match.team.season.replace("-", "");
  const teamSlug = slugify(match.team.name);

  return (
    <>
      <JsonLd
        data={sportsEventJsonLd({
          slug: match.slug ?? match.id,
          date: match.date,
          ourTeam: match.team.name,
          opponent: opponentName,
          isHome: match.isHome,
          venue: match.venue,
        })}
      />
      <Box
        style={{
          backgroundImage: match.imageUrl ? heroImage(match.imageUrl) : heroBg,
          backgroundSize: match.imageUrl ? "cover" : undefined,
          backgroundPosition: match.imageUrl ? "center" : undefined,
        }}
        sx={{
          ...heroBottomBorder,
          color: "common.white",
          pt: { xs: 1.5, md: 2 },
          pb: { xs: 5, md: 7 },
          px: { xs: 1.5, md: 2.5 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Breadcrumb e azioni su una riga propria, sopra il tabellino: prima
            erano posizionati sopra il contenuto e a 360 px si toccavano (UX-35). */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            minHeight: 40,
            mb: { xs: 3, md: 4 },
            position: "relative",
            zIndex: 2,
          }}
        >
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              minWidth: 0,
              flex: "1 1 auto",
              "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" },
              "& .MuiBreadcrumbs-li:last-of-type": { minWidth: 0 },
              "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" },
            }}
          >
            <MuiLink
              href="/partite"
              underline="hover"
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.65)",
                // Area di tocco di almeno 24 px (WCAG 2.5.8, UX-22).
                display: "inline-flex",
                alignItems: "center",
                minHeight: 24,
                "&:hover": { color: brandColor.white },
              }}
            >
              {t("breadcrumb")}
            </MuiLink>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }} noWrap>
              {matchupTitle}
            </Typography>
          </Breadcrumbs>

          {/* Azioni: share tabellino + gestione (staff) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            {hasScore && (
              <MatchTabellinoButton
                matchId={match.id}
                filename={`tabellino-${slugify(match.team.name)}-vs-${slugify(opponentName)}-${formatRome(new Date(match.date), "yyyy-MM-dd")}.png`}
              />
            )}
            {/* Una sola strada per gestire la partita: l'admin, come per allenamenti,
                eventi e squadre (UX-23). */}
            {isStaff && (
              <StaffManageButton href={`/admin/partite?edit=${match.id}`} label={t("manage")} />
            )}
          </Box>
        </Box>

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1, px: { xs: 0.5, sm: 2 } }}>
          <Box sx={{ textAlign: "center" }}>
            {/* Il titolo della partita e composto da piu blocchi visivi (squadre,
                punteggio): l'h1 riassume la partita per chi naviga a voce. */}
            <Typography variant="h1" component="h1" sx={visuallyHidden}>
              {matchupTitle}
            </Typography>

            {/* Tabellino simmetrico (UX-35): chi gioca in casa a sinistra, come
                si scrive di solito (è la pagina che si condivide); nelle liste
                invece noi restiamo sempre a sinistra (UX-18). Nome sopra e
                punteggio sotto, stessa taglia e peso sui due lati. Nel DOM ogni
                squadra ha nome e punteggio vicini ("Orsi 52 – Karibu 67"); la
                griglia li mette su due righe, così i punteggi restano allineati
                anche quando un nome va a capo. */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
                columnGap: { xs: 1.5, sm: 2, md: 5 },
                rowGap: { xs: 0.5, md: 1 },
                alignItems: "center",
                maxWidth: 760,
                mx: "auto",
              }}
            >
              {(() => {
                const side = (
                  key: string,
                  name: React.ReactNode,
                  score: number | null,
                  column: 1 | 3
                ) => (
                  <Fragment key={key}>
                    <Typography
                      component="p"
                      sx={{
                        ...sideNameSx,
                        ...nameSizeSx,
                        ...upcomingNameSx,
                        gridColumn: column,
                        gridRow: 1,
                      }}
                    >
                      {name}
                    </Typography>
                    {!isUpcoming && (
                      <Typography component="p" sx={{ ...scoreSx, gridColumn: column, gridRow: 2 }}>
                        {hasScore ? score : "–"}
                      </Typography>
                    )}
                  </Fragment>
                );
                const ourName = match.team.isMixed ? (
                  // La Karibu di stagione non ha una pagina pubblica: solo il nome.
                  match.team.name
                ) : (
                  <MuiLink
                    href={`/squadre/${teamSeasonParam}/${teamSlug}`}
                    underline="hover"
                    color="inherit"
                  >
                    {match.team.name}
                  </MuiLink>
                );
                const middle = (
                  <Typography
                    key="middle"
                    component="p"
                    aria-hidden={!isUpcoming}
                    sx={{
                      gridColumn: 2,
                      gridRow: isUpcoming ? 1 : 2,
                      color: heroText.muted,
                      fontWeight: FONT_WEIGHT.bold,
                      lineHeight: 1,
                      fontSize: { xs: TYPE_SCALE.xl3, md: TYPE_SCALE.xl5 },
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {/* Partita futura: l'orario al posto dei punteggi. */}
                    {isUpcoming ? formatRome(new Date(match.date), "HH:mm") : "–"}
                  </Typography>
                );
                return match.isHome
                  ? [
                      side("us", ourName, match.ourScore, 1),
                      middle,
                      side("them", opponentName, match.theirScore, 3),
                    ]
                  : [
                      side("them", opponentName, match.theirScore, 1),
                      middle,
                      side("us", ourName, match.ourScore, 3),
                    ];
              })()}
            </Box>

            {/* Esito e competizione in una riga: l'esito resta anche nel colore
                dell'hero, niente chip al centro del tabellino. */}
            <Typography
              component="p"
              variant="body2"
              sx={{
                mt: { xs: 2.5, md: 3 },
                color: heroText.secondary,
                fontWeight: FONT_WEIGHT.semibold,
              }}
            >
              {[
                match.result ? (
                  <Box
                    key="result"
                    component="span"
                    sx={{ color: "common.white", fontWeight: FONT_WEIGHT.bold }}
                  >
                    {matchResultLabel(match.result)}
                  </Box>
                ) : null,
                matchTypeLabel(match.matchType),
                match.group?.name ?? null,
              ]
                .filter((part) => part !== null)
                .map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && " · "}
                    {part}
                  </Fragment>
                ))}
            </Typography>

            {/* Countdown + badge come supporto (solo se la partita è ancora futura) */}
            {isUpcoming && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  mt: 2,
                }}
              >
                <MatchCountdown targetIso={new Date(match.date).toISOString()} />
                {isImminent && (
                  <Chip
                    icon={<BoltIcon sx={{ fontSize: 14 }} />}
                    label={t("imminent")}
                    size="small"
                    sx={{
                      fontWeight: FONT_WEIGHT.bold,
                      // Etichetta bianca sul riempimento arancio unico (UX-28): 4,71:1.
                      // Niente alone pulsante (UX-30): l'urgenza la dicono etichetta e colore.
                      bgcolor: "primary.fill",
                      color: "common.white",
                      letterSpacing: "0.05em",
                      height: 26,
                    }}
                  />
                )}
              </Box>
            )}

            {/* Riga meta unica: data e ora, casa/trasferta, luogo */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                columnGap: 2,
                rowGap: 0.5,
                flexWrap: "wrap",
                mt: 2,
                color: heroText.muted,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CalendarTodayIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold}>
                  {/* Partita futura: l'orario sta già al centro del tabellino. */}
                  {formatRome(
                    new Date(match.date),
                    isUpcoming ? "EEEE d MMMM yyyy" : "EEEE d MMMM yyyy · HH:mm",
                    { locale: dateLocale }
                  )}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {match.isHome ? (
                  <HomeIcon sx={{ fontSize: 14 }} />
                ) : (
                  <FlightIcon sx={{ fontSize: 14 }} />
                )}
                <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold}>
                  {match.isHome ? t("home") : t("away")}
                </Typography>
              </Box>
              {match.venue && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PlaceIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold}>
                    {match.venue}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {availabilityEntities.length > 0 && (
        <MatchAvailabilityCard matchId={match.id} entities={availabilityEntities} />
      )}

      {match.mvps.length > 0 && (
        <Container maxWidth="md" sx={{ mt: { xs: 3, md: 4 }, mb: -2 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: RADIUS.lg,
              // Era una card color crema con bordo oro, fuori palette e
              // sbagliata in dark: ora e' una superficie del tema col bordo
              // della medaglia.
              bgcolor: "action.hover",
              border: "1px solid",
              borderColor: "medal.gold",
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
              <EmojiEventsIcon sx={{ color: "medal.gold" }} />
              <Typography
                variant="overline"
                fontWeight={FONT_WEIGHT.bold}
                sx={{ color: "medal.gold" }}
              >
                {t("mvp")}
              </Typography>
              <EmojiEventsIcon sx={{ color: "medal.gold" }} />
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
                const slug = m.user?.slug ?? m.user?.id ?? m.child?.slug ?? m.child?.id ?? null;
                const content = (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: RADIUS.md,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      cursor: slug ? "pointer" : "default",
                      transition: "transform 0.15s",
                      ...(slug ? onHover({ transform: "translateY(-2px)" }) : {}),
                    }}
                  >
                    <EmojiEventsIcon sx={{ color: "medal.gold", fontSize: 20 }} />
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={FONT_WEIGHT.bold}
                        sx={{ color: "text.primary" }}
                      >
                        {name}
                      </Typography>
                      {role && (
                        <Box
                          sx={{
                            display: "inline-block",
                            mt: 0.25,
                            px: 0.75,
                            py: 0.125,
                            borderRadius: RADIUS.sm,
                            bgcolor: roleColor(role),
                            color: ROLE_TEXT_COLOR,
                            fontSize: TYPE_SCALE.xs,
                            fontWeight: FONT_WEIGHT.semibold,
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
          callups={callups}
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
