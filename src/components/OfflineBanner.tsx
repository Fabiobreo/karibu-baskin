"use client";
import { useState, useEffect } from "react";
import { Collapse, Box, Typography } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import WifiIcon from "@mui/icons-material/Wifi";

export default function OfflineBanner() {
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
        sx={{
          bgcolor: offline ? "#B71C1C" : "#1B5E20",
          color: "#fff",
          py: 0.75,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          transition: "background-color 0.3s",
        }}
      >
        {offline
          ? <WifiOffIcon sx={{ fontSize: 16 }} />
          : <WifiIcon sx={{ fontSize: 16 }} />}
        <Typography variant="caption" fontWeight={600}>
          {offline
            ? "Sei offline — stai visualizzando dati in cache"
            : "Connessione ripristinata"}
        </Typography>
      </Box>
    </Collapse>
  );
}
