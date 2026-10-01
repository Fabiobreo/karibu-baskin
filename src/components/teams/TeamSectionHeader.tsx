import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { teamFill } from "@/lib/teamColors";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface TeamSectionHeaderProps {
  name: string;
  /** Colore salvato della squadra (chiave o hex storico). */
  color: string | null | undefined;
  championship?: string | null;
  /** Dato breve a destra (es. "3 partite"): eredita il colore dell'etichetta. */
  aside?: ReactNode;
}

/**
 * Intestazione di una sezione di squadra nelle liste (`/partite`,
 * `/risultati`): una fascia piena nella tinta della squadra con il nome sopra,
 * come la testata delle card di `/squadre`. La tinta e' un riempimento con
 * l'etichetta della palette (bianca o scura, >= 4,5:1), mai testo colorato
 * (UX-29). Senza tinta la fascia e' neutra, mai arancio.
 *
 * Niente "use client" e niente `sx` a funzione: si usa nei Server Component.
 */
export default function TeamSectionHeader({
  name,
  color,
  championship,
  aside,
}: TeamSectionHeaderProps) {
  const fill = teamFill(color);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        columnGap: 1.5,
        rowGap: 0.25,
        flexWrap: "wrap",
        px: 2,
        py: 1.25,
        borderRadius: RADIUS.md,
        bgcolor: fill?.bg ?? "action.hover",
        color: fill?.fg ?? "text.primary",
        // L'Oro sulle superfici chiare vuole un filo per staccarsi dal fondo.
        boxShadow: fill?.ring ? `inset 0 0 0 1px ${fill.ring}` : undefined,
      }}
    >
      <Typography component="h2" variant="h6" sx={{ color: "inherit" }}>
        {name}
      </Typography>
      {championship && (
        <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold} sx={{ color: "inherit" }}>
          {championship}
        </Typography>
      )}
      {aside && (
        <Typography
          variant="caption"
          fontWeight={FONT_WEIGHT.semibold}
          sx={{ color: "inherit", ml: "auto" }}
        >
          {aside}
        </Typography>
      )}
    </Box>
  );
}
