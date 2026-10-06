import { prisma } from "@/lib/db";
import { isPublicTeam } from "@/lib/matches/mixedTeam";
import JsonLd from "@/components/common/JsonLd";
import { sportsEventJsonLd } from "@/lib/structuredData";
import { isMemberRole } from "@/lib/authRoles";
import { publicSubjects } from "@/lib/minors";
import { PUBLIC_PROFILE_SELECT, withProfileLink } from "@/lib/publicProfile";
import { auth } from "@/lib/authjs";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { buildMetadata } from "@/lib/seo";
import { Container, Typography, Box, Link as MuiLink } from "@mui/material";
import { columnSx } from "@/lib/layout";
import { alpha } from "@mui/material/styles";
import { heroGradient, heroImage, heroResultColor, heroText, heroTint } from "@/lib/heroStyles";
import { Fragment } from "react";
import EntityHero from "@/components/common/EntityHero";
import StaffManageButton from "@/components/common/StaffManageButton";
import MatchDetailTabs from "@/components/matches/MatchDetailTabs";
import MatchAvailabilityCard, {
  type MatchAvailabilityEntity,
} from "@/components/matches/MatchAvailabilityCard";
import MatchCountdown from "@/components/matches/MatchCountdown";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { slugify } from "@/lib/slugUtils";
import { computeStandings } from "@/lib/season/standings";
import { rosterTeamIds } from "@/lib/matches/mixedTeam";
import MatchTabellinoButton from "@/components/matches/MatchTabellinoButton";
import MatchWhereWhen from "@/components/matches/MatchWhereWhen";
import HeadToHeadSection from "@/components/matches/sections/HeadToHeadSection";
import StandingsSection from "@/components/matches/sections/StandingsSection";
import { matchLocation, matchPlaceShort } from "@/lib/clubVenue";
import { matchPhase, showWhereWhen } from "@/lib/matches/matchPhase";
import { loginHref } from "@/lib/loginReturn";
import HomeIcon from "@mui/icons-material/Home";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RoleBadge from "@/components/common/RoleBadge";
import StatusPill from "@/components/common/StatusPill";
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
  // Pareggio: ambra, come l'esito ovunque (UX-29).
  DRAW: heroTint(heroResultColor.DRAW),
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

const CLUB_CREST = "/logo.png";

/**
 * Stemma sopra il nome: un cerchio uguale ai due lati. Bianco sotto, perché i
 * loghi delle avversarie sono quasi sempre disegnati per un fondo chiaro.
 */
