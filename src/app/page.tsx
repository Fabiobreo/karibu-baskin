import { prisma } from "@/lib/db";
import {
  Container,
  Typography,
  Box,
  Grid2 as Grid,
  Button,
} from "@mui/material";
import Link from "next/link";
import SessionCard from "@/components/SessionCard";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

export const revalidate = 0;

export default async function HomePage() {
  const sessions = await prisma.session.findMany({
    where: { date: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
    orderBy: { date: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  // Raggruppa per giorno
  const grouped = new Map<string, typeof sessions>();
  sessions.forEach((s) => {
    const key = format(new Date(s.date), "yyyy-MM-dd");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  });

  return (
    <>
      {/* ── Hero ── */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          pt: { xs: 5, md: 7 },
          pb: { xs: 4, md: 6 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cerchi decorativi */}
        <Box sx={{
          position: "absolute", top: -60, right: -60,
          width: 240, height: 240, borderRadius: "50%",
          backgroundColor: "rgba(230,81,0,0.12)",
          pointerEvents: "none",
        }} />
        <Box sx={{
          position: "absolute", bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: "50%",
          backgroundColor: "rgba(230,81,0,0.08)",
          pointerEvents: "none",
        }} />

        {/* Admin link */}
        <Box sx={{ position: "absolute", top: 12, right: 16 }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <Button
              size="small"
              sx={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.75rem",
                "&:hover": { color: "rgba(255,255,255,0.9)", backgroundColor: "rgba(255,255,255,0.08)" },
              }}
            >
              Admin
            </Button>
          </Link>
        </Box>

        {/* Logo */}
        <Box
          component="img"
          src="/logo.png"
          alt="Karibu Baskin"
          sx={{
            width: { xs: 90, md: 110 },
            height: "auto",
            mb: 2,
            position: "relative",
            zIndex: 1,
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
          }}
        />

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 0.5,
            position: "relative",
            zIndex: 1,
            fontSize: { xs: "1.6rem", md: "2.1rem" },
          }}
        >
          Karibu Baskin
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "rgba(255,255,255,0.55)",
            position: "relative",
            zIndex: 1,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          Montecchio Maggiore
        </Typography>
      </Box>

      {/* ── Lista allenamenti ── */}
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
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
