import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Button } from "@mui/material";
import EmptyState from "@/components/EmptyState";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Link from "next/link";
import type { Metadata } from "next";
import ClassificaInternaTable from "@/components/ClassificaInternaTable";
import type { PlayerStatRow } from "@/components/ClassificaInternaTable";
import { getCurrentSeason } from "@/lib/seasonUtils";

export const metadata: Metadata = {
  title: "Marcatori | Karibu Baskin",
  description:
    "Classifica marcatori interna del Karibu Baskin di Montecchio Maggiore — punti, tiri e statistiche per giocatore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MarcatoriPage({ searchParams }: Props) {
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null;

  const currentSeason = getCurrentSeason();
  const activeSeason = seasonFilter ?? currentSeason;

  const [statSeasons, allStats] = await Promise.all([
    // Stagioni con statistiche disponibili
    prisma.competitiveTeam.findMany({
      where: { matches: { some: { playerStats: { some: {} } } } },
      select: { season: true },
      distinct: ["season"],
      orderBy: { season: "desc" },
    }),
    // Player stats per la stagione, separati per "prestito" vs principale
    // così possiamo mostrare la breakdown X (+Y) in tabella.
    prisma.playerMatchStats.groupBy({
      by: ["userId", "isLoan"],
      where: {
        userId: { not: null },
        match: { team: { season: activeSeason } },
      },
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
    }),
  ]);

  const userIds = Array.from(new Set(allStats.map((s) => s.userId!).filter(Boolean)));
  const [users, memberships] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            image: true,
            slug: true,
            sportRole: true,
            sportRoleVariant: true,
          },
        })
      : Promise.resolve(
          [] as {
            id: string;
            name: string | null;
            image: string | null;
            slug: string | null;
            sportRole: number | null;
            sportRoleVariant: string | null;
          }[]
        ),
    userIds.length > 0
      ? prisma.teamMembership.findMany({
          where: { userId: { in: userIds }, team: { season: activeSeason } },
          select: {
            userId: true,
            team: { select: { id: true, name: true, color: true } },
          },
        })
      : Promise.resolve(
          [] as {
            userId: string | null;
            team: { id: string; name: string; color: string | null };
          }[]
        ),
  ]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const teamsByUser = new Map<string, { id: string; name: string; color: string | null }[]>();
  for (const m of memberships) {
    if (!m.userId) continue;
    const arr = teamsByUser.get(m.userId) ?? [];
    arr.push(m.team);
    teamsByUser.set(m.userId, arr);
  }

  // Aggrega per utente combinando le due righe (isLoan = false / true) in
  // un'unica PlayerStatRow con i campi primari + loanX.
  type Bucket = {
    matches: number;
    points: number;
    twoPointers: number;
    threePointers: number;
    freeThrows: number;
    fouls: number;
    illegalFouls: number;
    shotsAttempted: number;
  };
  const emptyBucket: Bucket = {
    matches: 0,
    points: 0,
    twoPointers: 0,
    threePointers: 0,
    freeThrows: 0,
    fouls: 0,
    illegalFouls: 0,
    shotsAttempted: 0,
  };
  const byUser = new Map<string, { primary: Bucket; loan: Bucket }>();
  for (const s of allStats) {
    if (!s.userId) continue;
    const entry = byUser.get(s.userId) ?? { primary: { ...emptyBucket }, loan: { ...emptyBucket } };
    const target = s.isLoan ? entry.loan : entry.primary;
    target.matches += s._count.matchId;
    target.points += s._sum.points ?? 0;
    target.twoPointers += s._sum.twoPointers ?? 0;
    target.threePointers += s._sum.threePointers ?? 0;
    target.freeThrows += s._sum.freeThrows ?? 0;
    target.fouls += s._sum.fouls ?? 0;
    target.illegalFouls += s._sum.illegalFouls ?? 0;
    target.shotsAttempted += s._sum.shotsAttempted ?? 0;
    byUser.set(s.userId, entry);
  }

  const statRows: PlayerStatRow[] = Array.from(byUser.entries())
    .filter(([userId]) => userMap[userId])
    .map(([userId, { primary, loan }]) => ({
      userId,
      name: userMap[userId].name,
      image: userMap[userId].image,
      slug: userMap[userId].slug,
      sportRole: userMap[userId].sportRole,
      sportRoleVariant: userMap[userId].sportRoleVariant,
      matches: primary.matches,
      points: primary.points,
      twoPointers: primary.twoPointers,
      threePointers: primary.threePointers,
      freeThrows: primary.freeThrows,
      fouls: primary.fouls,
      illegalFouls: primary.illegalFouls,
      shotsAttempted: primary.shotsAttempted,
      teams: teamsByUser.get(userId) ?? [],
      loanMatches: loan.matches,
      loanPoints: loan.points,
      loanTwoPointers: loan.twoPointers,
      loanThreePointers: loan.threePointers,
      loanFreeThrows: loan.freeThrows,
      loanFouls: loan.fouls,
      loanIllegalFouls: loan.illegalFouls,
      loanShotsAttempted: loan.shotsAttempted,
    }));

  const availableSeasons = statSeasons.map((s) => s.season);
  const hasStats = statRows.length > 0;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <PageHero py={{ xs: 5, md: 7 }} align="left" decorativeCircles={false}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <LeaderboardIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={700}
            sx={{ letterSpacing: "0.12em" }}
          >
            Marcatori
          </Typography>
        </Box>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={800}
          sx={{ fontSize: { xs: "1.9rem", md: "2.6rem" } }}
        >
          Classifica interna
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexWrap: "wrap" }}>
          <Link href="/classifiche" style={{ textDecoration: "none" }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EmojiEventsIcon />}
              sx={{
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                fontSize: "0.78rem",
                "&:hover": { borderColor: "rgba(255,255,255,0.6)" },
              }}
            >
              Classifica campionato
            </Button>
          </Link>
          <Link href="/risultati" style={{ textDecoration: "none" }}>
            <Button
              size="small"
              variant="outlined"
              sx={{
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                fontSize: "0.78rem",
                "&:hover": { borderColor: "rgba(255,255,255,0.6)" },
              }}
            >
              Tutti i risultati
            </Button>
          </Link>
        </Box>
      </PageHero>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Filtri stagione */}
        {availableSeasons.length > 0 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3, alignItems: "center" }}>
            <Typography
              variant="caption"
              color="text.disabled"
              fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Stagione:
            </Typography>
            {availableSeasons.map((s) => (
              <Link
                key={s}
                href={`/marcatori?season=${encodeURIComponent(s)}`}
                style={{ textDecoration: "none" }}
              >
                <Chip
                  label={s}
                  size="small"
                  variant={activeSeason === s ? "filled" : "outlined"}
                  color={activeSeason === s ? "primary" : "default"}
                  sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.72rem" }}
                />
              </Link>
            ))}
          </Box>
        )}

        {hasStats ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Dati relativi alla stagione <strong>{activeSeason}</strong>. Filtra per ruolo o clicca
              sull&apos;intestazione per ordinare.
            </Typography>
            <ClassificaInternaTable rows={statRows} />
          </>
        ) : availableSeasons.length > 0 ? (
          <EmptyState title={`Nessun dato disponibile per la stagione ${activeSeason}.`} />
        ) : (
          <EmptyState
            icon={<LeaderboardIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title="Nessun dato disponibile"
            message="La classifica marcatori verrà aggiornata con l'avanzare della stagione."
          />
        )}
      </Container>
    </>
  );
}
