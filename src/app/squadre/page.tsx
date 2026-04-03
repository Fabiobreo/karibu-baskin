import { prisma } from "@/lib/db";
import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Stack, Divider,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import StarIcon from "@mui/icons-material/Star";
import ScheduleIcon from "@mui/icons-material/Schedule";
import Link from "next/link";
import { slugify } from "@/lib/slugUtils";
import SquadreArchivio from "@/components/SquadreArchivio";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Squadre | Karibu Baskin",
};

export const revalidate = 3600;

export default async function SquadrePage() {
  const [teams, seasonRecords] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: { _count: { select: { memberships: true, matches: true } } },
    }),
    prisma.season.findMany(),
  ]);

  const currentSeason = seasonRecords.find((s) => s.isCurrent)?.label ?? null;

  const bySeason = teams.reduce<Record<string, typeof teams>>((acc, t) => {
    if (!acc[t.season]) acc[t.season] = [];
    acc[t.season].push(t);
    return acc;
  }, {});

  const allSeasons = Object.keys(bySeason).sort((a, b) => b.localeCompare(a));

  // Suddividi in corrente / future / passate
  const currentTeams = currentSeason ? (bySeason[currentSeason] ?? []) : [];
  const futureSeasons = currentSeason
    ? allSeasons.filter((s) => s > currentSeason)
    : [];
  const pastSeasons = currentSeason
    ? allSeasons.filter((s) => s < currentSeason)
    : [];

  // Fallback: nessuna stagione marcata come corrente
  const noCurrentSet = !currentSeason;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 6, md: 9 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.06)", pointerEvents: "none" }} />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip label="Agonismo" color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            Le nostre squadre
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, maxWidth: 540, mx: "auto", fontSize: { xs: "1rem", md: "1.1rem" } }}>
            Le formazioni agonistiche del Karibu Baskin nei campionati regionali veneti.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>

        {/* Nessuna squadra */}
        {allSeasons.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <GroupsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Nessuna squadra registrata</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Le squadre verranno aggiunte dall&apos;amministratore.
            </Typography>
          </Box>
        )}

        <Stack spacing={8}>

          {/* ── Stagione in corso ── */}
          {currentSeason && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Chip
                  label="In corso"
                  size="small"
                  icon={<StarIcon />}
                  color="warning"
                  sx={{ fontWeight: 700 }}
                />
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                  Stagione {currentSeason}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 3, fontSize: { xs: "1.7rem", md: "2.1rem" } }}>
                Stagione in corso
              </Typography>
              <TeamGrid teams={currentTeams} />
              {currentTeams.length === 0 && (
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                  Squadre in definizione.
                </Typography>
              )}
            </Box>
          )}

          {/* ── Prossime stagioni ── */}
          {futureSeasons.length > 0 && (
            <Box>
              <Divider sx={{ mb: 4 }} />
              <Stack spacing={4}>
                {futureSeasons.map((season) => (
                  <Box key={season}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                      <Chip
                        label="In arrivo"
                        size="small"
                        icon={<ScheduleIcon />}
                        variant="outlined"
                        sx={{ fontWeight: 700, color: "text.secondary", borderColor: "divider" }}
                      />
                      <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                        Stagione {season}
                      </Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={800} color="text.secondary" sx={{ mb: 3, fontSize: { xs: "1.4rem", md: "1.7rem" } }}>
                      Prossima stagione
                    </Typography>
                    <Box
                      sx={{
                        border: "2px dashed",
                        borderColor: "divider",
                        borderRadius: 2,
                        p: { xs: 2, md: 3 },
                      }}
                    >
                      <TeamGrid teams={bySeason[season]} muted />
                      {bySeason[season].length === 0 && (
                        <Typography variant="body2" color="text.disabled">
                          Squadre in definizione.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Fallback: nessuna stagione corrente marcata ── */}
          {noCurrentSet && allSeasons.length > 0 && (
            <Stack spacing={6}>
              {allSeasons.map((season) => (
                <Box key={season}>
                  <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em", display: "block", mb: 0.5 }}>
                    Stagione {season}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}>
                    Stagione {season}
                  </Typography>
                  <TeamGrid teams={bySeason[season]} />
                </Box>
              ))}
            </Stack>
          )}

        </Stack>

        {/* ── Archivio stagioni passate ── */}
        {pastSeasons.length > 0 && (
          <SquadreArchivio seasons={pastSeasons} bySeason={bySeason} />
        )}

        {/* CTA */}
        {allSeasons.length > 0 && (
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
            <Typography variant="h5" fontWeight={800}>Vuoi giocare con noi?</Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", maxWidth: 420 }}>
              Partecipa agli allenamenti e fatti notare dai coach.
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

function TeamGrid({ teams, muted = false }: { teams: Team[]; muted?: boolean }) {
  return (
    <Grid container spacing={3}>
      {teams.map((team) => (
        <Grid key={team.id} size={{ xs: 12, sm: 6 }}>
          <Link href={`/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`} style={{ textDecoration: "none" }}>
            <Paper
              elevation={0}
              sx={{
                overflow: "hidden",
                border: "1px solid rgba(0,0,0,0.07)",
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
                <Typography variant="h6" fontWeight={800} sx={{ color: muted ? "text.secondary" : "#fff" }}>
                  {team.name}
                </Typography>
                {team.championship && (
                  <Chip
                    label={team.championship}
                    size="small"
                    sx={{
                      backgroundColor: muted ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.2)",
                      color: muted ? "text.secondary" : "#fff",
                      fontWeight: 700,
                    }}
                  />
                )}
              </Box>
              <Box sx={{ p: 2.5 }}>
                {team.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2 }}>
                    {team.description}
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <GroupsIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {team._count.memberships} atleti
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <SportsSoccerIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
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
  );
}
