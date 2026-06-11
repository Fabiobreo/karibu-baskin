"use client";

import { Box, Button, Typography } from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import EditIcon from "@mui/icons-material/Edit";
import Link from "next/link";
import { useTranslations } from "next-intl";
import MatchStatsTable from "@/components/matches/MatchStatsTable";
import type { MatchStatRow } from "@/components/matches/MatchStatsTable";

/** Tab "Statistiche": tabella stats con empty state e azione staff. */
export default function MatchStatsTab({
  stats,
  matchId,
  isStaff,
}: {
  stats: MatchStatRow[];
  matchId: string;
  isStaff: boolean;
}) {
  const t = useTranslations("matches");
  const hasStats = stats.length > 0;

  return (
    <Box sx={{ pt: 3 }}>
      {isStaff && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Link href={`/admin/partite/${matchId}/statistiche`} style={{ textDecoration: "none" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              sx={{ fontWeight: 700 }}
            >
              {hasStats ? t("editStats") : t("addStats")}
            </Button>
          </Link>
        </Box>
      )}
      {!hasStats ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <LeaderboardIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={700}>
            {t("noStats")}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            {t("statsUnavailable")}
          </Typography>
        </Box>
      ) : (
        <MatchStatsTable stats={stats} />
      )}
    </Box>
  );
}
