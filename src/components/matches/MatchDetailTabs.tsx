"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import GroupsIcon from "@mui/icons-material/Groups";
import type { MatchStatRow } from "@/components/matches/MatchStatsTable";
import type { StandingEntry } from "@/lib/season/standings";
import type {
  CallupEntry,
  CallupWithStat,
  PrevMatchPreview,
} from "@/components/matches/matchDetailTypes";
import MatchCallupsTab from "@/components/matches/tabs/MatchCallupsTab";
import MatchStatsTab from "@/components/matches/tabs/MatchStatsTab";
import { TYPE_SCALE } from "@/lib/typeScale";

interface Props {
  notes: string | null;
  stats: MatchStatRow[];
  callups: CallupEntry[];
  canSeeCallups: boolean;
  hasScore: boolean;
  prevMatches: PrevMatchPreview[];
  groupStandings: StandingEntry[] | null;
  ourTeamId: string;
  /** Colore salvato della nostra squadra: pallino accanto al nome in classifica. */
  ourTeamColor?: string | null;
  /**
   * Colore della squadra di convocati e marcatori, per la tinta degli avatar.
   * Null nelle amichevoli interne: i giocatori stanno su due squadre nostre.
   */
  playersTeamColor?: string | null;
  groupName: string | null;
  opponentName: string;
  matchId: string;
  isStaff: boolean;
}

/** Orchestratore dei tab della pagina partita: Convocati e Statistiche. */
export default function MatchDetailTabs({
  stats,
  callups,
  canSeeCallups,
  hasScore,
  prevMatches,
  groupStandings,
  ourTeamColor = null,
  playersTeamColor = null,
  groupName,
  opponentName,
  matchId,
  isStaff,
}: Props) {
  const t = useTranslations("matches");
  const hasStats = stats.length > 0;
  // Partita non giocata: niente tab "Statistiche", per nessuno (UX-50).
  const showStatsTab = hasScore || hasStats;
  // Chi non vede i convocati non deve atterrare su un lucchetto: se ci sono
  // statistiche, la pagina parte da quelle (UX-06).
  const [tab, setTab] = useState(!canSeeCallups && hasStats ? 1 : 0);

  // Merge callups + stats per partite già giocate. A statistiche inserite, un
  // convocato senza riga salvata ha giocato senza punti né falli: vale una riga
  // a zero, nei convocati e nella tab Statistiche (non "nessun dato"). Solo per
  // chi vede i convocati: agli altri non si aggiungono nomi.
  const statOf = (c: CallupEntry) =>
    stats.find(
      (s) => (c.userId && s.user?.id === c.userId) || (c.childId && s.child?.id === c.childId)
    ) ?? null;
  const zeroRows: MatchStatRow[] =
    hasStats && canSeeCallups
      ? callups
          .filter((c) => (c.user || c.child) && !statOf(c))
          .map((c) => ({
            id: `zero-${c.id}`,
            points: 0,
            twoPointers: 0,
            threePointers: 0,
            freeThrows: 0,
            fouls: 0,
            illegalFouls: 0,
            shotsAttempted: 0,
            user: c.user,
            child: c.child,
          }))
      : [];
  const allStats = [...stats, ...zeroRows];
  const callupsWithStats: CallupWithStat[] = callups.map((c) => ({
    ...c,
    stat: statOf(c) ?? zeroRows.find((z) => z.id === `zero-${c.id}`) ?? null,
  }));

  const callupsLabel = `${t("tabCallups")}${canSeeCallups && callups.length > 0 ? ` (${callups.length})` : ""}`;
  const callupsContent = (headingComponent?: "h3") => (
    <MatchCallupsTab
      callups={callupsWithStats}
      canSeeCallups={canSeeCallups}
      hasScore={hasScore}
      stats={stats}
      prevMatches={prevMatches}
      groupStandings={groupStandings}
      ourTeamColor={ourTeamColor}
      playersTeamColor={playersTeamColor}
      groupName={groupName}
      opponentName={opponentName}
      matchId={matchId}
      isStaff={isStaff}
      headingComponent={headingComponent}
    />
  );

  // Una scheda sola (partita non giocata): niente tablist con una tab, che al
  // lettore di schermo annuncia "scheda 1 di 1" e a vista è un'intestazione
  // finta. Solo il contenuto, sotto un titolo vero.
  if (!showStatsTab) {
    return (
      <Box component="section" aria-labelledby="match-callups-title">
        <Typography
          id="match-callups-title"
          component="h2"
          variant="h6"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <GroupsIcon sx={{ fontSize: 20, color: "primary.main" }} aria-hidden="true" />
          {callupsLabel}
        </Typography>
        {callupsContent("h3")}
      </Box>
    );
  }

  return (
    <>
      {/* Tab bar */}
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: { xs: 1, md: 0 } }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<GroupsIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={callupsLabel}
            sx={{ minHeight: 48, fontSize: TYPE_SCALE.sm }}
          />
          <Tab
            icon={<LeaderboardIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`${t("tabStats")}${hasStats ? ` (${allStats.length})` : ""}`}
            sx={{ minHeight: 48, fontSize: TYPE_SCALE.sm }}
          />
        </Tabs>
      </Box>

      {tab === 0 && callupsContent()}

      {tab === 1 && (
        <MatchStatsTab
          stats={allStats}
          matchId={matchId}
          isStaff={isStaff}
          teamColor={playersTeamColor}
        />
      )}
    </>
  );
}
