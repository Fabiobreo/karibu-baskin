"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Tabs, Tab } from "@mui/material";
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
  groupName,
  opponentName,
  matchId,
  isStaff,
}: Props) {
  const t = useTranslations("matches");
  const hasStats = stats.length > 0;
  // Chi non vede i convocati non deve atterrare su un lucchetto: se ci sono
  // statistiche, la pagina parte da quelle (UX-06).
  const [tab, setTab] = useState(!canSeeCallups && hasStats ? 1 : 0);

  // Merge callups + stats per partite già giocate
  const callupsWithStats: CallupWithStat[] = callups.map((c) => ({
    ...c,
    stat:
      stats.find(
        (s) => (c.userId && s.user?.id === c.userId) || (c.childId && s.child?.id === c.childId)
      ) ?? null,
  }));

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
            label={`${t("tabCallups")}${canSeeCallups && callups.length > 0 ? ` (${callups.length})` : ""}`}
            sx={{ minHeight: 48, fontSize: TYPE_SCALE.sm, fontWeight: 600 }}
          />
          <Tab
            icon={<LeaderboardIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`${t("tabStats")}${hasStats ? ` (${stats.length})` : ""}`}
            sx={{ minHeight: 48, fontSize: TYPE_SCALE.sm, fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {tab === 0 && (
        <MatchCallupsTab
          callups={callupsWithStats}
          canSeeCallups={canSeeCallups}
          hasScore={hasScore}
          stats={stats}
          prevMatches={prevMatches}
          groupStandings={groupStandings}
          groupName={groupName}
          opponentName={opponentName}
          matchId={matchId}
          isStaff={isStaff}
        />
      )}

      {tab === 1 && <MatchStatsTab stats={stats} matchId={matchId} isStaff={isStaff} />}
    </>
  );
}
