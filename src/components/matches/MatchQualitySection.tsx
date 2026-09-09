"use client";

import { Box, Typography } from "@mui/material";
import MatchQualityBadge from "@/components/matches/MatchQualityBadge";
import type { MatchQuality } from "@/lib/matches/matchQuality";

interface MatchQualitySectionProps {
  quality: MatchQuality;
  opponentName: string;
  callupsWithRatingCount: number;
}

export default function MatchQualitySection({
  quality,
  opponentName,
  callupsWithRatingCount,
}: MatchQualitySectionProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        mb: 2,
        px: 2,
        py: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        flexWrap: "wrap",
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        Difficoltà stimata vs {opponentName}:
      </Typography>
      <MatchQualityBadge
        quality={quality}
        hint={
          callupsWithRatingCount > 0
            ? `basato su ${callupsWithRatingCount} convocati con rating`
            : "nessun convocato con rating: usa il rating medio della squadra"
        }
      />
    </Box>
  );
}
