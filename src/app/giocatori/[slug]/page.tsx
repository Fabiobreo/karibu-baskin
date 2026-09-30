import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { formatDecimal } from "@/lib/numberFormat";
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
  Button,
  Alert,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { brandColor, heroGradient, heroMedal, heroTint, heroText } from "@/lib/heroStyles";
import { teamColor, teamFill } from "@/lib/teamColors";
import EntityHero from "@/components/common/EntityHero";
import MedalDisc from "@/components/rating/MedalDisc";
import PlayerShareButtons from "@/components/common/PlayerShareButtons";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import { sportRoleLabel as sportRoleLabelRaw, roleColorSx, roleColor } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import { getEntityLabels } from "@/lib/entityLabels";
import { computeBadgeState } from "@/lib/rating/badges";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import BadgeShowcase, { type EarnedBadgeView } from "@/components/rating/BadgeShowcase";
import PointsTrendChart from "@/components/rating/PointsTrendChart";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { slugify } from "@/lib/slugUtils";
import { isMinor, isMinorChild } from "@/lib/minors";
import { auth } from "@/lib/authjs";
import { hasRole, isMemberRole } from "@/lib/authRoles";
import { userHasPublicProfile } from "@/lib/publicProfile";
import { guardianOf } from "@/lib/guardians";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import type { Metadata } from "next";
import { MATCH_RESULT_META } from "@/lib/matches/matchResults";
import { buildMetadata } from "@/lib/seo";
import { onHover } from "@/lib/hoverStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { formatRome } from "@/lib/dateUtils";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
  const rawUser = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { ...metaSelect, appRole: true },
  });
  // Stessa regola della pagina: un utente senza profilo pubblico (GUEST, o
  // genitore che non gioca) non esiste, e lo slug può valere per un figlio.
  const rawUserIsPublic =
    !!rawUser && userHasPublicProfile({ ...rawUser, matchesPlayed: rawUser.matchStats.length });
  const childRow = rawUserIsPublic
    ? null
    : await prisma.child.findFirst({ where: { OR: [{ slug }, { id: slug }] }, select: metaSelect });
  // Lo staff apre anche i profili non pubblici (vedi la pagina): per lui il
  // titolo è il nome, per tutti gli altri resta "non trovato".
  const staffOnly =
    !!rawUser &&
    !rawUserIsPublic &&
    !childRow &&
    hasRole((await auth())?.user?.appRole ?? "GUEST", "COACH");
  const userRow = rawUserIsPublic || staffOnly ? rawUser : null;
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
  // Profilo di un minore visto da chi non è tesserato: la pagina risponde 404
  // (vedi sotto), e il titolo non deve anticipare il nome.
  const minorProfile = isChild ? isMinorChild(p.birthDate) : isMinor(p.birthDate);
  if (minorProfile && !isMemberRole((await auth())?.user?.appRole)) {
    return buildMetadata({
      title: "Giocatore non trovato",
      description: "Questo giocatore non esiste o non ha un profilo pubblico.",
      path: `/giocatori/${slug}`,
      noindex: true,
    });
  }
  const totalPoints = p.matchStats.reduce((s, m) => s + m.points, 0);
  const matchesPlayed = p.matchStats.length;
  // Metadati solo in italiano (lingua degli URL senza cookie), quindi "it".
  const avgPoints = matchesPlayed > 0 ? formatDecimal(totalPoints / matchesPlayed, "it") : null;
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
    noindex: isChild || staffOnly || isMinor(p.birthDate),
  });
}

