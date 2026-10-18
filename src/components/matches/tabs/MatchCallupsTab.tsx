"use client";

import type React from "react";
import { Box, Divider } from "@mui/material";
import TopScorersSection from "@/components/matches/sections/TopScorersSection";
import CallupsListSection, {
  type CallupViewer,
} from "@/components/matches/sections/CallupsListSection";
import HeadToHeadSection from "@/components/matches/sections/HeadToHeadSection";
import StandingsSection from "@/components/matches/sections/StandingsSection";
import type { MatchStatRow } from "@/components/matches/MatchStatsTable";
import type { CallupWithStat, PrevMatchPreview } from "@/components/matches/matchDetailTypes";
import type { StandingEntry } from "@/lib/season/standings";

interface MatchCallupsTabProps {
  callups: CallupWithStat[];
  canSeeCallups: boolean;
  hasScore: boolean;
  stats: MatchStatRow[];
  prevMatches: PrevMatchPreview[];
  groupStandings: StandingEntry[] | null;
  ourTeamColor?: string | null;
  playersTeamColor?: string | null;
  groupName: string | null;
  opponentName: string;
  /**
   * Azioni dello staff (Condividi, Avvisa, Gestisci), già pronte. Assenti
   * quando le mette il titolo sopra (scheda unica) o per chi non è staff.
   */
  actions?: React.ReactNode;
  viewer?: CallupViewer;
  /** Titoli di precedenti e classifica, quando la scheda ha un h2 sopra (scheda unica). */
  headingComponent?: "h3";
}

/** Tab "Convocati": top marcatori, lista per ruolo e sezione contesto (scontri diretti + classifica). */
export default function MatchCallupsTab({
  callups,
  canSeeCallups,
  hasScore,
  stats,
  prevMatches,
  groupStandings,
  ourTeamColor = null,
  playersTeamColor = null,
  groupName,
  opponentName,
  actions,
  viewer,
  headingComponent,
}: MatchCallupsTabProps) {
  // Top 3 marcatori (già ordinati per punti desc dalla query)
  const top3 = stats.slice(0, 3);
  const hasContext =
    prevMatches.length > 0 || (groupStandings !== null && groupStandings.length > 0);

  return (
    <Box sx={{ pt: 3 }}>
      {actions && <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>{actions}</Box>}

      {hasScore && <TopScorersSection top3={top3} teamColor={playersTeamColor} />}

      <CallupsListSection
        callups={callups}
        canSeeCallups={canSeeCallups}
        hasScore={hasScore}
        teamColor={playersTeamColor}
        viewer={viewer}
      />

      {hasContext && (
        <Box sx={{ mt: 5 }}>
          <Divider sx={{ mb: 4 }} />
          <HeadToHeadSection
            prevMatches={prevMatches}
            opponentName={opponentName}
            headingComponent={headingComponent}
          />
          {groupStandings && (
            <StandingsSection
              standings={groupStandings}
              groupName={groupName}
              ourTeamColor={ourTeamColor}
              headingComponent={headingComponent}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
