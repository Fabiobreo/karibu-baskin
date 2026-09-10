"use client";
import { Typography } from "@mui/material";
import type { TypographyProps } from "@mui/material";
import { readableOn } from "@/lib/colorUtils";

interface AccentTextProps extends Omit<TypographyProps, "color"> {
  /** Colore dinamico, tipicamente il colore squadra dal DB. */
  accent: string;
}

/**
 * Testo colorato con un colore che arriva dal database.
 *
 * Il colore squadra e' scelto dall'admin e non e' detto che sia leggibile: il
 * verde dei Montekki su `background.default` chiaro fa 3,02:1. Qui viene
 * adattato alla superficie del tema corrente prima di essere usato come testo.
 *
 * E' un Client Component perche' l'aggiustamento dipende dal tema, e un Server
 * Component non puo' passare una callback dentro `sx`.
 */
export default function AccentText({ accent, sx, ...rest }: AccentTextProps) {
  return (
    <Typography
      {...rest}
      sx={[
        (theme) => ({ color: readableOn(accent, theme.palette.background.default) }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
