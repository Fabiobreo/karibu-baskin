"use client";

import { useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { onHover } from "@/lib/hoverStyles";
import { TOUCH_TARGET } from "@/lib/touchTarget";

// ── Dati sponsor ──────────────────────────────────────────────────────────────
// src: percorso immagine in /public (es. "/sponsors/denis.png")
// Lasciare src: null finché l'immagine non è disponibile → mostra placeholder
//
// needsPlateOnDark: il logo è nato per la carta bianca e sul fondo scuro
// sparisce. Misurato sui file reali (quota di pixel che arrivano a 3:1 contro
// #1E1E1E): denis 5%, LLP 34%, tettitecchio 37%, sabysport 84%, cgrd 86%,
// villani 94%. Solo il primo ha bisogno della placca: villani, sabysport e
// cgrd sono loghi chiari, e sul bianco sparirebbero a loro volta.

const SPONSORS = [
  {
    name: "Denis M. Photographer",
    url: "https://www.facebook.com/Denis.M.photographer",
    color: "#1A1A1A",
    initials: "DM",
    src: "/sponsors/denis.jpg",
    needsPlateOnDark: true,
  },
  {
    name: "Villani and Partners",
    url: "https://villaniandpartners.eu/",
    color: "#1E88E5",
    initials: "VP",
    src: "/sponsors/villani.png",
  },
  {
    name: "LLP",
    url: "https://www.llp.it/",
    color: "#43A047",
    initials: "LLP",
    src: "/sponsors/LLP.png",
  },
  {
    name: "Tetti Tecchio",
    url: "https://www.tettitecchio.it/",
    color: "#FF6D00",
    initials: "TT",
    src: "/sponsors/tettitecchio.png",
  },
  {
    name: "Saby Sport",
    url: "https://www.sabysport.com/",
    color: "#F44336",
    initials: "SS",
    src: "/sponsors/sabysport.png",
  },
  {
    name: "CGRD",
    url: "https://www.cgrd.it/it/",
    color: "#8E24AA",
    initials: "CG",
    src: "/sponsors/cgrd.png",
  },
] satisfies {
  name: string;
  url: string;
  color: string;
  initials: string;
  src: string | null;
  needsPlateOnDark?: boolean;
}[];

type Sponsor = (typeof SPONSORS)[number] & { needsPlateOnDark?: boolean };

// Due copie e non sei: l'animazione trasla di -50%, quindi con due metà
// identiche il punto di arrivo coincide con quello di partenza e il ciclo non
// salta. Sei copie erano 36 nodi immagine in fondo a ogni pagina del sito.
const COPIES = [0, 1];

// Secondi per far scorrere un set completo. Con -50% su due copie il viaggio è
// esattamente un set, quindi è anche la durata dell'animazione: la velocità per
// sponsor resta quella di prima.
const SECONDS_PER_SET = SPONSORS.length * 4;

const CLONE_SELECTOR = '& [data-sponsor-clone="true"]';

/**
 * Nastro fermo: niente animazione e niente copie.
 *
 * Con la pausa (o con "riduci movimento") la striscia deve restare leggibile,
 * non congelarsi a metà logo: le copie spariscono e resta la lista dei sei
 * sponsor, scorribile a mano nel contenitore.
 */
const STATIC_TRACK = {
  animation: "none",
  transform: "none",
  [CLONE_SELECTOR]: { display: "none" },
} as const;

export default function SponsorBanner() {
  const t = useTranslations("common");
  const [paused, setPaused] = useState(false);

  return (
    <Box
      component="section"
      aria-label={t("sponsorsLabel")}
      sx={{
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        pt: 1.5,
        pb: { xs: "calc(16px + 60px + env(safe-area-inset-bottom, 0px))", md: 2 },
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      {/* Etichetta e comando fuori dal nastro: stavano in `position: absolute`
          sopra la pista, e a schermo largo la parola "Sponsor" finiva addosso
          al logo in uscita. Qui lo spazio glielo riserva il layout. */}
      <Box
        sx={{
          flexShrink: 0,
          pl: { xs: 0.5, sm: 1.5 },
          display: "flex",
          alignItems: "center",
          gap: 0.25,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "text.disabled",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: "0.6rem",
            display: { xs: "none", sm: "block" },
          }}
        >
          {t("sponsorsLabel")}
        </Typography>
        {/* WCAG 2.2.2: un contenuto in movimento che parte da solo e dura più di
            cinque secondi deve poter essere fermato. La pausa in `:hover` non
            basta, perché da tastiera e su touch non è raggiungibile. */}
        <IconButton
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t("sponsorsResume") : t("sponsorsPause")}
          aria-pressed={paused}
          sx={{ ...TOUCH_TARGET, color: "text.secondary" }}
        >
          {paused ? <PlayArrowIcon sx={{ fontSize: 16 }} /> : <PauseIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      {/* Nastro */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          overflowX: paused ? "auto" : "hidden",
          overflowY: "hidden",
          "@media (prefers-reduced-motion: reduce)": { overflowX: "auto" },
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 40,
            zIndex: 2,
            pointerEvents: "none",
          },
          "&::before": {
            left: 0,
            background: (theme) =>
              `linear-gradient(to right, ${theme.palette.background.paper}, transparent)`,
          },
          "&::after": {
            right: 0,
            background: (theme) =>
              `linear-gradient(to left, ${theme.palette.background.paper}, transparent)`,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 3,
            width: "max-content",
            "@keyframes marquee": {
              "0%": { transform: "translateX(0)" },
              "100%": { transform: "translateX(-50%)" },
            },
            animation: `marquee ${SECONDS_PER_SET}s linear infinite`,
            "&:hover": { animationPlayState: "paused" },
            // Il blocco globale di `prefers-reduced-motion` nel tema azzera solo
            // la durata: da solo lascerebbe l'animazione a girare a scatti.
            // Qui viene tolta del tutto.
            "@media (prefers-reduced-motion: reduce)": STATIC_TRACK,
            ...(paused ? STATIC_TRACK : {}),
          }}
        >
          {COPIES.map((copy) =>
            SPONSORS.map((s) => (
              <SponsorCard key={`${s.name}-${copy}`} sponsor={s} clone={copy > 0} />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SponsorCard({ sponsor, clone }: { sponsor: Sponsor; clone: boolean }) {
  return (
    <Box
      component="a"
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer"
      title={sponsor.name}
      // La seconda metà del nastro serve solo a chiudere il ciclo: per gli
      // screen reader e per il Tab ogni sponsor deve esistere una volta sola.
      data-sponsor-clone={clone ? "true" : undefined}
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        textDecoration: "none",
        flexShrink: 0,
        cursor: "pointer",
        transition: "transform 0.15s, opacity 0.15s",
        ...onHover({ transform: "scale(1.06)", opacity: 0.85 }),
      }}
    >
      {/* Logo reale o placeholder */}
      <Box
        sx={(theme) => ({
          width: 110,
          height: 44,
          borderRadius: "6px",
          overflow: "hidden",
          // Placca chiara sotto i loghi nati per la carta bianca: senza, sul
          // fondo scuro restano rettangoli neri su nero.
          backgroundColor: !sponsor.src
            ? sponsor.color
            : sponsor.needsPlateOnDark && theme.palette.mode === "dark"
              ? theme.palette.common.white
              : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: sponsor.src ? "1px solid" : "2px dashed",
          borderColor: sponsor.src ? theme.palette.divider : theme.palette.common.white,
          position: "relative",
        })}
      >
        {sponsor.src ? (
          <Image
            src={sponsor.src}
            alt={sponsor.name}
            fill
            sizes="110px"
            style={{ objectFit: "contain", padding: "4px" }}
          />
        ) : (
          <Typography
            sx={{
              color: "common.white",
              fontWeight: 800,
              fontSize: "1rem",
              letterSpacing: "0.06em",
              userSelect: "none",
            }}
          >
            {sponsor.initials}
          </Typography>
        )}
      </Box>

      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: "0.68rem",
          fontWeight: 500,
          maxWidth: 110,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {sponsor.name}
      </Typography>
    </Box>
  );
}
