import { notFound, redirect } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import EmptyState from "@/components/common/EmptyState";
import PageHero from "@/components/common/PageHero";
import SfidaGame, { type SfidaOutcome } from "@/components/games/sfida/SfidaGame";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { gameAccess } from "@/lib/games/gameSettings";
import { loadGameSettings } from "@/lib/games/loadGameSettings";
import {
  buildSfida,
  parseSfidaLink,
  seasonShortfall,
  type SfidaContext,
  type SfidaPlayerView,
  type SfidaState,
} from "@/lib/games/sfidaState";
import { columnSx } from "@/lib/layout";
import { loginHref } from "@/lib/loginReturn";
import { runMatchSimulation, runSimulation } from "@/lib/rating/simulatorServer";
import { simPlayerKey } from "@/lib/rating/simulatorShared";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { mulberry32 } from "@/lib/seededRandom";
import { buildMetadata } from "@/lib/seo";
import { teamFill } from "@/lib/teamColors";

export const metadata: Metadata = buildMetadata({
  title: "Sfida",
  description: "Una sfida fra le squadre del Karibu Baskin, per gioco.",
  path: "/giochi/sfida",
  noindex: true,
});
export const revalidate = 0;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Una sfida nuova a ogni apertura: il seme cambia ogni volta, di proposito. */
function freshSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Il risultato di un link condiviso, calcolato qui: il client parte già con il tabellone. */
async function linkOutcome(state: SfidaState): Promise<SfidaOutcome | null> {
  const [a, b] = state.sides;
  if (state.mode === "six") {
    const r = await runSimulation(a.lineup, b.lineup, state.nonce);
    return r.ok
      ? {
          kind: "six",
          scoreA: r.result.scoreA,
          scoreB: r.result.scoreB,
          winner: r.result.winner,
          pctA: Math.round(r.result.winProbabilityA * 100),
        }
      : null;
  }
  const r = await runMatchSimulation(a.quarters, b.quarters, state.nonce);
  return r.ok ? { kind: "full", ...r.result } : null;
}

// La Sfida (UX-66, UX-69): partita pronta fra due nostre squadre o fra tutti
// mescolati, sei contro sei o partita intera in 4 tempi.
export default async function SfidaPage({ searchParams }: Props) {
  const [session, settings] = await Promise.all([auth(), loadGameSettings()]);
  // Il simulatore è un gioco (UX-66) ma mostra nomi e rose dei tesserati,
  // minori compresi: mai per tutti, e acceso o spento dall'admin. Il login è
  // aperto a qualunque account Google (nasce GUEST), quindi non basta la sessione.
  const access = gameAccess(settings.simulator, session?.user?.appRole);
  if (access === "hidden") notFound();
  if (access === "members") redirect(session?.user ? "/" : loginHref("/giochi/sfida"));

  const [t, tGames, sp, season] = await Promise.all([
    getTranslations("simulator"),
    getTranslations("pages.games"),
    searchParams,
    getCurrentSeasonLabel(),
  ]);

  // Nessun livello in questa query: il calcolo avviene sul server
  // (runSimulation) e il client non lo deve ricevere.
  const teamsRaw = await prisma.competitiveTeam.findMany({
    // La Karibu non ha rosa propria.
    where: { season, isMixed: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      memberships: {
        select: {
          user: { select: { id: true, name: true, sportRole: true, gender: true } },
          child: { select: { id: true, name: true, sportRole: true, gender: true } },
        },
      },
    },
  });

  const byKey = new Map<string, SfidaPlayerView>();
  for (const team of teamsRaw) {
    for (const m of team.memberships) {
      const who = m.user
        ? { key: simPlayerKey("user", m.user.id), ...m.user, name: m.user.name ?? "—" }
        : m.child
          ? { key: simPlayerKey("child", m.child.id), ...m.child }
          : null;
      if (!who) continue;
      const known = byKey.get(who.key);
      if (known) known.teamIds.push(team.id);
      else
        byKey.set(who.key, {
          key: who.key,
          name: who.name,
          sportRole: who.sportRole,
          gender: who.gender,
          teamIds: [team.id],
        });
    }
  }
  const ctx: SfidaContext = {
    players: [...byKey.values()],
    teams: teamsRaw.map((tm) => {
      const fill = teamFill(tm.color);
      return { id: tm.id, name: tm.name, fill: fill && { bg: fill.bg, fg: fill.fg } };
    }),
    names: t.raw("names") as string[],
  };

  // Un link condiviso riapre la stessa sfida con il suo risultato; altrimenti
  // una partita nuova, intera se le rose bastano.
  let initial = parseSfidaLink(sp, ctx);
  const initialOutcome = initial ? await linkOutcome(initial) : null;
  if (!initialOutcome) initial = null;
  let notice: string | null = null;
  if (!initial) {
    const rand = mulberry32(freshSeed());
    initial = buildSfida(ctx, { mode: "full", grouping: "season" }, rand);
    if (!initial) {
      initial = buildSfida(ctx, { mode: "six", grouping: "season" }, rand);
      if (initial) notice = t("fullNotPossible");
    }
    // Squadre della stagione chieste ma non bastano: si dice perché.
    if (initial?.grouping === "mixed") {
      const short = seasonShortfall(ctx, initial.mode);
      if (short?.kind === "team") {
        notice = t("seasonTeamShort", {
          team: short.team,
          reason: t(`shortfall.${short.reason}`),
        });
      }
    }
  }

  return (
    <>
      <PageHero column="main" title={t("heroTitle")} />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("main")}>
          {access === "preview" && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {tGames("gamePreview")}
            </Typography>
          )}
          {!initial ? (
            <EmptyState
              icon={<SportsKabaddiIcon sx={{ fontSize: 56, color: "text.secondary" }} />}
              title={t("emptyTitle")}
              message={t("emptyDesc")}
            />
          ) : (
            <SfidaGame
              players={ctx.players}
              teams={ctx.teams}
              names={ctx.names}
              initial={initial}
              initialOutcome={initialOutcome}
              initialNotice={notice}
            />
          )}
        </Box>
      </Container>
    </>
  );
}
