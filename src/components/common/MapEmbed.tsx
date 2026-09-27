"use client";
import { Box, Button, Link as MuiLink, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MapIcon from "@mui/icons-material/Map";
import PlaceIcon from "@mui/icons-material/Place";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTranslations } from "next-intl";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useHasMounted } from "@/lib/useHasMounted";
import { CLUB_VENUE, CLUB_VENUE_LABEL, mapsSearchUrl } from "@/lib/clubVenue";

interface MapEmbedProps {
  /** Luogo da mostrare, scritto come in un campo "Luogo". Predefinito: la sede. */
  place?: string;
  /** Nome breve mostrato sul segnaposto prima del caricamento. */
  placeName?: string;
  height?: number | string | { xs?: number; sm?: number; md?: number };
  /** false quando chi usa la mappa mostra gia' il proprio link a Google Maps. */
  externalLink?: boolean;
}

/**
 * Mappa Google incorporata. Google installa cookie di profilazione, quindi
 * l'iframe si carica solo con il consenso (lo stesso del banner cookie):
 * prima c'e' un segnaposto che somiglia a una mappa, con il nome del luogo,
 * un solo bottone per mostrarla e il link esterno per chi non vuole cookie.
 * Accettare da qui vale come "Accetta tutto" nel banner, e viceversa.
 */
export default function MapEmbed({
  place = CLUB_VENUE_LABEL,
  placeName = CLUB_VENUE.name,
  height = { xs: 200, md: 240 },
  externalLink = true,
}: MapEmbedProps) {
  const t = useTranslations("map");
  const mounted = useHasMounted();
  const { consent, accept } = useCookieConsent();
  const externalUrl = mapsSearchUrl(place);

  const frameSx = {
    position: "relative",
    height,
    borderRadius: 2,
    overflow: "hidden",
    border: "1px solid",
    borderColor: "divider",
  } as const;

  // Durante l'idratazione mostriamo il segnaposto per evitare mismatch.
  if (mounted && consent.maps) {
    return (
      <Box sx={frameSx}>
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0, display: "block" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={t("frameTitle", { place: placeName })}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...frameSx,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.25,
        px: 2,
        textAlign: "center",
        bgcolor: "action.hover",
        // Un reticolo leggero di "strade": fa capire subito che qui va una
        // mappa, senza scaricare nulla da Google.
        backgroundImage: (theme) => {
          const line = alpha(theme.palette.text.primary, 0.06);
          const road = alpha(theme.palette.text.primary, 0.09);
          return [
            `linear-gradient(115deg, transparent 46%, ${road} 46%, ${road} 50%, transparent 50%)`,
            `linear-gradient(20deg, transparent 62%, ${road} 62%, ${road} 65%, transparent 65%)`,
            `linear-gradient(${line} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          ].join(", ");
        },
        backgroundSize: "100% 100%, 100% 100%, 28px 28px, 28px 28px",
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          boxShadow: (theme) => `0 0 0 8px ${alpha(theme.palette.primary.main, 0.18)}`,
        }}
      >
        <PlaceIcon />
      </Box>
      <Typography variant="subtitle2" component="p" fontWeight={700} sx={{ mt: 0.5 }}>
        {placeName}
      </Typography>
      <Button
        variant="contained"
        size="small"
        startIcon={<MapIcon />}
        onClick={accept}
        sx={{ fontWeight: 700 }}
      >
        {t("show")}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300 }}>
        {t("cookieNote")}
        {externalLink && (
          <>
            <br />
            <MuiLink
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              fontWeight={600}
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
            >
              {t("openExternal")}
              <OpenInNewIcon fontSize="inherit" aria-hidden="true" />
            </MuiLink>
          </>
        )}
      </Typography>
    </Box>
  );
}
