"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

interface Props {
  /** ISO date (timestamp), inviata dal server per evitare mismatch */
  targetIso: string;
}

function computeParts(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { days, hours, minutes };
}

export default function MatchCountdown({ targetIso }: Props) {
  const target = new Date(targetIso);
  const [parts, setParts] = useState(() => computeParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(computeParts(target)), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso]);

  if (!parts) {
    return (
      <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem" }}>In corso</Typography>
    );
  }

  const segments: string[] = [];
  if (parts.days > 0) segments.push(`${parts.days} ${parts.days === 1 ? "giorno" : "giorni"}`);
  if (parts.hours > 0 || parts.days > 0)
    segments.push(`${parts.hours} ${parts.hours === 1 ? "ora" : "ore"}`);
  if (parts.days === 0) segments.push(`${parts.minutes} min`);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 999,
        bgcolor: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <AccessTimeIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }} />
      <Typography
        sx={{
          color: "#fff",
          fontWeight: 700,
          fontSize: { xs: "0.78rem", md: "0.85rem" },
          letterSpacing: "0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        Tra {segments.join(" · ")}
      </Typography>
    </Box>
  );
}
