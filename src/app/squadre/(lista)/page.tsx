import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Box, Container, Typography, Grid2 as Grid, Paper, Chip, Button } from "@mui/material";
import { columnSx } from "@/lib/layout";
import { alpha } from "@mui/material/styles";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import BrandCta from "@/components/common/BrandCta";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import StarIcon from "@mui/icons-material/Star";
import HistoryIcon from "@mui/icons-material/History";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import Link from "next/link";
import { slugify } from "@/lib/slugUtils";
import { teamFill } from "@/lib/teamColors";
import { brandColor, heroGradient, heroText } from "@/lib/heroStyles";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { onHover } from "@/lib/hoverStyles";
import { getActiveSeason } from "@/lib/season/activeSeason";
import { TRY_IT_HREF } from "@/lib/clubVenue";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const metadata: Metadata = buildMetadata({
  title: "Squadre",
  description:
    "Le squadre agonistiche del Karibu Baskin di Montecchio Maggiore, stagione per stagione.",
  path: "/squadre",
});

export const revalidate = 3600;

export default async function SquadrePage() {
  const [t, tCommon] = await Promise.all([getTranslations("teams"), getTranslations("common")]);
  const [teams, { activeSeason, displaySeason, isFallback }] = await Promise.all([
    prisma.competitiveTeam.findMany({
      // La Karibu di stagione è solo una scelta dello staff: niente pagina pubblica.
      where: { isMixed: false },
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: { _count: { select: { memberships: true, matches: true } } },
    }),
    getActiveSeason("teams"),
  ]);

  const currentTeams = teams.filter((t) => t.season === displaySeason);
  const hasPastSeasons = teams.some((t) => t.season < displaySeason);

  return (
    <>
      <PageHero column="main" title={t("heroTitle")} subtitle={t("heroSubtitle")} />

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box sx={columnSx("main")}>
          {/* Squadre stagione corrente */}
          {currentTeams.length === 0 ? (
            <EmptyState
              icon={<GroupsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
              title={t("noTeams")}
              message={t("noTeamsDesc")}
            />
          ) : (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                {!isFallback && (
                  <Chip
                    label={t("currentSeasonChip")}
                    size="small"
                    icon={<StarIcon />}
                    variant="outlined"
                  />
                )}
                <Typography variant="overline" color="text.secondary">
                  {t("seasonLabel")} {displaySeason}
                </Typography>
              </Box>
              {isFallback && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {tCommon("seasonNotStarted", { active: activeSeason, shown: displaySeason })}
                </Typography>
              )}
              <Typography
                variant="h4"
                component="h2"
                sx={{ mb: 3, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 } }}
              >
                {t("ourTeams")}
              </Typography>
              <TeamGrid teams={currentTeams} t={t} />
            </Box>
          )}

          {/* Simulatore Sfida — solo loggati (la pagina reindirizza al login) */}
          <Box
            sx={{
              mt: 6,
              p: { xs: 2.5, md: 3 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: RADIUS.lg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <SportsKabaddiIcon sx={{ color: "primary.main" }} />
              <Box>
                <Typography variant="subtitle1" component="h2">
                  {t("simChallengeTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("simChallengeDesc")}
                </Typography>
              </Box>
            </Box>
            {/* Secondario: l'azione principale della pagina è l'invito in fondo. */}
            <Button href="/squadre/sfida" variant="outlined">
              {t("simChallengeCta")}
            </Button>
          </Box>

          {/* Link archivio */}
          {hasPastSeasons && (
            <Box
              sx={{
                mt: 6,
                p: { xs: 2.5, md: 3 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: RADIUS.lg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <HistoryIcon sx={{ color: "text.secondary" }} />
                <Box>
                  <Typography variant="subtitle1" component="h2">
                    {t("previousSeasons")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("previousSeasonsDesc")}
                  </Typography>
                </Box>
              </Box>
              <Button href="/squadre/archivio" variant="outlined" size="small">
                {t("goToArchive")}
              </Button>
            </Box>
          )}

          {/* CTA */}
          {currentTeams.length > 0 && (
            // Verso "Vieni a provare" (UX-15).
            <Box sx={{ mt: 8 }}>
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

// ── Card squadra ─────────────────────────────────────────────────────────────

type Team = {
  id: string;
  name: string;
  season: string;
  championship: string | null;
  color: string | null;
  description: string | null;
  _count: { memberships: number; matches: number };
};

function TeamGrid({
  teams,
  t,
}: {
  teams: Team[];

  t: (key: string, values?: Record<string, any>) => string;
}) {
  return (
    // `alignItems: start`: le card senza descrizione si allungavano fino
    // all'altezza della gemella, lasciando un vuoto sotto i metadati.
    <Grid container spacing={3} alignItems="flex-start">
      {teams.map((team) => {
        // Intestazione nella tinta della squadra (UX-29): tutte le tinte reggono
        // l'etichetta bianca. Senza tinta nessun segno: intestazione neutra.
        const fill = teamFill(team.color);
        const tint = fill?.bg ?? null;
        return (
          <Grid key={team.id} size={{ xs: 12, sm: 6 }}>
            <Link
              href={`/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`}
              style={{ textDecoration: "none" }}
            >
              <Paper
                elevation={0}
                sx={{
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                  // Card cliccabile: al passaggio prende il bordo arancio, niente
                  // ombra né sollevamento (come le altre card del sito).
                  ...onHover({ borderColor: "primary.main" }),
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    bgcolor: tint ?? "action.hover",
                    boxShadow: fill?.ring ? `inset 0 0 0 1px ${fill.ring}` : undefined,
                    borderBottom: tint ? 0 : "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    variant="h6"
                    component="h3"
                    fontWeight={FONT_WEIGHT.bold}
                    sx={{ color: fill?.fg ?? "text.primary" }}
                  >
                    {team.name}
                  </Typography>
                  {team.championship && (
                    <Chip
                      label={team.championship}
                      size="small"
                      variant={tint ? "filled" : "outlined"}
                      sx={fill ? { bgcolor: alpha(fill.fg, 0.14), color: fill.fg } : undefined}
                    />
                  )}
                </Box>
                <Box sx={{ p: 2.5 }}>
                  {team.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.75, mb: 2 }}
                    >
                      {team.description}
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <GroupsIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={FONT_WEIGHT.semibold}
                      >
                        {t("athleteCount", { count: team._count.memberships })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <SportsSoccerIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={FONT_WEIGHT.semibold}
                      >
                        {t("matchCount", { count: team._count.matches })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Link>
          </Grid>
        );
      })}
    </Grid>
  );
}
