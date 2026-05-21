import Link from "next/link";
import { Box, Container, Typography, Paper, Chip, Stack } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HomeIcon from "@mui/icons-material/Home";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import BoltIcon from "@mui/icons-material/Bolt";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";

const DAYS_AHEAD = 14;
const IMMINENT_HOURS = 48;

function relativeLabel(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays > 1 && diffDays <= 6) {
    return format(date, "EEEE", { locale: it }).replace(/^./, (c) => c.toUpperCase());
  }
  return `Tra ${diffDays} giorni`;
}

export default async function ProssimePartiteHome() {
  const now = new Date();
  const limit = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: { date: { gte: now, lte: limit } },
    orderBy: { date: "asc" },
    take: 3,
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      venue: true,
      team: { select: { id: true, name: true, color: true } },
      opponent: { select: { id: true, name: true } },
      opponentTeam: { select: { id: true, name: true } },
    },
  });

  if (matches.length === 0) return null;

  const imminentLimit = new Date(now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000);

  return (
    <Box
      sx={{
        py: { xs: 4, md: 6 },
        background: "linear-gradient(135deg, rgba(230,81,0,0.06) 0%, rgba(230,81,0,0.02) 100%)",
        borderTop: "1px solid rgba(230,81,0,0.12)",
        borderBottom: "1px solid rgba(230,81,0,0.12)",
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <EmojiEventsIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography
              variant="overline"
              color="primary"
              fontWeight={700}
              sx={{ letterSpacing: "0.1em", lineHeight: 1 }}
            >
              Campionato
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ mt: 0.25, fontSize: { xs: "1.4rem", md: "1.6rem" } }}
            >
              Prossime partite
            </Typography>
          </Box>
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="stretch"
          sx={{ "& > *": { flex: 1 } }}
        >
          {matches.map((m, idx) => {
            const isImminent = m.date <= imminentLimit;
            const isFirst = idx === 0;
            const highlight = isFirst && isImminent;
            return (
              <Link
                key={m.id}
                href={m.slug ? `/partite/${m.slug}` : `/partite`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <Paper
                  elevation={highlight ? 6 : 2}
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    border: highlight ? "2px solid" : "1px solid",
                    borderColor: highlight ? "primary.main" : "rgba(0,0,0,0.08)",
                    transition: "all 0.18s",
                    cursor: "pointer",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: 8,
                    },
                  }}
                >
                  {/* Striscia colore squadra */}
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      backgroundColor: m.team.color,
                    }}
                  />
                  <Box sx={{ pl: 1.5 }}>
                    {isImminent && (
                      <Chip
                        icon={<BoltIcon sx={{ fontSize: 16 }} />}
                        label="Imminente"
                        size="small"
                        sx={{
                          mb: 1,
                          fontWeight: 700,
                          bgcolor: "primary.main",
                          color: "#fff",
                          animation: "karibuPulse 1.6s ease-in-out infinite",
                          "@keyframes karibuPulse": {
                            "0%, 100%": { boxShadow: "0 0 0 0 rgba(230,81,0,0.5)" },
                            "50%": { boxShadow: "0 0 0 6px rgba(230,81,0,0)" },
                          },
                        }}
                      />
                    )}
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{
                        color: "text.primary",
                        lineHeight: 1.1,
                        fontSize: { xs: "1.05rem", md: "1.15rem" },
                      }}
                    >
                      {relativeLabel(m.date, now)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 1.5 }}
                    >
                      {format(m.date, "d MMM · HH:mm", { locale: it })}
                    </Typography>

                    <Typography
                      variant="body1"
                      sx={{ lineHeight: 1.35, color: "text.primary", mb: 0.25 }}
                    >
                      {m.isHome ? (
                        <>
                          <Box component="span" sx={{ fontWeight: 800 }}>
                            {m.team.name}
                          </Box>{" "}
                          <Box component="span" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            vs
                          </Box>{" "}
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                          </Box>
                        </>
                      ) : (
                        <>
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                          </Box>{" "}
                          <Box component="span" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            vs
                          </Box>{" "}
                          <Box component="span" sx={{ fontWeight: 800 }}>
                            {m.team.name}
                          </Box>
                        </>
                      )}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mt: 1,
                        color: "text.secondary",
                      }}
                    >
                      {m.isHome ? (
                        <HomeIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <FlightTakeoffIcon sx={{ fontSize: 16 }} />
                      )}
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {m.isHome ? "Casa" : "Trasferta"}
                        {m.venue ? ` · ${m.venue}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Link>
            );
          })}
        </Stack>

        <Box sx={{ textAlign: "right", mt: 2 }}>
          <Link href="/partite" style={{ textDecoration: "none" }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
            >
              Vedi tutte →
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
