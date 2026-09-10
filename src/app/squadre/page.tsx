import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Chip,
  Divider,
  Button,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import StarIcon from "@mui/icons-material/Star";
import HistoryIcon from "@mui/icons-material/History";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import Link from "next/link";
import { slugify } from "@/lib/slugUtils";
import { contrastText } from "@/lib/colorUtils";
import { brandColor } from "@/lib/heroStyles";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { onHover } from "@/lib/hoverStyles";
import { getActiveSeason } from "@/lib/season/activeSeason";

export const metadata: Metadata = buildMetadata({
  title: "Squadre",
  description:
    "Le squadre agonistiche del Karibu Baskin di Montecchio Maggiore, stagione per stagione.",
  path: "/squadre",
});

export const revalidate = 3600;

export default async function SquadrePage() {
  const [t, tCommon] = await Promise.all([getTranslations("teams"), getTranslations("common")]);
  const STATS = [
    { value: "2015", label: t("foundingYear") },
    { value: "80+", label: t("registeredAthletes") },
    { value: "2", label: t("teamsInField") },
    { value: "1°", label: t("regionalTitle") },
  ];
  const [teams, { activeSeason, displaySeason, isFallback }] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: { _count: { select: { memberships: true, matches: true } } },
    }),
    getActiveSeason("teams"),
  ]);

  const currentTeams = teams.filter((t) => t.season === displaySeason);
  const hasPastSeasons = teams.some((t) => t.season < displaySeason);

  return (
    <>
      <PageHero
        chip={t("heroChip")}
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        subtitleMaxWidth={540}
      />

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 7 }}>
          {STATS.map((s) => (
            <Grid key={s.label} size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h4"
                  component="p"
                  fontWeight={800}
                  color="primary.onLight"
                  sx={{ fontSize: { xs: "1.8rem", md: "2.2rem" } }}
                >
                  {s.value}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}
                >
                  {s.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 7 }} />

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
                  color="warning"
                  sx={{ fontWeight: 700 }}
                />
              )}
              <Typography
                variant="overline"
                color="primary.onLight"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em" }}
              >
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
              fontWeight={800}
              sx={{ mb: 3, fontSize: { xs: "1.7rem", md: "2.1rem" } }}
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
            borderRadius: 2,
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
              <Typography variant="subtitle1" component="h2" fontWeight={700}>
                {t("simChallengeTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("simChallengeDesc")}
              </Typography>
            </Box>
          </Box>
          <Link href="/squadre/sfida" style={{ textDecoration: "none" }}>
            <Button variant="contained" size="small" sx={{ fontWeight: 700 }}>
              {t("simChallengeCta")}
            </Button>
          </Link>
        </Box>

        {/* Link archivio */}
        {hasPastSeasons && (
          <Box
            sx={{
              mt: 6,
              p: { xs: 2.5, md: 3 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
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
                <Typography variant="subtitle1" component="h2" fontWeight={700}>
                  {t("previousSeasons")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("previousSeasonsDesc")}
                </Typography>
              </Box>
            </Box>
            <Link href="/squadre/archivio" style={{ textDecoration: "none" }}>
              <Button variant="outlined" size="small">
                {t("goToArchive")}
              </Button>
            </Link>
          </Box>
        )}

        {/* CTA */}
        {currentTeams.length > 0 && (
          <Box
            sx={{
              mt: 8,
              background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
              borderRadius: 3,
              p: { xs: 3, md: 5 },
              textAlign: "center",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" component="h2" fontWeight={800}>
              {t("joinUs")}
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", maxWidth: 420 }}>
              {t("joinUsDesc")}
            </Typography>
          </Box>
        )}
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
  muted = false,
  t,
}: {
  teams: Team[];
  muted?: boolean;

  t: (key: string, values?: Record<string, any>) => string;
}) {
  return (
    // `alignItems: start`: le card senza descrizione si allungavano fino
    // all'altezza della gemella, lasciando un vuoto sotto i metadati.
    <Grid container spacing={3} alignItems="flex-start">
      {teams.map((team) => {
        // Il colore squadra arriva dal DB e puo' essere chiaro (il verde dei
        // Montekki): il testo bianco fisso ci faceva 2,6:1. Qui il colore del
        // nome segue la luminanza dello sfondo.
        const headerText = contrastText(team.color);
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
                  opacity: muted ? 0.7 : 1,
                  transition: "all 0.15s",
                  ...onHover({ transform: "translateY(-3px)", boxShadow: 4, opacity: 1 }),
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    backgroundColor: muted ? "grey.200" : (team.color ?? "primary.main"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    variant="h6"
                    component="h3"
                    fontWeight={800}
                    sx={{ color: muted ? "text.secondary" : headerText }}
                  >
                    {team.name}
                  </Typography>
                  {team.championship && (
                    <Chip
                      label={team.championship}
                      size="small"
                      sx={{
                        backgroundColor: muted
                          ? alpha(brandColor.black, 0.08)
                          : alpha(headerText, 0.18),
                        color: muted ? "text.secondary" : headerText,
                        fontWeight: 700,
                      }}
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
                      <GroupsIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {t("athleteCount", { count: team._count.memberships })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <SportsSoccerIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
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
