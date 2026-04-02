import { prisma } from "@/lib/db";
import {
  Container,
  Typography,
  Box,
  Grid2 as Grid,
} from "@mui/material";
import SessionCard from "@/components/SessionCard";
import SiteHeader from "@/components/SiteHeader";
import HeroSection from "@/components/HeroSection";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

export const revalidate = 0;

export default async function HomePage() {
  const rawSessions = await prisma.trainingSession.findMany({
    where: { date: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
    orderBy: { date: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = rawSessions.map((s) => ({ ...s, teams: s.teams as any ?? null }));

  // Raggruppa per giorno
  const grouped = new Map<string, typeof sessions>();
  sessions.forEach((s) => {
    const key = format(new Date(s.date), "yyyy-MM-dd");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  });

  return (
    <>
      <SiteHeader />
      <HeroSection />

      {/* ── Lista allenamenti ── */}
      <Container id="allenamenti" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <CalendarTodayIcon sx={{ color: "primary.main", fontSize: 22 }} />
          <Typography variant="h5">
            Prossimi allenamenti
          </Typography>
        </Box>

        {sessions.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              px: 3,
              borderRadius: 3,
              backgroundColor: "background.paper",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nessun allenamento programmato
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Gli allenamenti futuri appariranno qui non appena verranno aggiunti.
            </Typography>
          </Box>
        ) : (
          Array.from(grouped.entries()).map(([dateKey, daySessions]) => (
            <Box key={dateKey} mb={4}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                  letterSpacing: "0.08em",
                  fontSize: "0.75rem",
                  display: "block",
                  mb: 1.5,
                }}
              >
                {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: it })}
              </Typography>
              <Grid container spacing={2}>
                {daySessions.map((s) => (
                  <Grid key={s.id} size={{ xs: 12, sm: 6 }}>
                    <SessionCard session={s} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))
        )}
      </Container>
    </>
  );
}
