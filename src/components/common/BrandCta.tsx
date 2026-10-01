import { Box, Button, Typography } from "@mui/material";
import type { ElementType, ReactNode } from "react";
import { brandColor, heroText } from "@/lib/heroStyles";
import { RADIUS } from "@/lib/radius";
import { TYPE_SCALE } from "@/lib/typeScale";

interface BrandCtaProps {
  title: string;
  body?: string;
  /** Icona decorativa sopra il titolo (solo nel blocco centrato). */
  icon?: ReactNode;
  action: { href: string; label: string; startIcon?: ReactNode };
  /** `row`: testo a sinistra e bottone a destra. `center`: tutto al centro. */
  layout?: "row" | "center";
  titleComponent?: ElementType;
}

/**
 * Blocco d'invito in arancio pieno (decisione del committente, 01/10): l'arancio
 * come superficie di marchio, ammesso solo qui e solo perche' il blocco esiste
 * per un'azione. Al massimo uno per pagina, in fondo al contenuto.
 *
 * Il fondo e' il riempimento dei bottoni (`primary.fill`, bianco sopra a
 * 4,71:1), quindi tutto il testo e' bianco pieno e il bottone e' invertito:
 * bianco con l'etichetta nera, mai arancio su arancio. Uguale nei due temi.
 *
 * Niente "use client" e niente `sx` a funzione: si usa nei Server Component.
 */
export default function BrandCta({
  title,
  body,
  icon,
  action,
  layout = "row",
  titleComponent = "h2",
}: BrandCtaProps) {
  const center = layout === "center";
  return (
    <Box
      sx={{
        bgcolor: "primary.fill",
        color: "common.white",
        borderRadius: RADIUS.lg,
        p: { xs: 3, md: center ? 5 : 4 },
        display: "flex",
        gap: 2,
        ...(center
          ? { flexDirection: "column", alignItems: "center", textAlign: "center" }
          : { alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }),
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {center && icon && (
          <Box aria-hidden sx={{ mb: 1, "& svg": { fontSize: TYPE_SCALE.xl5 } }}>
            {icon}
          </Box>
        )}
        <Typography component={titleComponent} variant={center ? "h5" : "h6"} sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        {body && (
          <Typography variant="body1" sx={{ maxWidth: center ? 420 : undefined }}>
            {body}
          </Typography>
        )}
      </Box>
      <Button
        href={action.href}
        variant="contained"
        size="large"
        startIcon={action.startIcon}
        sx={{
          flexShrink: 0,
          whiteSpace: "nowrap",
          bgcolor: "common.white",
          color: brandColor.dark,
          "&:hover": { bgcolor: heroText.secondary },
        }}
      >
        {action.label}
      </Button>
    </Box>
  );
}
