"use client";
import { useState, useEffect } from "react";
import { Collapse, Box, Typography } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import WifiIcon from "@mui/icons-material/Wifi";
import { useTranslations } from "next-intl";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export default function OfflineBanner() {
  const t = useTranslations("offline");
  const [offline, setOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);

    function handleOffline() {
      setOffline(true);
      setJustReconnected(false);
    }

    function handleOnline() {
      setOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const visible = offline || justReconnected;

  return (
    <Collapse in={visible}>
      <Box
        sx={(theme) => {
          // Valenza (UX-29): offline e' negativo, di nuovo online positivo, con
          // l'icona Wi-Fi come secondo segnale. In chiaro il tono scuro regge il
          // bianco; in scuro il tono pieno con la sua etichetta scura.
          const tone = offline ? theme.palette.error : theme.palette.success;
          const light = theme.palette.mode === "light";
          return {
            bgcolor: light ? tone.dark : tone.main,
            color: light ? theme.palette.common.white : tone.contrastText,
            py: 0.75,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            transition: "background-color 0.3s",
          };
        }}
      >
        {offline ? <WifiOffIcon sx={{ fontSize: 16 }} /> : <WifiIcon sx={{ fontSize: 16 }} />}
        <Typography variant="caption" fontWeight={FONT_WEIGHT.semibold}>
          {offline ? t("banner") : t("reconnected")}
        </Typography>
      </Box>
    </Collapse>
  );
}