const crestSx = {
  gridRow: 1,
  justifySelf: "center",
  width: { xs: 56, sm: 72, md: 88 },
  height: { xs: 56, sm: 72, md: 88 },
  borderRadius: "50%",
  objectFit: "contain",
  display: "block",
  mb: { xs: 0.5, md: 1 },
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
          playsLeague: true,
        },
      },
      opponent: {
        select: { id: true, name: true, city: true, address: true, slug: true, imageUrl: true },
      },
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
  // Fase (UX-50): futura, in corso (3 ore), risultato in arrivo, giocata.
  const phase = matchPhase(match.date, hasScore, now);
  const isUpcoming = phase === "upcoming";
  const isImminent = isUpcoming && new Date(match.date).getTime() - now <= 48 * 60 * 60 * 1000;
  // Luogo da una fonte sola (UX-50): hero, "Dove e quando", JSON-LD ed .ics.
  const location = matchLocation({
    isHome: match.isHome,
    venue: match.venue,
    opponent: match.opponent,
    internal: !!match.opponentTeamId,
  });
  const showWhereWhenBlock = showWhereWhen(match.date, phase, now);

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

  // I convocati li vedono i tesserati (UX-50: ospite = anonimo).
  const canSeeCallups = viewerIsMember;
  // Chi non è tesserato, su una partita non giocata, non vede le tab: niente
  // lucchetto, e i dati delle tab non finiscono nel payload (UX-50). Una
  // partita con le statistiche ma senza punteggio è giocata: come in
  // MatchDetailTabs (`showStatsTab = hasScore || hasStats`), resta uguale per tutti.
  const publicPreview = !viewerIsMember && !hasScore && match.playerStats.length === 0;
  // Con il blocco "Dove e quando" sotto, la riga dell'hero non ripete data e
  // indirizzo (UX-50): restano casa/trasferta e il luogo in breve.
  const placeShort = matchPlaceShort(match, location);

  const heroBg = match.result ? RESULT_GRADIENT[match.result] : heroGradient.band;

  // Senza punteggi c'è una riga sola: nomi centrati rispetto all'orario (o
  // allo stato "In corso" / "Risultato in arrivo").
  const upcomingNameSx = !hasScore ? { alignSelf: "center" } : {};
  const middleLabel =
    phase === "upcoming"
      ? formatRome(new Date(match.date), "HH:mm")
      : phase === "live"
        ? t("phaseLive")
        : phase === "awaitingResult"
          ? t("phaseAwaitingResult")
          : "–";
  // Nomi lunghi ("Polisportiva Dilettantistica …"): su telefono tutti e due
  // un gradino più piccoli, così le parole lunghe stanno nella colonna e i
  // due lati restano identici.
  const longNames = Math.max(match.team.name.length, opponentName.length) > 22;
  const nameSizeSx = longNames
    ? { fontSize: { xs: TYPE_SCALE.sm, sm: TYPE_SCALE.lg, md: TYPE_SCALE.xl2 } }
    : {};

  // Stemmi solo se l'avversaria ha il suo logo: senza, un lato vuoto romperebbe
  // la simmetria del tabellino (UX-35). Nelle amichevoli interne non ci sono.
  const opponentCrest = match.opponent?.imageUrl ?? null;
  const rowShift = opponentCrest ? 1 : 0;

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
          location,
        })}
      />
      <EntityHero
        breadcrumb={[{ label: t("breadcrumb"), href: "/partite" }, { label: matchupTitle }]}
        // Il titolo della partita e' composto da piu' blocchi visivi (squadre,
        // punteggio): l'h1 riassume la partita per chi naviga a voce.
        title={matchupTitle}
        hideTitle
        background={match.imageUrl ? heroImage(match.imageUrl) : heroBg}
        manage={
          <>
            {hasScore && (
              <MatchTabellinoButton
                matchId={match.id}
                filename={`tabellino-${slugify(match.team.name)}-vs-${slugify(opponentName)}-${formatRome(new Date(match.date), "yyyy-MM-dd")}.png`}
              />
            )}
            {/* Una sola strada per gestire la partita: l'admin, come per
                allenamenti, eventi e squadre (UX-23). */}
            {isStaff && (
              <StaffManageButton href={`/admin/partite?edit=${match.id}`} label={t("manage")} />
            )}
          </>
        }
      >
        {/* Il tabellino e' il contenuto dell'entity hero della partita (UX-32). */}
        <Box sx={{ textAlign: "center" }}>
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
                column: 1 | 3,
                crest: string | null
              ) => (
                <Fragment key={key}>
                  {/* Decorativi: il nome della squadra è subito sotto. */}
                  {crest === CLUB_CREST ? (
                    // Il nostro logo ha già il suo disco, niente bianco sotto. Il
                    // file pesa mezzo mega: `next/image` lo serve ridimensionato.
                    <Box
                      component={Image}
                      src={CLUB_CREST}
                      alt=""
                      width={176}
                      height={176}
                      sizes="88px"
                      sx={{ ...crestSx, gridColumn: column }}
                    />
                  ) : crest ? (
                    // Avversaria: `<img>` semplice (l'URL lo scrive lo staff, e un
                    // host non previsto farebbe cadere `next/image`), su fondo bianco.
                    <Box
                      component="img"
                      src={crest}
                      alt=""
                      sx={{ ...crestSx, gridColumn: column, bgcolor: "common.white" }}
                    />
                  ) : null}
                  <Typography
                    component="p"
                    sx={{
                      ...sideNameSx,
                      ...nameSizeSx,
                      ...upcomingNameSx,
                      gridColumn: column,
                      gridRow: 1 + rowShift,
                    }}
                  >
                    {name}
                  </Typography>
                  {hasScore && (
                    <Typography
                      component="p"
                      sx={{ ...scoreSx, gridColumn: column, gridRow: 2 + rowShift }}
                    >
                      {score}
                    </Typography>
                  )}
                </Fragment>
              );
              const ourName = !isPublicTeam(match.team) ? (
                // La Karibu di stagione nascosta non ha una pagina pubblica: solo il nome.
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
              // L'avversaria porta alla sua pagina (precedenti, sede, logo intero).
              const theirName = match.opponent?.slug ? (
                <MuiLink
                  href={`/avversarie/${match.opponent.slug}`}
                  underline="hover"
                  color="inherit"
                >
                  {opponentName}
                </MuiLink>
              ) : (
                opponentName
              );
              // Il nostro stemma è quello del club, per tutte le nostre squadre.
              const ourCrest = opponentCrest ? CLUB_CREST : null;
              const middle = (
                <Typography
                  key="middle"
                  component="p"
                  aria-hidden={hasScore}
                  sx={{
                    gridColumn: 2,
                    gridRow: (hasScore ? 2 : 1) + rowShift,
                    color: heroText.muted,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    // Senza punteggio (UX-50) al centro c'è un orario o uno
                    // stato: peso da orario, non da punteggio.
                    ...(hasScore
                      ? {
                          fontWeight: FONT_WEIGHT.bold,
                          fontSize: { xs: TYPE_SCALE.xl3, md: TYPE_SCALE.xl5 },
                        }
                      : {
                          fontWeight: FONT_WEIGHT.semibold,
                          fontSize: isUpcoming
                            ? { xs: TYPE_SCALE.lg, md: TYPE_SCALE.xl2 }
                            : { xs: TYPE_SCALE.sm, md: TYPE_SCALE.lg },
                          ...(isUpcoming ? {} : { color: heroText.primary, lineHeight: 1.2 }),
                        }),
                  }}
                >
                  {middleLabel}
                </Typography>
              );
              return match.isHome
                ? [
                    side("us", ourName, match.ourScore, 1, ourCrest),
                    middle,
                    side("them", theirName, match.theirScore, 3, opponentCrest),
                  ]
                : [
                    side("them", theirName, match.theirScore, 1, opponentCrest),
                    middle,
                    side("us", ourName, match.ourScore, 3, ourCrest),
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
                // Stato temporale: pastiglia invertita, non l'arancio, che vuol dire
                // "si tocca" (UX-29). Niente alone pulsante (UX-30).
                <StatusPill onDark variant="inverted" icon={<BoltIcon />} label={t("imminent")} />
              )}
            </Box>
          )}

          {/* Riga meta unica: data e ora, casa/trasferta, luogo. Quando sotto
              c'è "Dove e quando" (UX-50) la data e l'indirizzo stanno lì, con
              ora, Maps e calendario: qui solo casa/trasferta e la città. Per
              orientarsi bastano il countdown e l'ora al centro del tabellino. */}
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
            {!showWhereWhenBlock && (
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
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {match.isHome ? (
                <HomeIcon sx={{ fontSize: 14 }} />
              ) : (
                <DirectionsBusIcon sx={{ fontSize: 14 }} />
              )}
              <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold}>
                {match.isHome ? t("home") : t("away")}
              </Typography>
            </Box>
            {/* Mai "Casa" da solo (UX-50): il luogo c'è sempre, anche
                quando è da confermare. */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <PlaceIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold}>
                {(showWhereWhenBlock ? placeShort : location.label) ?? t("whereWhen.locationTbc")}
              </Typography>
            </Box>
          </Box>
        </Box>
      </EntityHero>

      {availabilityEntities.length > 0 && (
        <MatchAvailabilityCard matchId={match.id} entities={availabilityEntities} />
      )}

      {match.mvps.length > 0 && (
        <Container maxWidth="lg" sx={{ mt: { xs: 3, md: 4 }, mb: -2 }}>
          <Box sx={columnSx("main")}>
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
                          <Box sx={{ mt: 0.25 }}>
                            <RoleBadge role={role} />
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
          </Box>
        </Container>
      )}

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("main")}>
          {showWhereWhenBlock && (
            <Box sx={{ mb: publicPreview ? 2 : { xs: 3, md: 4 } }}>
              <MatchWhereWhen matchId={match.id} date={match.date} location={location} />
            </Box>
          )}
          {publicPreview ? (
            <>
              {/* Una riga sola sui convocati, non un lucchetto (UX-50). */}
              <Typography variant="body2" color="text.secondary">
                {t("whereWhen.callupsMembersOnly")}{" "}
                <MuiLink href={loginHref(`/partite/${match.slug ?? match.id}`)} variant="body2">
                  {t("whereWhen.login")}
                </MuiLink>
              </Typography>
              {(prevMatches.length > 0 || (groupStandings && groupStandings.length > 0)) && (
                <Box sx={{ mt: { xs: 4, md: 5 } }}>
                  <HeadToHeadSection
                    prevMatches={prevMatches}
                    opponentName={opponentName}
                    headingComponent="h2"
                  />
                  {groupStandings && (
                    <StandingsSection
                      standings={groupStandings}
                      groupName={match.group?.name ?? null}
                      ourTeamColor={match.team.color}
                      headingComponent="h2"
                    />
                  )}
                </Box>
              )}
            </>
          ) : (
            <MatchDetailTabs
              ourTeamColor={match.team.color}
              playersTeamColor={match.opponentTeamId ? null : match.team.color}
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
          )}
        </Box>
      </Container>
    </>
  );
}
