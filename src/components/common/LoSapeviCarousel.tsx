"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { getLoSapevi } from "@/lib/content/loSapevi";
import { useTranslations, useLocale } from "next-intl";
import { heroGradient } from "@/lib/heroStyles";

const INTERVAL_MS = 7000;

export default function LoSapeviCarousel() {
  const t = useTranslations("home");
  const locale = useLocale();
  const LO_SAPEVI = getLoSapevi(locale);
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
  }, [index, goTo, LO_SAPEVI.length]);

  const goPrev = useCallback(() => {
    goTo((index - 1 + LO_SAPEVI.length) % LO_SAPEVI.length, "prev");
  }, [index, goTo, LO_SAPEVI.length]);

  // Auto-avanzamento: un semplice timeout, si resetta ad ogni cambio di index
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(goNext, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [paused, index, goNext]);

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      delta > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
    setPaused(false);
  };

  const item = LO_SAPEVI[index];

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      sx={{
        background: heroGradient.footer,
        color: "common.white",
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
          top: 0,
          left: 0,
          height: 3,
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
            to: { transform: "translateX(0)", opacity: 1 },
          },
          "@keyframes slideFromLeft": {
            from: { transform: "translateX(-52px)", opacity: 0 },
            to: { transform: "translateX(0)", opacity: 1 },
          },
          animation: `${direction === "next" ? "slideFromRight" : "slideFromLeft"} 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        }}
      >
        <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>
          {/* Icona */}
          <Box
            sx={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mt: 0.25,
            }}
          >
            <LightbulbIcon sx={{ fontSize: 20, color: "common.white" }} />
          </Box>

          {/* Testo */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.onLight",
                fontWeight: 700,
                letterSpacing: "0.12em",
                fontSize: "0.68rem",
                display: "block",
                mb: 0.25,
              }}
            >
              {t("didYouKnow")}
            </Typography>
            <Typography
              variant="subtitle1"
              component="h3"
              fontWeight={800}
              sx={{ mb: 0.75, lineHeight: 1.3 }}
            >
              {item.titolo}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.75 }}>
              {item.testo}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer: dot indicators + frecce */}
      <Box
        sx={{
          px: { xs: 3, md: 4 },
          pb: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Contatore al posto dei puntini: con quattordici curiosita' i
            puntini non comunicavano piu' nessuna posizione. */}
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums" }}
          aria-live="polite"
        >
          {index + 1} / {LO_SAPEVI.length}
        </Typography>

        {/* Frecce: 44x44 e bianco pieno. Erano 30px a 0,4 di opacita', cioe'
            piccole e a basso contrasto su un fondo scuro. */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[
            { onClick: goPrev, label: t("prevFact"), icon: <ArrowBackIosNewIcon /> },
            { onClick: goNext, label: t("nextFact"), icon: <ArrowForwardIosIcon /> },
          ].map((b) => (
            <IconButton
              key={b.label}
              onClick={b.onClick}
              aria-label={b.label}
              sx={{
                width: 44,
                height: 44,
                color: "common.white",
                border: "1px solid",
                borderColor: "rgba(255,255,255,0.3)",
                "& svg": { fontSize: 16 },
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.14)",
                  borderColor: "rgba(255,255,255,0.6)",
                },
              }}
            >
              {b.icon}
            </IconButton>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