export const revalidate = 3600;

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null; // es. "2025-26"

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

  // Tutto quello che non dipende dal giocatore parte insieme alla sua ricerca:
  // prima erano sette attese in fila, e con il database a freddo si sommavano.
  // La ricerca tra i figli parte anche lei subito (è una query leggera) e il
  // risultato si usa solo se tra gli utenti non c'è, o è un GUEST.
  const [
    t,
    tTeams,
    locale,
    { sportRoleLabel, matchResultLabel },
    currentSeason,
    badgeI18n,
    userRow,
    childMatch,
    viewerSession,
  ] = await Promise.all([
    getTranslations("players"),
    getTranslations("teams"),
    getLocale(),
    getEntityLabels(),
    getCurrentSeasonLabel(),
    getBadgeI18n(),
    // Cerca per slug (es. "mario-rossi"), con fallback su ID (per link esistenti)
    prisma.user.findFirst({
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
    }),
    prisma.child.findFirst({
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
    }),
    auth(),
  ]);
  const dateLocale = getDateFnsLocale(locale);

  // Un utente senza profilo pubblico (GUEST, o genitore che non gioca) non
  // esiste qui: vale il figlio senza account con lo stesso slug, se c'è.
  const userIsPublic =
    !!userRow && userHasPublicProfile({ ...userRow, matchesPlayed: userRow.matchStats.length });
  const childRow = userIsPublic ? null : childMatch;

  // Lo staff apre anche i profili che non sono pubblici (il genitore che non
  // gioca, un GUEST): servono per ritrovare la persona e raggiungere i suoi
  // figli. Per tutti gli altri restano un 404, e la pagina non si indicizza.
  const viewerRole = viewerSession?.user?.appRole;
  const viewerIsStaff = !!viewerRole && hasRole(viewerRole, "COACH");
  const staffOnly = !!userRow && !userIsPublic && !childRow && viewerIsStaff;

  if (!userIsPublic && !childRow && !staffOnly) notFound();

  // Tutela dei minori: il profilo pubblico di un minore non esiste per chi non
  // è tesserato. La famiglia ritrova gli stessi dati in /profilo, lo staff
  // nell'area admin.
  const isMinorProfile = childRow ? isMinorChild(childRow.birthDate) : isMinor(userRow!.birthDate);
  if (isMinorProfile && !isMemberRole(viewerRole)) notFound();

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
        teamMemberships: userRow!.teamMemberships,
        matchStats: userRow!.matchStats,
        _count: userRow!._count,
        registrations: userRow!.registrations,
        sportRoleHistory: userRow!.sportRoleHistory,
      };

  const currentTeams = player.teamMemberships.filter((m) => m.team.season === currentSeason);
  // Squadre dalla stagione piu' recente: la query le ordina per data di
  // iscrizione, che non segue le stagioni (una rosa passata si puo' creare dopo).
  const membershipsBySeason = [...player.teamMemberships].sort((a, b) =>
    b.team.season.localeCompare(a.team.season)
  );
  const latestMembership = membershipsBySeason[0] ?? null;
  // Squadre nell'hero: quelle della stagione in corso, altrimenti l'ultima a
  // cui il giocatore e' appartenuto (con la stagione accanto al nome).
  const heroTeams =
    currentTeams.length > 0 ? currentTeams : latestMembership ? [latestMembership] : [];
  // Squadra da usare come genitore nel breadcrumb, con la stessa regola.
  const breadcrumbTeam = heroTeams[0]?.team ?? null;
  const careerMatches = player.matchStats.length;
  // Allenamenti: le presenze se lo staff le ha segnate, altrimenti le iscrizioni.
  const attendedCount = player.registrations.length;
  const trainingsValue = attendedCount > 0 ? attendedCount : player._count.registrations;

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
  // Il "top scorer" è calcolato PER RUOLO: confrontare i punti totali tra ruoli
  // diversi (es. R1 vs R5) non sarebbe equo. Serve quindi il ruolo del giocatore.
  const subjectRole = player.sportRole;
  async function loadMedals(): Promise<Medal[]> {
    const medals: Medal[] = [];
    if (teamSeasonPairs.length === 0 || subjectRole == null) return medals;
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
    return medals.sort((a, b) => b.season.localeCompare(a.season) || a.rank - b.rank);
  }

  // Medaglie e data di sblocco dei badge (da EarnedBadge, per "Sbloccato il …")
  // dipendono solo dal giocatore: partono insieme.
  const [medals, earnedBadgeRows] = await Promise.all([
    loadMedals(),
    prisma.earnedBadge.findMany({
      where: childRow ? { childId: player.id } : { userId: player.id },
      select: { badgeId: true, unlockedAt: true },
    }),
  ]);

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

  const unlockedAtMap = new Map(earnedBadgeRows.map((r) => [r.badgeId, r.unlockedAt]));
  const earnedBadgesView: EarnedBadgeView[] = earnedBadges.map((b) => {
    const at = unlockedAtMap.get(b.id);
    return {
      ...badgeI18n.translate(b),
      unlockedAtLabel: at
        ? t("unlockedOn", { date: formatRome(at, "d MMM yyyy", { locale: dateLocale }) })
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

  // Figli dell'utente, solo per lo staff: dal profilo del genitore si arriva a
  // quello di ogni figlio. Un figlio con un proprio account ha il profilo
  // dell'account, gli altri quello della scheda figlio (slug, o id se manca).
  const guardedChildren =
    viewerIsStaff && userRow && !childRow
      ? (
          await prisma.child.findMany({
            where: guardianOf(userRow.id),
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
              sportRole: true,
              user: { select: { id: true, slug: true } },
            },
          })
        ).map((c) => ({
          id: c.id,
          name: c.name,
          sportRole: c.sportRole,
          href: c.user ? `/giocatori/${c.user.slug ?? c.user.id}` : `/giocatori/${c.slug ?? c.id}`,
        }))
      : [];

  // Andamento punti per partita in ordine cronologico (filteredStats è desc).
  const trendValues = [...filteredStats].reverse().map((ms) => ms.points);

  // Tinta della squadra corrente (UX-29); senza tinta nessun segno di colore,
  // mai l'arancio come ripiego.
  const playerHue = teamColor(currentTeams[0]?.team.color);

  return (
    <>
      {/* Hero — design "carta giocatore" condivisibile, sull'entity hero comune (UX-32) */}
      <EntityHero
        breadcrumb={[
          { label: tTeams("teamBreadcrumb"), href: "/squadre" },
          // Il profilo giocatore non sta sotto /squadre: il genitore reale e'
          // la sua squadra. Senza squadra ci si ferma a "Squadre".
          ...(breadcrumbTeam
            ? [{ label: breadcrumbTeam.name, href: teamHref(breadcrumbTeam) }]
            : []),
          { label: player.name ?? "Giocatore" },
        ]}
        title={player.name ?? "—"}
        background={playerHue ? heroTint(playerHue) : heroGradient.band}
        leading={
          // Avatar grande con ring
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
                fontSize: { xs: TYPE_SCALE.xl5, md: TYPE_SCALE.xl6 },
                fontWeight: FONT_WEIGHT.bold,
                bgcolor: playerHue ?? heroText.surface,
                border: "4px solid",
                borderColor: playerHue ?? heroText.lineStrong,
                boxShadow: "0 8px 28px rgba(0,0,0,0.35), 0 0 0 6px rgba(0,0,0,0.25)",
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
                  // Grafite uguale per tutti i ruoli (UX-29): l'informazione e' il numero.
                  ...roleColorSx(player.sportRole),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: FONT_WEIGHT.bold,
                  fontSize: TYPE_SCALE.xl,
                  border: "3px solid",
                  borderColor: "secondary.main",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                }}
              >
                {player.sportRole}
              </Box>
            )}
          </Box>
        }
        badges={
          // Ruolo per esteso + squadra. Il numero da solo (c'e' gia' sul
          // bollino dell'avatar) a chi non conosce il Baskin non dice nulla.
          player.sportRole || heroTeams.length > 0 ? (
            <>
              {player.sportRole && (
                <Typography
                  variant="body1"
                  sx={{
                    color: heroText.primary,
                    fontWeight: FONT_WEIGHT.semibold,
                    lineHeight: 1,
                  }}
                >
                  {sportRoleLabel(player.sportRole, player.sportRoleVariant)}
                </Typography>
              )}
              {player.sportRole && heroTeams.length > 0 && (
                <Box component="span" aria-hidden="true" sx={{ color: heroText.muted }}>
                  ·
                </Box>
              )}
              {heroTeams.map((m) => (
                // Niente `clickable`: il link e' gia' l'elemento da toccare.
                <Link key={m.id} href={teamHref(m.team)} style={{ textDecoration: "none" }}>
                  <Chip
                    icon={
                      m.isCaptain ? (
                        <EmojiEventsIcon
                          sx={{
                            fontSize: "0.95rem !important",
                            color: `${heroMedal.gold} !important`,
                          }}
                        />
                      ) : undefined
                    }
                    // Una squadra di una stagione passata porta la stagione:
                    // senza, sembrerebbe quella in cui gioca adesso.
                    label={
                      m.team.season === currentSeason
                        ? m.team.name
                        : `${m.team.name} · ${m.team.season}`
                    }
                    size="small"
                    // Squadra nella sua tinta; senza tinta contornata neutra (UX-29).
                    sx={{
                      ...(teamFill(m.team.color)
                        ? {
                            bgcolor: teamFill(m.team.color)?.bg,
                            color: teamFill(m.team.color)?.fg,
                          }
                        : {
                            bgcolor: "transparent",
                            color: heroText.primary,
                            border: `1px solid ${heroText.lineStrong}`,
                          }),
                      fontSize: TYPE_SCALE.xs,
                      cursor: "pointer",
                      "a:hover > &": { opacity: 0.9 },
                    }}
                  />
                </Link>
              ))}
            </>
          ) : undefined
        }
        // Un profilo visibile solo allo staff non si condivide.
        actions={
          staffOnly ? undefined : (
            <PlayerShareButtons
              playerName={player.name ?? "Giocatore"}
              totalPoints={totalPoints}
              matchesPlayed={matchesPlayed}
              medalsCount={medals.length}
              slug={slug}
            />
          )
        }
      >
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
              // L'hero e' scuro in entrambi i temi: qui servono i
              // valori metallici, non quelli (scuriti) del tema chiaro.
              const medalColor = isFirst
                ? heroMedal.gold
                : isSecond
                  ? heroMedal.silver
                  : heroMedal.bronze;
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
                    bgcolor: alpha(brandColor.black, 0.35),
                    border: `1.5px solid ${medalColor}`,
                    borderRadius: RADIUS.pill,
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
                        isFirst
                          ? heroMedal.goldDeep
                          : isSecond
                            ? heroMedal.silverDeep
                            : heroMedal.bronzeDeep
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
                        fontSize: TYPE_SCALE.xs,
                        fontWeight: FONT_WEIGHT.bold,
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
                        fontSize: TYPE_SCALE.xs,
                        fontWeight: FONT_WEIGHT.semibold,
                        color: heroText.muted,
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
                  bgcolor: alpha(brandColor.white, 0.1),
                  color: "common.white",
                  fontSize: TYPE_SCALE.xs,
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
                  fontSize: { xs: TYPE_SCALE.xl5, md: TYPE_SCALE.xl6 },
                  fontWeight: FONT_WEIGHT.bold,
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
                  fontSize: TYPE_SCALE.xs,
                  fontWeight: FONT_WEIGHT.semibold,
                  color: heroText.muted,
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
                  fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 },
                  fontWeight: FONT_WEIGHT.bold,
                  color: heroText.primary,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatDecimal(totalPoints / matchesPlayed, locale)}
              </Typography>
              <Typography
                sx={{
                  fontSize: TYPE_SCALE.xs,
                  fontWeight: FONT_WEIGHT.semibold,
                  color: heroText.muted,
                }}
              >
                {t("perGame")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
              <Typography
                sx={{
                  fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 },
                  fontWeight: FONT_WEIGHT.bold,
                  color: "common.white",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {matchesPlayed}
              </Typography>
              <Typography
                sx={{
                  fontSize: TYPE_SCALE.xs,
                  fontWeight: FONT_WEIGHT.semibold,
                  color: heroText.muted,
                }}
              >
                {t("matchesCount", { count: matchesPlayed })}
              </Typography>
            </Box>
          </Box>
        )}
      </EntityHero>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {staffOnly && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t("staffOnlyProfile")}
          </Alert>
        )}

        {/* Figli (solo staff) */}
        {guardedChildren.length > 0 && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 5 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t("children")}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {guardedChildren.map((c) => (
                <Link key={c.id} href={c.href} style={{ textDecoration: "none" }}>
                  {/* Niente `clickable`: il link e' gia' l'elemento da
                      toccare, un bottone dentro farebbe due fermate di Tab. */}
                  <Chip
                    label={c.name}
                    variant="outlined"
                    sx={{ cursor: "pointer", "a:hover > &": { bgcolor: "action.hover" } }}
                    avatar={
                      c.sportRole ? (
                        <Avatar
                          sx={{
                            bgcolor: roleColor(c.sportRole),
                            color: "common.white !important",
                            fontWeight: FONT_WEIGHT.semibold,
                          }}
                        >
                          {c.sportRole}
                        </Avatar>
                      ) : undefined
                    }
                  />
                </Link>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Riepilogo: numeri in riquadri. Punti e partite della carriera
            stanno gia' nell'hero; qui allenamenti e MVP. Chi non ha ancora
            giocato ha una riga di stato al posto dei numeri a zero. */}
        <Box
          component="section"
          aria-label={t("athleteInfo")}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
            mb: 5,
          }}
        >
          <SummaryTile
            value={trainingsValue}
            label={t("trainingsLabel")}
            note={
              attendedCount > 0 && player._count.registrations > attendedCount
                ? t("trainingsOf", { count: player._count.registrations })
                : undefined
            }
          />
          {careerMatches > 0 ? (
            player._count.matchMvps > 0 && (
              <SummaryTile value={player._count.matchMvps} label={t("mvpLabel")} />
            )
          ) : (
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                gridColumn: { sm: "span 2" },
                p: 2,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
                {t("notPlayedYet", { name: player.name ?? "" })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("notPlayedYetDesc")}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Badge / achievement. Senza partite i traguardi sono tutti a zero:
            se ne mostra solo il prossimo, non una lista di barre vuote. */}
        {(earnedBadgesView.length > 0 || lockedBadgesView.length > 0) && (
          <Box sx={{ mb: 5 }}>
            <BadgeShowcase
              earned={earnedBadgesView}
              locked={lockedBadgesView}
              title={t("achievements")}
              nextTitle={careerMatches > 0 ? t("nextAchievements") : t("firstAchievement")}
              maxNext={careerMatches > 0 ? 3 : 1}
            />
          </Box>
        )}

        {/* Storico ruolo sportivo */}
        {player.sportRoleHistory.length > 1 && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 5 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t("roleHistory")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              {player.sportRoleHistory.map((entry, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box>
                    <RoleBadge role={entry.sportRole} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", textAlign: "center", mt: 0.25 }}
                    >
                      {formatRome(new Date(entry.changedAt), "MMM yyyy", { locale: dateLocale })}
                    </Typography>
                  </Box>
                  {i < player.sportRoleHistory.length - 1 && (
                    <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary", mb: 2.5 }} />
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
                <Typography variant="overline" color="text.secondary">
                  {t("statistics")}
                </Typography>
                <Typography component="h2" variant="h4">
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
                      sx={{ cursor: "pointer" }}
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
                        sx={{ cursor: "pointer" }}
                      />
                    </Link>
                  ))}
                </Box>
              )}
            </Box>
            <Grid container spacing={2} sx={{ mb: 5 }}>
              {[
                { label: t("matches"), value: matchesPlayed },
                { label: t("totalPoints"), value: totalPoints },
                {
                  label: t("avgPoints"),
                  value:
                    matchesPlayed > 0 ? formatDecimal(totalPoints / matchesPlayed, locale) : "—",
                },
                { label: t("twoPointers"), value: totalTwo },
                { label: t("threePointers"), value: totalThree },
                { label: t("freeThrows"), value: totalFreeThrows },
                { label: t("fouls"), value: totalFouls },
                ...(totalIllegalFouls > 0
                  ? [
                      {
                        label: t("illegalFouls"),
                        value: totalIllegalFouls,
                      },
                    ]
                  : []),
                ...(totalShots > 0
                  ? [
                      {
                        label: t("shotsAttempted"),
                        value: totalShots,
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
                      component="p"
                      variant="h4"
                      sx={{
                        // Numeri in text.primary: le statistiche sono neutre (UX-29).
                        color: "text.primary",
                        fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 },
                      }}
                    >
                      {s.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: FONT_WEIGHT.semibold,
                      }}
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
                sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: RADIUS.lg }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1 }}
                >
                  {t("pointsTrend")}
                </Typography>
                {/* Linea neutra: il grafico parla del giocatore, non della squadra (UX-29). */}
                <PointsTrendChart values={trendValues} />
              </Paper>
            )}

            <Box sx={{ mb: 5 }}>
              <Button
                href={`/giocatori/confronta?a=${encodeURIComponent(slug)}`}
                size="small"
                variant="outlined"
                startIcon={<CompareArrowsIcon />}
              >
                {t("compare")}
              </Button>
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
                <Typography variant="overline" sx={{ color: "medal.gold" }}>
                  {t("honors")}
                </Typography>
              </Box>
              <Typography component="h2" variant="h4" sx={{ mb: 3 }}>
                {t("medals")}
              </Typography>
              <Grid container spacing={2}>
                {medals.map((m, i) => {
                  const isFirst = m.rank === 1;
                  const isSecond = m.rank === 2;
                  // Su fondo chiaro le medaglie prendono i token del tema, che
                  // qui sono scuriti: l'oro #FFC107 su bianco faceva 1,63:1.
                  const medalColor = isFirst
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
                    <Grid key={`${m.teamId}-${m.season}-${i}`} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          border: "1px solid",
                          borderColor: isFirst ? medalColor : "divider",
                          boxShadow: isFirst
                            ? `0 4px 16px ${alpha(brandColor.black, 0.12)}`
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          height: "100%",
                        }}
                      >
                        <MedalDisc
                          rank={isFirst ? 1 : isSecond ? 2 : 3}
                          size={46}
                          borderWidth={3}
                          iconSize={22}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: medalColor,
                              fontWeight: FONT_WEIGHT.bold,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontSize: TYPE_SCALE.xs,
                              display: "block",
                            }}
                          >
                            {medalLabel}
                          </Typography>
                          <Typography variant="body2" fontWeight={FONT_WEIGHT.bold} noWrap>
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
                <Typography variant="overline" color="text.secondary">
                  {t("teamsSection")}
                </Typography>
              </Box>
              <Typography component="h2" variant="h4" sx={{ mb: 3 }}>
                {t("competitiveHistory")}
              </Typography>
              <Stack spacing={1.5}>
                {membershipsBySeason.map((m) => (
                  <Link key={m.id} href={teamHref(m.team)} style={{ textDecoration: "none" }}>
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
                        ...onHover({ transform: "translateX(4px)", boxShadow: 2 }),
                      }}
                    >
                      {/* Fascia della tinta squadra; senza tinta nessun segno (UX-29). */}
                      {teamColor(m.team.color) && (
                        <Box sx={{ width: 6, flexShrink: 0, bgcolor: teamColor(m.team.color) }} />
                      )}
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
                            <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
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
                          sx={{ fontSize: TYPE_SCALE.xs }}
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
                <SportsBasketballIcon color="primary" />
                <Typography variant="overline" color="text.secondary">
                  {t("matches")}
                </Typography>
              </Box>
              <Typography component="h2" variant="h4" sx={{ mb: 3 }}>
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
                        ...onHover({ boxShadow: 2, transform: "translateX(3px)" }),
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
                              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                                {ms.match.team.name} vs{" "}
                                {ms.match.opponent?.name ??
                                  ms.match.opponentTeam?.name ??
                                  "Avversario"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatRome(new Date(ms.match.date), "d MMMM yyyy", {
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
                                    color: "match.onFill",
                                    fontSize: TYPE_SCALE.xs,
                                  }}
                                />
                              )}
                              <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            <StatItem label={t("rowPoints")} value={ms.points} />
                            {ms.twoPointers > 0 && (
                              <StatItem label={t("row2pt")} value={ms.twoPointers} />
                            )}
                            {ms.threePointers > 0 && (
                              <StatItem label={t("row3pt")} value={ms.threePointers} />
                            )}
                            {ms.freeThrows > 0 && (
                              <StatItem label={t("rowFreeThrows")} value={ms.freeThrows} />
                            )}
                            {ms.fouls > 0 && <StatItem label={t("rowFouls")} value={ms.fouls} />}
                            {ms.illegalFouls > 0 && (
                              <StatItem label={t("rowIllegal")} value={ms.illegalFouls} />
                            )}
                            {ms.shotsAttempted > 0 && (
                              <StatItem label={t("rowShots")} value={ms.shotsAttempted} />
                            )}
                          </Box>
                          {ms.notes && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
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
      </Container>
    </>
  );
}

/** URL pubblico di una squadra: la stagione senza trattino, come nelle liste. */
function teamHref(team: { name: string; season: string }): string {
  return `/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`;
}

/** Riquadro numerico del riepilogo: numero grande, etichetta sotto. */
function SummaryTile({ value, label, note }: { value: number; label: string; note?: string }) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ p: 2, textAlign: "center", display: "flex", flexDirection: "column" }}
    >
      <Typography
        component="p"
        variant="h4"
        sx={{
          fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 },
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: FONT_WEIGHT.semibold,
        }}
      >
        {label}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      )}
    </Paper>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography component="p" variant="h6" fontWeight={FONT_WEIGHT.bold} sx={{ lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: TYPE_SCALE.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        {label}
      </Typography>
    </Box>
  );
}
