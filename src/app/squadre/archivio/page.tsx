import { prisma } from "@/lib/db";
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
import SiteHeader from "@/components/SiteHeader";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { slugify } from "@/lib/slugUtils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archivio squadre | Karibu Baskin",
};

export const revalidate = 3600;

export default async function SquadreArchivioPage() {
  const [teams, seasonRecords] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: { _count: { select: { memberships: true, matches: true } } },
    }),
    prisma.season.findMany(),
  ]);

  const currentSeason = seasonRecords.find((s) => s.isCurrent)?.label ?? null;

  const pastTeams = currentSeason ? teams.filter((t) => t.season < currentSeason) : teams;

  const seasons = [...new Set(pastTeams.map((t) => t.season))].sort((a, b) => b.localeCompare(a));

  const bySeason: Record<string, typeof pastTeams> = {};
  for (const team of pastTeams) {
    (bySeason[team.season] ??= []).push(team);
  }

  return (
    <>
      <SiteHeader />

      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 5, md: 7 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            backgroundColor: "rgba(230,81,0,0.08)",
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip
            label="Stagioni precedenti"
            size="small"
            sx={{
              mb: 2,
              fontWeight: 700,
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.8)",
            }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mb: 2, fontSize: { xs: "1.8rem", md: "2.4rem" } }}
          >
            Archivio squadre
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255,255,255,0.55)", maxWidth: 480, mx: "auto" }}
          >
            Tutte le squadre Karibu Baskin dalle stagioni passate.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Link href="/squadre" style={{ textDecoration: "none" }}>
          <Button
            startIcon={<ArrowBackIcon />}
            size="small"
            sx={{ mb: 5, color: "text.secondary", fontWeight: 600 }}
          >
            Chi siamo
          </Button>
        </Link>

        {seasons.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <GroupsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessuna stagione precedente
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {seasons.map((season, i) => (
              <Box key={season}>
                {i > 0 && <Divider sx={{ mb: 6 }} />}
                <Typography
                  variant="overline"
                  fontWeight={700}
                  sx={{ color: "text.disabled", letterSpacing: "0.1em", display: "block", mb: 1.5 }}
                >
                  Stagione {season}
                </Typography>
                <Grid container spacing={2}>
                  {bySeason[season].map((team) => (
                    <Grid key={team.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Link
                        href={`/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`}
                        style={{ textDecoration: "none" }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            overflow: "hidden",
                            border: "1px solid rgba(0,0,0,0.07)",
                            opacity: 0.8,
                            transition: "opacity 0.15s, box-shadow 0.15s",
                            "&:hover": { opacity: 1, boxShadow: 3 },
                          }}
                        >
                          <Box
                            sx={{
                              width: 5,
                              alignSelf: "stretch",
                              flexShrink: 0,
                              backgroundColor: team.color ?? "grey.500",
                            }}
                          />
                          <Box sx={{ px: 1.5, py: 1.5, flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {team.name}
                            </Typography>
                            {team.championship && (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                noWrap
                                sx={{ display: "block" }}
                              >
                                {team.championship}
                              </Typography>
                            )}
                            <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                                <GroupsIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                                <Typography variant="caption" color="text.disabled">
                                  {team._count.memberships} atleti
                                </Typography>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                                <SportsSoccerIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                                <Typography variant="caption" color="text.disabled">
                                  {team._count.matches} partite
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Paper>
                      </Link>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}
