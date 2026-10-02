import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { isMinor, isMinorChild } from "@/lib/minors";
import { getTranslations } from "next-intl/server";
import { Container, Typography } from "@mui/material";
import EmptyState from "@/components/common/EmptyState";
import PageHero from "@/components/common/PageHero";
import SeasonSelector from "@/components/common/SeasonSelector";
import MatchesSectionNav from "@/components/matches/MatchesSectionNav";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import type { Metadata } from "next";
import ClassificaInternaTable from "@/components/teams/ClassificaInternaTable";
import type { PlayerStatRow } from "@/components/teams/ClassificaInternaTable";
import { getActiveSeason } from "@/lib/season/activeSeason";
import { parseSeasonParam } from "@/lib/season/seasonUtils";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Marcatori",
  description:
    "Classifica marcatori interna del Karibu Baskin di Montecchio Maggiore: punti, tiri e statistiche per giocatore.",
  path: "/marcatori",
});

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MarcatoriPage({ searchParams }: Props) {
  // Stagione attiva del sito + stagioni con statistiche (per i chip). Senza
  // filtro esplicito si mostra la stagione da visualizzare, che ricade
  // sull'ultima popolata quando la attiva non è ancora iniziata.
  const [
    t,
    session,
    sp,
    { activeSeason: siteSeason, displaySeason, isFallback, seasons: chipSeasons, hasAnyData },
  ] = await Promise.all([
    getTranslations("scorers"),
    auth(),
    searchParams,
    getActiveSeason("playerStats"),
  ]);
  const viewerIsMember = isMemberRole(session?.user?.appRole);
  const seasonFilter = parseSeasonParam(sp.season);
  const activeSeason = seasonFilter ?? displaySeason;
  // La riga di ricaduta si mostra solo quando l'utente non ha scelto lui la stagione.
  const showFallbackNotice = !seasonFilter && isFallback;

  const [allStats, mvpRows] = await Promise.all([
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
    // Conteggio premi MVP per giocatore nella stagione attiva (non splittato
    // prestito/principale: il modello MatchMvp non traccia isLoan).
    prisma.matchMvp.groupBy({
      by: ["userId", "childId"],
      where: {
        OR: [{ userId: { not: null } }, { childId: { not: null } }],
        match: { team: { season: activeSeason } },
      },
      _count: { _all: true },
    }),
  ]);
  const mvpByPlayer = new Map<string, number>();
  for (const m of mvpRows) {
    const k = m.userId ? `u:${m.userId}` : m.childId ? `c:${m.childId}` : null;
    if (!k) continue;
    mvpByPlayer.set(k, (mvpByPlayer.get(k) ?? 0) + m._count._all);
  }

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
            birthDate: true,
          },
        })
      : [],
    childIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: childIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            sportRole: true,
            sportRoleVariant: true,
            birthDate: true,
          },
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
  // Tutela dei minori: per chi non è tesserato la classifica non li mostra.
  // birthDate non arriva al client: le righe della tabella sono costruite campo
  // per campo più sotto.
  let hiddenMinors = 0;
  for (const u of users) {
    if (!viewerIsMember && isMinor(u.birthDate)) {
      hiddenMinors++;
      continue;
    }
    playerMap.set(`u:${u.id}`, { ...u, kind: "user" });
  }
  for (const c of children) {
    if (!viewerIsMember && isMinorChild(c.birthDate)) {
      hiddenMinors++;
      continue;
    }
    playerMap.set(`c:${c.id}`, { ...c, kind: "child", image: null });
  }

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
        mvpCount: mvpByPlayer.get(k) ?? 0,
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

  // La stagione attiva è sempre fra i chip, anche quando è vuota: così si può
  // tornarci dopo una ricaduta. Un filtro su una stagione fuori elenco si aggiunge.
  const availableSeasons = chipSeasons.includes(activeSeason)
    ? chipSeasons
    : [...chipSeasons, activeSeason].sort((a, b) => b.localeCompare(a));
  const hasStats = statRows.length > 0;

  return (
    <>
      <PageHero
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        nav={<MatchesSectionNav current="scorers" season={seasonFilter} />}
      />

      {/* `lg` e non `md`: questa e' l'unica tabella larga del sito, e dentro un
          contenitore da testo l'ultima colonna restava tagliata. */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <SeasonSelector
          seasons={availableSeasons}
          current={activeSeason}
          basePath="/marcatori"
          notice={showFallbackNotice ? { active: siteSeason, shown: displaySeason } : null}
        />

        {hasStats ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("helpText")}
            </Typography>
            <ClassificaInternaTable rows={statRows} />
            {hiddenMinors > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1.5 }}
              >
                {t("minorsHidden")}
              </Typography>
            )}
          </>
        ) : hasAnyData ? (
          <EmptyState
            icon={<LeaderboardIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("empty", { season: activeSeason })}
            message={t("emptySeasonDesc")}
          />
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
