"use client";

import { Box, Typography } from "@mui/material";
import MatchQualityBadge from "@/components/matches/MatchQualityBadge";
import type { MatchQuality } from "@/lib/matches/matchQuality";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
        borderRadius: RADIUS.md,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        flexWrap: "wrap",
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={FONT_WEIGHT.semibold}>
        Difficoltà stimata vs {opponentName}:
      </Typography>
      <MatchQualityBadge
        quality={quality}
        hint={
          callupsWithRatingCount > 0
            ? `calcolata su ${callupsWithRatingCount} convocati che hanno già un livello stimato`
            : "nessun convocato ha ancora un livello stimato: vale il livello medio della squadra"
        }
      />
    </Box>
  );
}
