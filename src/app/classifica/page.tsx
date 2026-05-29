import { prisma } from "@/lib/db";
import { Box, Container, Typography, Chip } from "@mui/material";
import EmptyState from "@/components/EmptyState";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Link from "next/link";
import type { Metadata } from "next";
import ClassificaTableClient from "@/components/ClassificaTableClient";
import type { ClassificaRow } from "@/components/ClassificaTableClient";
import { getCurrentSeason } from "@/lib/seasonUtils";

export const metadata: Metadata = { title: "Classifica | Karibu Baskin" };
export const revalidate = 3600;

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
  const selectedSeason =
    sp.season ?? seasons.find((s) => s === currentSeason) ?? seasons[0] ?? currentSeason;

  // Query aggregata: somma punti/canestri/partite per giocatore nella stagione
  const stats = await prisma.playerMatchStats.groupBy({
    by: ["userId", "childId"],
    where: { match: { team: { season: selectedSeason } } },
    _sum: {
      points: true,
      twoPointers: true,
      threePointers: true,
      freeThrows: true,
      fouls: true,
      illegalFouls: true,
      shotsAttempted: true,
    },
    _count: { matchId: true },
  });

  // Fetch info giocatori per gli userId trovati
  const userIds = stats.filter((s) => s.userId).map((s) => s.userId as string);
  const childIds = stats.filter((s) => s.childId).map((s) => s.childId as string);

  const [users, children] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            image: true,
            sportRole: true,
            sportRoleVariant: true,
            slug: true,
          },
        })
      : [],
    childIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: childIds } },
          select: { id: true, name: true, slug: true, sportRole: true, sportRoleVariant: true },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const childMap = new Map(children.map((c) => [c.id, c]));

  const rows: ClassificaRow[] = [];
  for (const s of stats) {
    const matches = s._count.matchId;
    const points = s._sum.points ?? 0;
    const twoPointers = s._sum.twoPointers ?? 0;
    const threePointers = s._sum.threePointers ?? 0;
    const freeThrows = s._sum.freeThrows ?? 0;
    const fouls = s._sum.fouls ?? 0;
    const illegalFouls = s._sum.illegalFouls ?? 0;
    const shotsAttempted = s._sum.shotsAttempted ?? 0;
    const avgPoints = matches > 0 ? points / matches : 0;
    if (s.userId) {
      const u = userMap.get(s.userId);
      if (u)
        rows.push({
          id: u.id,
          name: u.name ?? "—",
          image: u.image ?? null,
          sportRole: u.sportRole,
          sportRoleVariant: u.sportRoleVariant,
          slug: u.slug,
          kind: "user",
          matches,
          points,
          twoPointers,
          threePointers,
          freeThrows,
          fouls,
          illegalFouls,
          shotsAttempted,
          avgPoints,
        });
    } else if (s.childId) {
      const c = childMap.get(s.childId);
      if (c)
        rows.push({
          id: c.id,
          name: c.name,
          image: null,
          sportRole: c.sportRole,
          sportRoleVariant: c.sportRoleVariant,
          slug: c.slug,
          kind: "child",
          matches,
          points,
          twoPointers,
          threePointers,
          freeThrows,
          fouls,
          illegalFouls,
          shotsAttempted,
          avgPoints,
        });
    }
  }
  rows.sort((a, b) => b.points - a.points || b.matches - a.matches);

  return (
    <>
      <SiteHeader />

      <PageHero
        chip="Agonismo"
        title="Classifica"
        subtitle="Statistiche aggregate per stagione."
        subtitleMaxWidth={460}
        py={{ xs: 5, md: 7 }}
      />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Selector stagione */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Stagione:
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {seasons.map((s) => (
              <Link
                key={s}
                href={`/classifica?season=${encodeURIComponent(s)}`}
                style={{ textDecoration: "none" }}
              >
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
          <EmptyState
            icon={<EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={`Nessuna statistica per la stagione ${selectedSeason}`}
          />
        ) : (
          <ClassificaTableClient rows={rows} selectedSeason={selectedSeason} />
        )}
      </Container>
    </>
  );
}
