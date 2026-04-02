import { prisma } from "@/lib/db";
import { Container, Typography, Box, Grid2 as Grid, Button } from "@mui/material";
import SessionCard from "@/components/SessionCard";
import SiteHeader from "@/components/SiteHeader";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import HistoryIcon from "@mui/icons-material/History";
import Link from "next/link";

export const revalidate = 0;

interface Props {
  searchParams: Promise<{ passati?: string }>;
}

export default async function AllenamentiPage({ searchParams }: Props) {
  const params = await searchParams;
  const showPast = params.passati === "1";
  const now = new Date();

  const rawSessions = showPast
    ? await prisma.trainingSession.findMany({
        where: { date: { lt: now } },
        orderBy: { date: "desc" },
        include: { _count: { select: { registrations: true } } },
      })
    : await prisma.trainingSession.findMany({
        where: { date: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
        orderBy: { date: "asc" },
        include: { _count: { select: { registrations: true } } },
      });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = rawSessions.map((s) => ({ ...s, teams: s.teams as any ?? null }));

  const grouped = new Map<string, typeof sessions>();
  sessions.forEach((s) => {
    const key = format(new Date(s.date), "yyyy-MM-dd");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  });

  return (
    <>
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <CalendarTodayIcon sx={{ color: "primary.main", fontSize: 22 }} />
          <Typography variant="h5">Allenamenti</Typography>
        </Box>

        {/* Toggle prossimi / passati */}
        <Box sx={{ display: "flex", gap: 1, mb: 4 }}>
          <Link href="/allenamenti" style={{ textDecoration: "none" }}>
            <Button
              variant={!showPast ? "contained" : "outlined"}
              size="small"
              startIcon={<CalendarTodayIcon />}
              sx={{ borderRadius: 2 }}
            >
              Prossimi
            </Button>
          </Link>
          <Link href="/allenamenti?passati=1" style={{ textDecoration: "none" }}>
            <Button
              variant={showPast ? "contained" : "outlined"}
              size="small"
              startIcon={<HistoryIcon />}
              sx={{ borderRadius: 2 }}
            >
              Passati
            </Button>
          </Link>
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
              {showPast ? "Nessun allenamento passato" : "Nessun allenamento programmato"}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {showPast
                ? "Non ci sono allenamenti passati registrati."
                : "Gli allenamenti futuri appariranno qui non appena verranno aggiunti."}
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
