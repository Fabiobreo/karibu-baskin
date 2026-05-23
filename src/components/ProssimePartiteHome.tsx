import Link from "next/link";
import { Box, Container, Typography } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { prisma } from "@/lib/db";
import ProssimePartiteCards from "./ProssimePartiteCards";

const DAYS_AHEAD = 14;
const IMMINENT_HOURS = 48;

export default async function ProssimePartiteHome() {
  const now = new Date();
  const limit = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const imminentLimit = new Date(now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000);

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

  const cardData = matches.map((m) => ({
    ...m,
    isImminent: m.date <= imminentLimit,
  }));

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

        <ProssimePartiteCards matches={cardData} />

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
