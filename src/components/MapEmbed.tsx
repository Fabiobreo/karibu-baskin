"use client";
import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useHasMounted } from "@/lib/useHasMounted";

const MAP_SRC =
  "https://maps.google.com/maps?q=Polisportivo+Gino+Cosaro,+Via+del+Vigo+11,+Montecchio+Maggiore+VI&output=embed";
const MAP_LINK =
  "https://maps.google.com/maps?q=Polisportivo+Gino+Cosaro,+Via+del+Vigo+11,+Montecchio+Maggiore+VI";

interface MapEmbedProps {
  height?: number;
}

export default function MapEmbed({ height = 220 }: MapEmbedProps) {
  const mounted = useHasMounted();
  const { consent, accept } = useCookieConsent();
  // Permette di caricare la mappa per questa sessione senza salvare il consenso globale
  const [sessionAccepted, setSessionAccepted] = useState(false);

  const showMap = consent.maps || sessionAccepted;

  const containerSx = {
    borderRadius: 2,
    overflow: "hidden",
    border: "1px solid",
    borderColor: "divider",
    height,
  };

  // Durante l'idratazione mostriamo il placeholder per evitare mismatch
  if (!mounted || !showMap) {
    return (
      <Box
        sx={{
          ...containerSx,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          bgcolor: "action.hover",
          px: 2,
          textAlign: "center",
        }}
      >
        <MapIcon sx={{ fontSize: 40, color: "text.disabled" }} />
        <Typography variant="body2" color="text.secondary">
          La mappa usa cookie Google. Accetta per visualizzarla.
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              accept();
            }}
            sx={{ fontWeight: 700 }}
          >
            Accetta e carica mappa
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSessionAccepted(true)}
            sx={{ fontWeight: 600 }}
          >
            Carica solo ora
          </Button>
          <Button
            size="small"
            href={MAP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon sx={{ fontSize: "0.9rem !important" }} />}
            sx={{ fontWeight: 600 }}
          >
            Apri in Google Maps
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={containerSx}>
      <iframe
        src={MAP_SRC}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Polisportivo Gino Cosaro - Montecchio Maggiore"
      />
    </Box>
  );
}
