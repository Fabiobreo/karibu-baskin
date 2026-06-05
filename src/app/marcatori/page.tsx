import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Container, Typography, Box, Paper, Chip, Button } from "@mui/material";
import EmptyState from "@/components/common/EmptyState";
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Link from "next/link";
import type { Metadata } from "next";
import ClassificaInternaTable from "@/components/teams/ClassificaInternaTable";
import type { PlayerStatRow } from "@/components/teams/ClassificaInternaTable";
import { getCurrentSeason } from "@/lib/seasonUtils";

export const metadata: Metadata = {
  title: "Marcatori | Karibu Baskin",
  description:
    "Classifica marcatori interna del Karibu Baskin di Montecchio Maggiore — punti, tiri e statistiche per giocatore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MarcatoriPage({ searchParams }: Props) {
  const t = await getTranslations("scorers");
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
      by: ["userId", "childId", "isLoan"],
      where: {
        OR: [{ userId: { not: null } }, { childId: { not: null } }],
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

  // Chiave giocatore unica per User/Child ("u:id" | "c:id").
  const keyOf = (s: { userId: string | null; childId: string | null }): string | null =>
    s.userId ? `u:${s.userId}` : s.childId ? `c:${s.childId}` : null;

  const userIds = Array.from(
    new Set(allStats.map((s) => s.userId).filter((x): x is string => !!x))
  );
  const childIds = Array.from(
    new Set(allStats.map((s) => s.childId).filter((x): x is string => !!x))
  );

  const [users, children, memberships] = await Promise.all([
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
      : [],
    childIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: childIds } },
          select: { id: true, name: true, slug: true, sportRole: true, sportRoleVariant: true },
        })
      : [],
    prisma.teamMembership.findMany({
      where: {
        team: { season: activeSeason },
        OR: [
          ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
          ...(childIds.length > 0 ? [{ childId: { in: childIds } }] : []),
        ],
      },
      select: {
        userId: true,
        childId: true,
        team: { select: { id: true, name: true, color: true } },
      },
    }),
  ]);

  // Mappa playerKey → dati anagrafici (i figli non hanno immagine).
  type PlayerInfo = {
    id: string;
    kind: "user" | "child";
    name: string | null;
    image: string | null;
    slug: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
  };
  const playerMap = new Map<string, PlayerInfo>();
  for (const u of users) playerMap.set(`u:${u.id}`, { ...u, kind: "user" });
  for (const c of children) playerMap.set(`c:${c.id}`, { ...c, kind: "child", image: null });

  const teamsByPlayer = new Map<string, { id: string; name: string; color: string | null }[]>();
  for (const m of memberships) {
    const k = m.userId ? `u:${m.userId}` : m.childId ? `c:${m.childId}` : null;
    if (!k) continue;
    const arr = teamsByPlayer.get(k) ?? [];
    arr.push(m.team);
    teamsByPlayer.set(k, arr);
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
  const byPlayer = new Map<string, { primary: Bucket; loan: Bucket }>();
  for (const s of allStats) {
    const k = keyOf(s);
    if (!k) continue;
    const entry = byPlayer.get(k) ?? { primary: { ...emptyBucket }, loan: { ...emptyBucket } };
    const target = s.isLoan ? entry.loan : entry.primary;
    target.matches += s._count.matchId;
    target.points += s._sum.points ?? 0;
    target.twoPointers += s._sum.twoPointers ?? 0;
    target.threePointers += s._sum.threePointers ?? 0;
    target.freeThrows += s._sum.freeThrows ?? 0;
    target.fouls += s._sum.fouls ?? 0;
    target.illegalFouls += s._sum.illegalFouls ?? 0;
    target.shotsAttempted += s._sum.shotsAttempted ?? 0;
    byPlayer.set(k, entry);
  }

  const statRows: PlayerStatRow[] = Array.from(byPlayer.entries())
    .filter(([k]) => playerMap.has(k))
    .map(([k, { primary, loan }]) => {
      const p = playerMap.get(k)!;
      return {
        id: p.id,
        kind: p.kind,
        name: p.name,
        image: p.image,
        slug: p.slug,
        sportRole: p.sportRole,
        sportRoleVariant: p.sportRoleVariant,
        matches: primary.matches,
        points: primary.points,
        twoPointers: primary.twoPointers,
        threePointers: primary.threePointers,
        freeThrows: primary.freeThrows,
        fouls: primary.fouls,
        illegalFouls: primary.illegalFouls,
        shotsAttempted: primary.shotsAttempted,
        teams: teamsByPlayer.get(k) ?? [],
        loanMatches: loan.matches,
        loanPoints: loan.points,
        loanTwoPointers: loan.twoPointers,
        loanThreePointers: loan.threePointers,
        loanFreeThrows: loan.freeThrows,
        loanFouls: loan.fouls,
        loanIllegalFouls: loan.illegalFouls,
        loanShotsAttempted: loan.shotsAttempted,
      };
    });

  const availableSeasons = statSeasons.map((s) => s.season);
  const hasStats = statRows.length > 0;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <PageHero py={{ xs: 5, md: 7 }} align="left">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <LeaderboardIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={700}
            sx={{ letterSpacing: "0.12em" }}
          >
            {t("heroChip")}
          </Typography>
        </Box>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={800}
          sx={{ fontSize: { xs: "1.9rem", md: "2.6rem" } }}
        >
          {t("pageTitle")}
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
              {t("linkStandings")}
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
              {t("linkResults")}
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
              {t("seasonLabel")}
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
              {t.rich("helpText", {
                season: activeSeason,
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </Typography>
            <ClassificaInternaTable rows={statRows} />
          </>
        ) : availableSeasons.length > 0 ? (
          <EmptyState title={t("empty", { season: activeSeason })} />
        ) : (
          <EmptyState
            icon={<LeaderboardIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("emptyGeneric")}
            message={t("emptyDesc")}
          />
        )}
      </Container>
    </>
  );
}
