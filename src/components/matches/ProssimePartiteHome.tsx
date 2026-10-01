import Link from "next/link";
import { Box, Container, Typography } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import ProssimePartiteCards from "./ProssimePartiteCards";
import { getTranslations } from "next-intl/server";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

const DAYS_AHEAD = 14;
const IMMINENT_HOURS = 48;

export default async function ProssimePartiteHome() {
  const now = new Date();
  const limit = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const imminentLimit = new Date(now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000);

  const [t, matches] = await Promise.all([
    getTranslations("matches"),
    withDbRetry(() =>
      prisma.match.findMany({
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
      })
    ),
  ]);

  if (matches.length === 0) return null;

  const cardData = matches.map((m) => ({
    ...m,
    isImminent: m.date <= imminentLimit,
  }));

  return (
    <Box
      sx={{
        py: { xs: 4, md: 6 },
        // Sul fondo della pagina, con un filo sopra: la fascia pesca qui non
        // ha convinto il committente (01/10); il colore lo portano le card.
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          {/* Icona decorativa di una sezione chiara: arancio (UX-28, opzione B). */}
          <EmojiEventsIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
              {t("homeChip")}
            </Typography>
            <Typography
              variant="h5"
              component="h2"
              sx={{ mt: 0.25, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl2 } }}
            >
              {t("homeUpcoming")}
            </Typography>
          </Box>
        </Box>

        <ProssimePartiteCards matches={cardData} />

        <Box sx={{ textAlign: "right", mt: 2 }}>
          <Link href="/partite" style={{ textDecoration: "none" }}>
            <Typography
              variant="body2"
              color="primary.onLight"
              sx={{ fontWeight: FONT_WEIGHT.semibold, "&:hover": { textDecoration: "underline" } }}
            >
              {t("homeSeeAll")}
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
