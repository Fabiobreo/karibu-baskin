"use client";

import { Box, Tooltip, Typography, LinearProgress } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveIcon from "@mui/icons-material/Remove";
import type { MatchQuality, QualityLabel } from "@/lib/matchQuality";

const LABEL_COLOR: Record<QualityLabel, string> = {
  Favoriti: "success.main",
  Equilibrata: "warning.main",
  Sfavoriti: "error.main",
};

const LABEL_ICON: Record<QualityLabel, typeof TrendingUpIcon> = {
  Favoriti: TrendingUpIcon,
  Equilibrata: RemoveIcon,
  Sfavoriti: TrendingDownIcon,
};

const BAR_COLOR: Record<QualityLabel, "success" | "warning" | "error"> = {
  Favoriti: "success",
  Equilibrata: "warning",
  Sfavoriti: "error",
};

interface MatchQualityBadgeProps {
  quality: MatchQuality;
  /** Mostra anche la barra progresso (default: true). */
  showBar?: boolean;
  /** Testo del tooltip aggiuntivo (es. "basato su N convocati"). */
  hint?: string;
}

export default function MatchQualityBadge({
  quality,
  showBar = true,
  hint,
}: MatchQualityBadgeProps) {
  const Icon = LABEL_ICON[quality.label];
  const pct = Math.round(quality.winProbability * 100);

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption" fontWeight={700} display="block">
            Probabilità di vittoria stimata: {pct}%
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary" display="block">
              {hint}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            Basato su rating TrueSkill (COACH/ADMIN)
          </Typography>
        </Box>
      }
    >
      <Box sx={{ display: "inline-flex", flexDirection: "column", gap: 0.5, minWidth: 120 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Icon sx={{ fontSize: 16, color: LABEL_COLOR[quality.label] }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: LABEL_COLOR[quality.label] }}>
            {quality.label} ({pct}%)
          </Typography>
        </Box>
        {showBar && (
          <LinearProgress
            variant="determinate"
            value={pct}
            color={BAR_COLOR[quality.label]}
            sx={{ height: 4, borderRadius: 2, width: "100%" }}
          />
        )}
      </Box>
    </Tooltip>
  );
}
