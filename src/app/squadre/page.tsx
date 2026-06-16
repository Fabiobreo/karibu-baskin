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
import SiteHeader from "@/components/layout/SiteHeader";
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
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Squadre | Karibu Baskin",
};

export const revalidate = 3600;

export default async function SquadrePage() {
  const t = await getTranslations("teams");
  const STATS = [
    { value: "2015", label: t("foundingYear") },
    { value: "80+", label: t("registeredAthletes") },
    { value: "2", label: t("teamsInField") },
    { value: "1°", label: t("regionalTitle") },
  ];
  const [teams, seasonRecords] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: { _count: { select: { memberships: true, matches: true } } },
    }),
    prisma.season.findMany(),
  ]);

  const currentSeason = seasonRecords.find((s) => s.isCurrent)?.label ?? null;

  const currentTeams = currentSeason ? teams.filter((t) => t.season === currentSeason) : teams;
  const hasPastSeasons = teams.some((t) => !currentSeason || t.season < currentSeason);

  return (
    <>
      <SiteHeader />

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
                  fontWeight={800}
                  color="primary"
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
            {currentSeason && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Chip
                  label={t("currentSeasonChip")}
                  size="small"
                  icon={<StarIcon />}
                  color="warning"
                  sx={{ fontWeight: 700 }}
                />
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight={700}
                  sx={{ letterSpacing: "0.1em" }}
                >
                  {t("seasonLabel")} {currentSeason}
                </Typography>
              </Box>
            )}
            <Typography
              variant="h4"
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
              <Typography variant="subtitle1" fontWeight={700}>
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
                <Typography variant="subtitle1" fontWeight={700}>
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
            <Typography variant="h5" fontWeight={800}>
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
    <Grid container spacing={3}>
      {teams.map((team) => (
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
                height: "100%",
                cursor: "pointer",
                opacity: muted ? 0.7 : 1,
                transition: "all 0.15s",
                "&:hover": { transform: "translateY(-3px)", boxShadow: 4, opacity: 1 },
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
                  fontWeight={800}
                  sx={{ color: muted ? "text.secondary" : "#fff" }}
                >
                  {team.name}
                </Typography>
                {team.championship && (
                  <Chip
                    label={team.championship}
                    size="small"
                    sx={{
                      backgroundColor: muted ? alpha("#000000", 0.08) : "rgba(255,255,255,0.2)",
                      color: muted ? "text.secondary" : "#fff",
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
      ))}
    </Grid>
  );
}
