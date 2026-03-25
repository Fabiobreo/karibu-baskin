"use client";
import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import AccessAlarmIcon from "@mui/icons-material/AccessAlarm";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "In corso";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);

  if (days > 0) return `tra ${days}g ${hours}h`;
  if (hours > 0) return `tra ${hours}h ${mins}m`;
  return `tra ${mins} min`;
}

export default function Countdown({ date }: { date: string | Date }) {
  const target = new Date(date).getTime();
  const [remaining, setRemaining] = useState(target - Date.now());

  useEffect(() => {
    setRemaining(target - Date.now());
    const interval = setInterval(() => {
      const r = target - Date.now();
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 60000); // aggiorna ogni minuto
    return () => clearInterval(interval);
  }, [target]);

  // Non mostrare se mancano più di 7 giorni
  if (remaining > 7 * 24 * 60 * 60 * 1000) return null;
  // Non mostrare se è passato da più di un'ora
  if (remaining < -60 * 60 * 1000) return null;

  const isImminent = remaining > 0 && remaining < 2 * 60 * 60 * 1000; // meno di 2h

  return (
    <Typography
      variant="caption"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.4,
        color: isImminent ? "error.main" : "primary.main",
        fontWeight: 600,
        fontSize: "0.72rem",
      }}
    >
      <AccessAlarmIcon sx={{ fontSize: 13 }} />
      {formatCountdown(remaining)}
    </Typography>
  );
}
