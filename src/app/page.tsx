import { prisma } from "@/lib/db";
import {
  Container,
  Typography,
  Box,
  Grid2 as Grid,
  Paper,
} from "@mui/material";
import SessionCard from "@/components/SessionCard";
import type { SessionWithCount } from "@/components/SessionCard";
import SiteHeader from "@/components/SiteHeader";
import type { TeamsData } from "@/components/TeamDisplay";
import HeroSection from "@/components/HeroSection";

export const revalidate = 0;

export default async function HomePage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rawSessions = await prisma.trainingSession.findMany({
    where: { date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  const sessions = rawSessions.map((s) => ({
    ...s,
    teams: s.teams as unknown as TeamsData | null,
  })) satisfies SessionWithCount[];

  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = s.endTime
      ? new Date(s.endTime)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
  });

  const upcoming = sessions.filter((s) => new Date(s.date) > now);

  return (
    <>
      <SiteHeader />
      <HeroSection />

      <Container id="allenamenti" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>

        {/* ── In corso ── */}
        {inCorso.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "#2E7D32",
                  flexShrink: 0,
                  "@keyframes pulse": {
                    "0%":   { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                    "70%":  { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
                  },
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
              <Typography variant="overline" fontWeight={700} sx={{ letterSpacing: "0.1em", color: "#2E7D32" }}>
                In corso ({inCorso.length})
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {inCorso.map((s) => (
                <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <SessionCard session={s} live />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── Prossimi allenamenti ── */}
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          sx={{ letterSpacing: "0.1em", display: "block", mb: 1.5 }}
        >
          Prossimi allenamenti ({upcoming.length})
        </Typography>

        {upcoming.length === 0 ? (
          <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center", borderStyle: "dashed" }}>
            <Typography color="text.secondary">Nessun allenamento programmato.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {upcoming.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <SessionCard session={s} />
              </Grid>
            ))}
          </Grid>
        )}

      </Container>
    </>
  );
}
