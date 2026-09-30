import { Chip, type ChipProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { teamFill } from "@/lib/teamColors";
import { TYPE_SCALE } from "@/lib/typeScale";

interface TeamChipProps extends Omit<ChipProps, "color" | "label" | "sx" | "variant"> {
  name: string;
  /** Colore salvato della squadra (chiave o hex storico). */
  color: string | null | undefined;
  /** Alto 20 px, per le righe dense delle tabelle pubbliche. */
  compact?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Chip con il nome di una squadra (UX-29): riempito nella tinta della squadra
 * con l'etichetta della tinta (bianca o scura, >= 4,5:1); senza tinta,
 * contornato neutro. Mai l'arancio come ripiego. Accetta le props di
 * `Chip` (es. `onDelete`, `size`).
 *
 * Niente "use client" e niente `sx` a funzione: si usa anche nei Server Component.
 */
export default function TeamChip({
  name,
  color: raw,
  compact = false,
  sx,
  ...chipProps
}: TeamChipProps) {
  const fill = teamFill(raw);
  return (
    <Chip
      size="small"
      {...chipProps}
      label={name}
      variant={fill ? "filled" : "outlined"}
      sx={[
        fill
          ? {
              bgcolor: fill.bg,
              color: fill.fg,
              // L'Oro sulle superfici chiare vuole un filo per staccarsi dal fondo.
              ...(fill.ring ? { boxShadow: `inset 0 0 0 1px ${fill.ring}` } : {}),
              "& .MuiChip-deleteIcon": { color: fill.fg, opacity: 0.8 },
              "& .MuiChip-deleteIcon:hover": { color: fill.fg, opacity: 1 },
            }
          : {},
        compact ? { fontSize: TYPE_SCALE.xs, height: 20 } : {},
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
