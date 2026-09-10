"use client";

import { useState, useEffect } from "react";
import { Box, Container, Typography } from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { getLoSapevi } from "@/lib/content/loSapevi";
import { useTranslations, useLocale } from "next-intl";

/**
 * Mostra un fatto casuale al mount — cambia ad ogni refresh di pagina.
 * Da inserire nella homepage tra due sezioni.
 */
export default function LoSapeviCard() {
  const t = useTranslations("home");
  const locale = useLocale();
  const [item, setItem] = useState<{ titolo: string; testo: string } | null>(null);

  useEffect(() => {
    const facts = getLoSapevi(locale);
    const idx = Math.floor(Math.random() * facts.length);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItem(facts[idx]);
  }, [locale]);

  // Non renderizza nulla durante l'SSR / prima del mount
  if (!item) return null;

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
        color: "#fff",
        py: { xs: 4, md: 5 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            gap: { xs: 2, md: 3 },
            alignItems: { xs: "flex-start", md: "center" },
          }}
        >
          {/* Icona */}
          <Box
            sx={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LightbulbIcon sx={{ fontSize: 22, color: "#fff" }} />
          </Box>

          {/* Testo */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "primary.onLight",
                fontWeight: 700,
                letterSpacing: "0.12em",
                display: "block",
                mb: 0.25,
                fontSize: "0.7rem",
              }}
            >
              {t("didYouKnow")}
            </Typography>
            <Typography
              variant="subtitle1"
              component="h3"
              fontWeight={800}
              sx={{ mb: 0.5, lineHeight: 1.3 }}
            >
              {item.titolo}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: 680 }}
            >
              {item.testo}
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
