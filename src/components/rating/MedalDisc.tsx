"use client";
import { Box } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { contrastText } from "@/lib/colorUtils";

export type MedalRank = 1 | 2 | 3;

const RANK_KEY = { 1: "gold", 2: "silver", 3: "bronze" } as const;

interface MedalDiscProps {
  rank: MedalRank;
  /** Diametro in px. */
  size?: number;
  /** Spessore del bordo che stacca la pastiglia dalla superficie sotto. */
  borderWidth?: number;
  /** Colore del bordo: di default la superficie della card. */
  borderColor?: string;
  /** Icona: trofeo per il primo posto, medaglia per gli altri. */
  iconSize?: number;
}

/**
 * Pastiglia oro/argento/bronzo del podio.
 *
 * Vive qui, come Client Component, per un motivo preciso: i valori delle
 * medaglie cambiano fra tema chiaro e scuro (in chiaro sono scuriti, perche'
 * l'oro #FFC107 su bianco faceva 1,63:1) e leggerli dal tema richiede una
 * callback in `sx`, che un Server Component non puo' passare.
 */
export default function MedalDisc({
  rank,
  size = 34,
  borderWidth = 2,
  borderColor = "background.paper",
  iconSize = 18,
}: MedalDiscProps) {
  const key = RANK_KEY[rank];
  const Icon = rank === 1 ? EmojiEventsIcon : WorkspacePremiumIcon;
  return (
    <Box
      sx={(theme) => ({
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%, ${theme.palette.medal[key]} 0%, ${
          theme.palette.medal[`${key}Deep` as const]
        } 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `${borderWidth}px solid`,
        borderColor,
        boxShadow: `0 3px 10px ${theme.palette.common.black}40`,
      })}
    >
      <Icon
        sx={(theme) => ({ fontSize: iconSize, color: contrastText(theme.palette.medal[key]) })}
      />
    </Box>
  );
}
