"use client";

import { Box, Button, Divider } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import Link from "next/link";
import { useTranslations } from "next-intl";
import TopScorersSection from "@/components/matches/sections/TopScorersSection";
import CallupsListSection from "@/components/matches/sections/CallupsListSection";
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
  groupName: string | null;
  opponentName: string;
  matchId: string;
  isStaff: boolean;
}

/** Tab "Convocati": top marcatori, lista per ruolo e sezione contesto (scontri diretti + classifica). */
export default function MatchCallupsTab({
  callups,
  canSeeCallups,
  hasScore,
  stats,
  prevMatches,
  groupStandings,
  groupName,
  opponentName,
  matchId,
  isStaff,
}: MatchCallupsTabProps) {
  const t = useTranslations("matches");
  // Top 3 marcatori (già ordinati per punti desc dalla query)
  const top3 = stats.slice(0, 3);
  const hasContext =
    prevMatches.length > 0 || (groupStandings !== null && groupStandings.length > 0);

  return (
    <Box sx={{ pt: 3 }}>
      {isStaff && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Link href={`/admin/partite/${matchId}/convocazioni`} style={{ textDecoration: "none" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              sx={{ fontWeight: 700 }}
            >
              {t("manageCallups")}
            </Button>
          </Link>
        </Box>
      )}

      {hasScore && <TopScorersSection top3={top3} />}

      <CallupsListSection callups={callups} canSeeCallups={canSeeCallups} hasScore={hasScore} />

      {hasContext && (
        <Box sx={{ mt: 5 }}>
          <Divider sx={{ mb: 4 }} />
          <HeadToHeadSection prevMatches={prevMatches} opponentName={opponentName} />
          {groupStandings && <StandingsSection standings={groupStandings} groupName={groupName} />}
        </Box>
      )}
    </Box>
  );
}
