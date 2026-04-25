import { prisma } from "@/lib/db";
import {
  Box, Container, Typography, Chip,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Link from "next/link";
import type { Metadata } from "next";
import ClassificaTableClient from "@/components/ClassificaTableClient";
import type { ClassificaRow } from "@/components/ClassificaTableClient";

export const metadata: Metadata = { title: "Classifica | Karibu Baskin" };
export const revalidate = 3600;

function getCurrentSeason(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 8 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ClassificaPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  // Calcola stagioni disponibili
  const allSeasons = await prisma.competitiveTeam.findMany({
    distinct: ["season"],
    select: { season: true },
    orderBy: { season: "desc" },
  });
  const seasons = allSeasons.map((s) => s.season);
  const currentSeason = getCurrentSeason();
  const selectedSeason = sp.season ?? seasons.find((s) => s === currentSeason) ?? seasons[0] ?? currentSeason;

  // Query aggregata: somma punti/canestri/partite per giocatore nella stagione
  const stats = await prisma.playerMatchStats.groupBy({
    by: ["userId", "childId"],
    where: { match: { team: { season: selectedSeason } } },
    _sum: { points: true, baskets: true, fouls: true },
    _count: { matchId: true },
  });

  // Fetch info giocatori per gli userId trovati
  const userIds = stats.filter((s) => s.userId).map((s) => s.userId as string);
  const childIds = stats.filter((s) => s.childId).map((s) => s.childId as string);

  const [users, children] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true, slug: true },
        })
      : [],
    childIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: childIds } },
          select: { id: true, name: true, sportRole: true, sportRoleVariant: true },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const childMap = new Map(children.map((c) => [c.id, c]));

  const rows: ClassificaRow[] = [];
  for (const s of stats) {
    const matches = s._count.matchId;
    const points = s._sum.points ?? 0;
    const baskets = s._sum.baskets ?? 0;
    const fouls = s._sum.fouls ?? 0;
    const avgPoints = matches > 0 ? points / matches : 0;
    if (s.userId) {
      const u = userMap.get(s.userId);
      if (u) rows.push({ id: u.id, name: u.name ?? "—", image: u.image ?? null, sportRole: u.sportRole, sportRoleVariant: u.sportRoleVariant, slug: u.slug, kind: "user", matches, points, baskets, fouls, avgPoints });
    } else if (s.childId) {
      const c = childMap.get(s.childId);
      if (c) rows.push({ id: c.id, name: c.name, image: null, sportRole: c.sportRole, sportRoleVariant: c.sportRoleVariant, slug: null, kind: "child", matches, points, baskets, fouls, avgPoints });
    }
  }
  rows.sort((a, b) => b.points - a.points || b.matches - a.matches);

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
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip label="Agonismo" color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 1.5, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            Classifica
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", maxWidth: 460, mx: "auto" }}>
            Statistiche aggregate per stagione.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Selector stagione */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Stagione:</Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {seasons.map((s) => (
              <Link key={s} href={`/classifica?season=${encodeURIComponent(s)}`} style={{ textDecoration: "none" }}>
                <Chip
                  label={s}
                  size="small"
                  variant={selectedSeason === s ? "filled" : "outlined"}
                  color={selectedSeason === s ? "primary" : "default"}
                  sx={{ cursor: "pointer", fontWeight: 600 }}
                />
              </Link>
            ))}
          </Box>
        </Box>

        {rows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessuna statistica per la stagione {selectedSeason}
            </Typography>
          </Box>
        ) : (
          <ClassificaTableClient rows={rows} selectedSeason={selectedSeason} />
        )}
      </Container>
    </>
  );
}
