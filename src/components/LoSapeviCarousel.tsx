"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { LO_SAPEVI } from "@/lib/loSapevi";

const INTERVAL_MS = 7000;

export default function LoSapeviCarousel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animKey, setAnimKey] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((newIndex: number, dir: "next" | "prev") => {
    setDirection(dir);
    setAnimKey((k) => k + 1);
    setIndex(newIndex);
  }, []);

  const goNext = useCallback(() => {
    goTo((index + 1) % LO_SAPEVI.length, "next");
  }, [index, goTo]);

  const goPrev = useCallback(() => {
    goTo((index - 1 + LO_SAPEVI.length) % LO_SAPEVI.length, "prev");
  }, [index, goTo]);

  // Auto-avanzamento: un semplice timeout, si resetta ad ogni cambio di index
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(goNext, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [paused, index, goNext]);

  const item = LO_SAPEVI[index];

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{
        background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
        color: "#fff",
        borderRadius: 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Barra progresso — CSS pura, si resetta col key */}
      <Box
        key={`pb-${animKey}`}
        sx={{
          position: "absolute",
          top: 0, left: 0, height: 3,
          bgcolor: "primary.main",
          "@keyframes fillBar": {
            from: { width: "0%" },
            to: { width: "100%" },
          },
          animation: `fillBar ${INTERVAL_MS}ms linear forwards`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />

      {/* Contenuto — slide animata al cambio di index */}
      <Box
        key={`content-${animKey}`}
        sx={{
          p: { xs: 3, md: 4 },
          pb: { xs: 2, md: 2.5 },
          "@keyframes slideFromRight": {
            from: { transform: "translateX(52px)", opacity: 0 },
            to:   { transform: "translateX(0)",    opacity: 1 },
          },
          "@keyframes slideFromLeft": {
            from: { transform: "translateX(-52px)", opacity: 0 },
            to:   { transform: "translateX(0)",     opacity: 1 },
          },
          animation: `${direction === "next" ? "slideFromRight" : "slideFromLeft"} 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        }}
      >
        <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>
          {/* Icona */}
          <Box sx={{
            flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
            bgcolor: "primary.main",
            display: "flex", alignItems: "center", justifyContent: "center",
            mt: 0.25,
          }}>
            <LightbulbIcon sx={{ fontSize: 20, color: "#fff" }} />
          </Box>

          {/* Testo */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{
              color: "primary.main", fontWeight: 700,
              letterSpacing: "0.12em", fontSize: "0.68rem",
              display: "block", mb: 0.25,
            }}>
              Lo sapevi?
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.75, lineHeight: 1.3 }}>
              {item.titolo}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.75 }}>
              {item.testo}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer: dot indicators + frecce */}
      <Box sx={{
        px: { xs: 3, md: 4 }, pb: 2.5,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Dot pill indicators — quello attivo si allunga */}
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          {LO_SAPEVI.map((_, i) => (
            <Box
              key={i}
              onClick={() => goTo(i, i > index ? "next" : "prev")}
              sx={{
                height: 6,
                width: i === index ? 20 : 6,
                borderRadius: 3,
                bgcolor: i === index ? "primary.main" : "rgba(255,255,255,0.2)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor: i === index ? "primary.main" : "rgba(255,255,255,0.45)",
                },
              }}
            />
          ))}
        </Box>

        {/* Frecce */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={goPrev} sx={{
            color: "rgba(255,255,255,0.4)",
            "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
          }}>
            <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" onClick={goNext} sx={{
            color: "rgba(255,255,255,0.4)",
            "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
          }}>
            <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
