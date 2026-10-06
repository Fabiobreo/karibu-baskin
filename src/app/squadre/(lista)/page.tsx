import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { Box, Chip, Container, Grid2 as Grid, Link as MuiLink, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { columnSx } from "@/lib/layout";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import BrandCta from "@/components/common/BrandCta";
import ChipIconLabel from "@/components/common/ChipIconLabel";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import StarIcon from "@mui/icons-material/Star";
import HistoryIcon from "@mui/icons-material/History";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { slugify } from "@/lib/slugUtils";
import { teamFill } from "@/lib/teamColors";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { onHover } from "@/lib/hoverStyles";
import { getActiveSeason } from "@/lib/season/activeSeason";
import { TRY_IT_HREF, matchLocation, matchPlaceShort } from "@/lib/clubVenue";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { guardianOf } from "@/lib/guardians";
import { isPublicTeam } from "@/lib/matches/mixedTeam";
import {
  sortTeamsForViewer,
  summarizeTeamMatches,
  viewerTeamMarks,
  type ViewerTeamMark,
} from "@/lib/season/teamSummary";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const metadata: Metadata = buildMetadata({
  title: "Squadre",
  description:
    "Le squadre agonistiche del Karibu Baskin di Montecchio Maggiore, stagione per stagione.",
  path: "/squadre",
});

const capitalizeSx = { "&::first-letter": { textTransform: "uppercase" } } as const;

export default async function SquadrePage() {
  const [
    t,
    tMatches,
    tCommon,
    locale,
    session,
    teams,
    { activeSeason, displaySeason, isFallback },
  ] = await Promise.all([
    getTranslations("teams"),
    getTranslations("matches"),
    getTranslations("common"),
    getLocale(),
    auth(),
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        season: true,
        championship: true,
        color: true,
        description: true,
        isMixed: true,
        playsLeague: true,
        _count: { select: { memberships: true } },
      },
    }),
    getActiveSeason("teams"),
  ]);

  // La Karibu di stagione ha una card solo quando gioca il campionato; quella
  // nascosta resta fuori, ma le sue partite hanno una riga più sotto.
  const seasonTeams = teams.filter((team) => team.season === displaySeason);
  const currentTeams = seasonTeams.filter(isPublicTeam);
  const hiddenClubTeam = seasonTeams.find((team) => !isPublicTeam(team)) ?? null;
  // Stagione a squadra unica: la Karibu è la squadra, le altre sono i suoi gruppi.
  const clubTeam = currentTeams.find((team) => team.isMixed) ?? null;
  const groupTeams = currentTeams.filter((team) => !team.isMixed);
  const groupTeamIds = groupTeams.map((team) => team.id);
  const hasPastSeasons = teams.some((team) => isPublicTeam(team) && team.season < displaySeason);
  const viewerId = session?.user?.id ?? null;
  // "Vieni a provare" e il simulatore dipendono da chi guarda: il primo è per
  // chi non è tesserato, il secondo solo per i tesserati.
  const viewerIsMember = isMemberRole(session?.user?.appRole);
  // Mai indovinare l'id: una Karibu creata prima dell'id fisso ne ha un altro.
  const clubId = (clubTeam ?? hiddenClubTeam)?.id ?? null;

  const [matches, viewerMemberships, clubRoster] = await Promise.all([
    currentTeams.length > 0
      ? prisma.match.findMany({
          // Anche le partite della Karibu nascosta: non ha una card, ma le sue
          // amichevoli sono partite del club e stanno in una riga a parte.
          where: { teamId: { in: [...groupTeamIds, ...(clubId ? [clubId] : [])] } },
          orderBy: { date: "asc" },
          select: {
            id: true,
            slug: true,
            teamId: true,
            date: true,
            isHome: true,
            matchType: true,
            venue: true,
            result: true,
            ourScore: true,
            theirScore: true,
            team: { select: { name: true } },
            opponent: { select: { name: true, city: true, address: true } },
            opponentTeam: { select: { name: true } },
          },
        })
      : [],
    viewerId && groupTeamIds.length > 0
      ? prisma.teamMembership.findMany({
          where: {
            teamId: { in: groupTeamIds },
            OR: [
              { userId: viewerId },
              // I figli, e la propria scheda figlio (chi ha account e scheda è
              // una persona sola).
              { child: { OR: [{ userId: viewerId }, guardianOf(viewerId)] } },
            ],
          },
          select: { teamId: true, userId: true, child: { select: { name: true, userId: true } } },
        })
      : [],
    // La Karibu non ha tesserati suoi: i suoi atleti sono quelli dei gruppi,
    // contati una volta sola anche se stanno in due.
    clubTeam && groupTeamIds.length > 0
      ? prisma.teamMembership.findMany({
          where: { teamId: { in: groupTeamIds } },
          select: { userId: true, childId: true },
        })
      : [],
  ]);

  // eslint-disable-next-line react-hooks/purity -- Server Component, renders once
  const now = Date.now();
  const dateLocale = getDateFnsLocale(locale);
  const marks = viewerTeamMarks(
    viewerMemberships.map((m) => ({
      teamId: m.teamId,
      childName:
        m.userId === viewerId || m.child?.userId === viewerId ? null : (m.child?.name ?? null),
    }))
  );
  // Chi sta in un gruppo gioca nella Karibu: lì valgono i segni di tutti i gruppi.
  const clubMark: ViewerTeamMark | undefined =
    marks.size > 0
      ? {
          mine: [...marks.values()].some((mark) => mark.mine),
          children: [...new Set([...marks.values()].flatMap((mark) => mark.children))],
        }
      : undefined;
  const clubAthletes = new Set(
    clubRoster.map((m) => (m.userId ? `u:${m.userId}` : `c:${m.childId}`))
  ).size;
  const orderedGroups = sortTeamsForViewer(groupTeams, marks);
  const listFormat = new Intl.ListFormat(locale, { type: "conjunction" });
  const opponentOf = (m: (typeof matches)[number]) =>
    m.opponent?.name ?? m.opponentTeam?.name ?? tMatches("opponent");
  const matchTypeLabel = (type: string) =>
    ({
      LEAGUE: tMatches("typeLeague"),
      TOURNAMENT: tMatches("typeTournament"),
      FRIENDLY: tMatches("typeFriendly"),
    })[type] ?? type;
  const matchDate = (date: Date) => formatRome(date, "EEE d MMM · HH:mm", { locale: dateLocale });

  /** Tutto quello che una card mostra, già tradotto. */
  const cardFor = (
    team: (typeof currentTeams)[number],
    mark: ViewerTeamMark | undefined,
    athletes: number,
    compact: boolean
  ): TeamCardProps => {
    const teamMatches = matches.filter((m) => m.teamId === team.id);
    // Bilancio sulle partite ufficiali, come nella pagina della squadra (che
    // conta le amichevoli solo su richiesta); la prossima partita è la
    // prossima, di qualunque tipo.
    const summary = summarizeTeamMatches(
      teamMatches.filter((m) => m.matchType !== "FRIENDLY"),
      now
    );
    const next = summarizeTeamMatches(teamMatches, now).upcoming[0] ?? null;
    const record = [
      t("victories", { count: summary.wins }),
      ...(summary.draws > 0 ? [t("draws", { count: summary.draws })] : []),
      t("losses", { count: summary.losses }),
    ].join(" · ");
    // Un gruppo di una stagione a squadra unica di solito non ha partite sue:
    // niente "Stagione al via" né "Calendario in arrivo", che sarebbero falsi.
    const hasSeason = !compact || summary.played > 0 || !!next;
    return {
      href: `/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`,
      name: team.name,
      color: team.color,
      markLabel: mark?.mine
        ? t("yourTeam")
        : mark && mark.children.length > 0
          ? t("childTeam", { names: listFormat.format(mark.children) })
          : null,
      championship: team.championship,
      // "0 partite" non dice niente: a inizio stagione lo dice a parole.
      headline: hasSeason ? (summary.played > 0 ? record : t("seasonStarting")) : null,
      description: team.description,
      next: hasSeason
        ? {
            label: tMatches("nextMatch"),
            date: next ? matchDate(next.date) : null,
            line: next
              ? next.isHome
                ? t("nextHome", { opponent: opponentOf(next) })
                : t("nextAway", { opponent: opponentOf(next) })
              : t("calendarComing"),
          }
        : null,
      athletes: t("athleteCount", { count: athletes }),
    };
  };

  // La Karibu nascosta non ha una card: le sue partite in programma hanno una riga.
  const clubUpcoming = hiddenClubTeam
    ? summarizeTeamMatches(
        matches.filter((m) => m.teamId === hiddenClubTeam.id),
        now
      ).upcoming
    : [];
  const showSimulator = viewerIsMember;

  return (
    <>
      <PageHero column="main" title={t("heroTitle")} subtitle={t("heroSubtitle")} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx("main")}>
          {currentTeams.length === 0 ? (
            <EmptyState
              icon={<GroupsIcon sx={{ fontSize: 56, color: "text.secondary" }} />}
              title={t("noTeams")}
              message={t("noTeamsDesc")}
            />
          ) : (
            <Box component="section">
              {/* La stagione, una volta sola: è anche il titolo della sezione. */}
              <Typography
                variant="overline"
                component="h2"
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                {t("seasonLabel")} {displaySeason}
              </Typography>
              {isFallback && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {tCommon("seasonNotStarted", { active: activeSeason, shown: displaySeason })}
                </Typography>
              )}

              {clubTeam ? (
                <>
                  <TeamCard {...cardFor(clubTeam, clubMark, clubAthletes, false)} />
                  {orderedGroups.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" component="h3">
                        {t("groupsSection")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t("groupsDesc")}
                      </Typography>
                      <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="stretch">
                        {orderedGroups.map((team) => (
                          <Grid key={team.id} size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                            <TeamCard
                              {...cardFor(team, marks.get(team.id), team._count.memberships, true)}
                              headingLevel="h4"
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </>
              ) : (
                <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="stretch">
                  {orderedGroups.map((team) => (
                    <Grid key={team.id} size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                      <TeamCard
                        {...cardFor(team, marks.get(team.id), team._count.memberships, false)}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {/* Le partite della Karibu di stagione nascosta (amichevoli e tornei
              con tutti i giocatori): la squadra non ha una card, le sue partite sì. */}
          {clubUpcoming.length > 0 && (
            <Box component="section" sx={{ mt: 5 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
                {t("clubMatches")}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {clubUpcoming.map((m) => {
                  const place = matchPlaceShort(
                    m,
                    matchLocation({
                      isHome: m.isHome,
                      venue: m.venue,
                      opponent: m.opponent,
                      internal: !m.opponent,
                    })
                  );
                  const where = m.isHome
                    ? tMatches("home")
                    : place
                      ? t("awayIn", { place })
                      : tMatches("away");
                  return (
                    <MuiLink
                      key={m.id}
                      href={`/partite/${m.slug ?? m.id}`}
                      underline="none"
                      color="inherit"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        px: 2.5,
                        py: 1.75,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: RADIUS.lg,
                        transition: "border-color 0.15s",
                        ...onHover({
                          borderColor: "primary.main",
                          "& .team-card-arrow": { color: "primary.main" },
                        }),
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ overflowWrap: "anywhere" }}>
                          <Box component="span" sx={{ ...capitalizeSx, display: "inline-block" }}>
                            {matchDate(m.date)}
                          </Box>
                          {" · "}
                          {/* Chi gioca in casa prima, come nel tabellino (UX-35). */}
                          {m.isHome
                            ? `${m.team.name} vs ${opponentOf(m)}`
                            : `${opponentOf(m)} vs ${m.team.name}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {matchTypeLabel(m.matchType)}
                          {" · "}
                          {where}
                        </Typography>
                      </Box>
                      <ArrowForwardIcon
                        className="team-card-arrow"
                        sx={{ color: "text.secondary", flexShrink: 0 }}
                      />
                    </MuiLink>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Link secondari: righe leggere, non card. */}
          {(showSimulator || hasPastSeasons) && (
            <Box
              component="nav"
              aria-label={t("moreSection")}
              sx={{ mt: 5, borderTop: "1px solid", borderColor: "divider" }}
            >
              {showSimulator && (
                <SecondaryLink
                  href="/squadre/sfida"
                  icon={<SportsKabaddiIcon />}
                  title={t("simChallengeTitle")}
                  description={t("simChallengeDesc")}
                />
              )}
              {hasPastSeasons && (
                <SecondaryLink
                  href="/squadre/archivio"
                  icon={<HistoryIcon />}
                  title={t("previousSeasons")}
                />
              )}
            </Box>
          )}

          {/* "Vieni a provare" (UX-15): solo per chi non è tesserato. */}
          {currentTeams.length > 0 && !viewerIsMember && (
            <Box sx={{ mt: 6 }}>
              <BrandCta
                layout="center"
                icon={<EmojiEventsIcon />}
                title={t("joinUs")}
                body={t("joinUsDesc")}
                action={{ href: TRY_IT_HREF, label: t("joinUsCta") }}
              />
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
}

interface TeamCardProps {
  href: string;
  name: string;
  /** Colore salvato della squadra (chiave o hex storico). */
  color: string | null;
  /** "La tua squadra" / "La squadra di Giulia", già tradotto. */
  markLabel: string | null;
  championship: string | null;
  /** Bilancio o "Stagione al via"; null = la card non parla di partite. */
  headline: string | null;
  description: string | null;
  next: { label: string; date: string | null; line: string } | null;
  athletes: string;
  headingLevel?: "h3" | "h4";
}

/** Card di una squadra: tutta cliccabile, intestazione nella tinta della squadra. */
function TeamCard({
  href,
  name,
  color,
  markLabel,
  championship,
  headline,
  description,
  next,
  athletes,
  headingLevel = "h3",
}: TeamCardProps) {
  // Intestazione nella tinta della squadra (UX-29): l'etichetta (bianca o
  // scura) la decide `teamFill` per il contrasto.
  const fill = teamFill(color);
  return (
    <MuiLink
      href={href}
      underline="none"
      color="inherit"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "hidden",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: RADIUS.lg,
        transition: "border-color 0.15s",
        // Card cliccabile: bordo e freccia arancio al passaggio.
        ...onHover({
          borderColor: "primary.main",
          "& .team-card-arrow": { color: "primary.main" },
        }),
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: fill?.bg ?? "action.hover",
          boxShadow: fill?.ring ? `inset 0 0 0 1px ${fill.ring}` : undefined,
          borderBottom: fill ? 0 : "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          columnGap: 1.5,
          rowGap: 0.75,
        }}
      >
        <Typography
          variant="h6"
          component={headingLevel}
          fontWeight={FONT_WEIGHT.bold}
          sx={{ color: fill?.fg ?? "text.primary" }}
        >
          {name}
        </Typography>
        {markLabel && (
          <Chip
            // Icona dentro `label`, non in `icon`: vedi ChipIconLabel.
            label={
              <ChipIconLabel
                icon={<StarIcon sx={{ fontSize: 18 }} />}
                size="small"
                variant={fill ? "filled" : "outlined"}
              >
                {markLabel}
              </ChipIconLabel>
            }
            size="small"
            variant={fill ? "filled" : "outlined"}
            sx={fill ? { bgcolor: alpha(fill.fg, 0.14), color: fill.fg } : undefined}
          />
        )}
      </Box>

      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", flex: 1 }}>
        {championship && (
          <Typography variant="body2" color="text.secondary">
            {championship}
          </Typography>
        )}
        {headline && (
          <Typography variant="subtitle1" component="p" sx={{ mt: 0.25 }}>
            {headline}
          </Typography>
        )}
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: headline ? 1 : 0 }}>
            {description}
          </Typography>
        )}

        {next && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              {next.label}
            </Typography>
            {next.date && (
              <Typography variant="body2" sx={capitalizeSx}>
                {next.date}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {next.line}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            mt: "auto",
            pt: championship || headline || description || next ? 2 : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <GroupsIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {athletes}
            </Typography>
          </Box>
          <ArrowForwardIcon className="team-card-arrow" sx={{ color: "text.secondary" }} />
        </Box>
      </Box>
    </MuiLink>
  );
}

interface SecondaryLinkProps {
  href: string;
  icon: ReactNode;
  title: string;
  description?: string;
}

/** Riga di un link secondario: icona, titolo, descrizione facoltativa, freccia. */
function SecondaryLink({ href, icon, title, description }: SecondaryLinkProps) {
  return (
    <MuiLink
      href={href}
      underline="none"
      color="inherit"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1.75,
        minHeight: 48,
        borderBottom: "1px solid",
        borderColor: "divider",
        "& > svg:first-of-type": { color: "text.secondary", flexShrink: 0 },
        ...onHover({ "& .secondary-link-arrow": { color: "primary.main" } }),
      }}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      <ChevronRightIcon
        className="secondary-link-arrow"
        sx={{ color: "text.secondary", flexShrink: 0 }}
      />
    </MuiLink>
  );
}
