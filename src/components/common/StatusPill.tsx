import type { ReactNode } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { heroText, brandColor } from "@/lib/heroStyles";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TYPE_SCALE } from "@/lib/typeScale";

interface StatusPillProps {
  label: ReactNode;
  /**
   * - `inverted`: nero del marchio pieno, per lo stato che conta adesso (In
   *   corso, Oggi, Casa);
   * - `outlined`: contorno neutro, per uno stato da notare (Trasferta, Apre
   *   presto);
   * - `muted`: fondo tenue, per uno stato concluso o fermo (Chiuso, Finito).
   */
  variant?: "inverted" | "outlined" | "muted";
  /** Icona a sinistra dell'etichetta (secondo segnale oltre al colore). */
  icon?: ReactNode;
  /** Pallino pulsante prima dell'etichetta: "sta succedendo adesso". */
  pulse?: boolean;
  /** Sopra un hero, che resta scuro in entrambi i temi. */
  onDark?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Pillola di stato (UX-29). Gli stati temporali non hanno una tinta: il verde
 * vuol dire "positivo", non "in corso". Li distinguono il nero del marchio,
 * la forma e un'icona o un pallino.
 *
 * Niente "use client" e niente `sx` a funzione: si usa anche nei Server Component.
 */
export default function StatusPill({
  label,
  variant = "inverted",
  icon,
  pulse = false,
  onDark = false,
  sx,
}: StatusPillProps) {
  const colors = onDark
    ? {
        inverted: { bgcolor: heroText.primary, color: brandColor.dark, borderColor: "transparent" },
        outlined: {
          bgcolor: "transparent",
          color: heroText.primary,
          borderColor: heroText.lineStrong,
        },
        muted: { bgcolor: heroText.surface, color: heroText.secondary, borderColor: "transparent" },
      }[variant]
    : {
        inverted: {
          bgcolor: "secondary.main",
          color: "secondary.contrastText",
          borderColor: "transparent",
        },
        outlined: { bgcolor: "transparent", color: "text.primary", borderColor: "text.secondary" },
        muted: { bgcolor: "action.selected", color: "text.primary", borderColor: "transparent" },
      }[variant];

  return (
    <Box
      component="span"
      sx={[
        {
          ...colors,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1,
          minHeight: 24,
          border: "1px solid",
          borderRadius: RADIUS.pill,
          typography: "caption",
          fontWeight: FONT_WEIGHT.semibold,
          lineHeight: 1,
          whiteSpace: "nowrap",
          verticalAlign: "middle",
          "& .MuiSvgIcon-root": { fontSize: TYPE_SCALE.md },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {pulse && (
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "currentColor",
            flexShrink: 0,
            "@keyframes status-pill-pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.35 },
            },
            animation: "status-pill-pulse 1.6s ease-in-out infinite",
          }}
        />
      )}
      {icon}
      {label}
    </Box>
  );
}
