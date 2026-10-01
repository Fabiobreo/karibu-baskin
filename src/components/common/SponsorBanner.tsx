"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Box, IconButton, Typography } from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { onHover } from "@/lib/hoverStyles";
import { TOUCH_TARGET } from "@/lib/touchTarget";
import { RADIUS } from "@/lib/radius";
import { heroText } from "@/lib/heroStyles";
import { isTaskPath } from "@/lib/taskPages";

// ── Dati sponsor ──────────────────────────────────────────────────────────────
// src: percorso immagine in /public (es. "/sponsors/denis.jpg").
//
// Tessere tutte uguali (UX-39): bianche, perche' quasi tutti i loghi sono nati
// per la carta bianca (quattro hanno il fondo bianco dentro il file). Senza
// didascalia: il nome sta nell'`alt` e nel link.
//
// ownBackground: il logo e' un'immagine con un fondo scuro suo (un biglietto da
// visita nero). Riempie la tessera invece di stare in un riquadro bianco, e un
// bordo chiaro la stacca dal fondo scuro del footer.

const SPONSORS: Sponsor[] = [
  {
    name: "Denis M. Photographer",
    url: "https://www.facebook.com/Denis.M.photographer",
    src: "/sponsors/denis.jpg",
    ownBackground: true,
  },
  {
    name: "Villani and Partners",
    url: "https://villaniandpartners.eu/",
    src: "/sponsors/villani.png",
  },
  { name: "LLP", url: "https://www.llp.it/", src: "/sponsors/LLP.png" },
  { name: "Tetti Tecchio", url: "https://www.tettitecchio.it/", src: "/sponsors/tettitecchio.png" },
  { name: "Saby Sport", url: "https://www.sabysport.com/", src: "/sponsors/sabysport.png" },
  { name: "CGRD", url: "https://www.cgrd.it/it/", src: "/sponsors/cgrd.png" },
];

interface Sponsor {
  name: string;
  url: string;
  src: string;
  ownBackground?: boolean;
}

// Due copie e non sei: l'animazione trasla di -50%, quindi con due metà
// identiche il punto di arrivo coincide con quello di partenza e il ciclo non
// salta.
const COPIES = [0, 1];

// Secondi per far scorrere un set completo. Con -50% su due copie il viaggio è
// esattamente un set, quindi è anche la durata dell'animazione.
const SECONDS_PER_SET = SPONSORS.length * 4;

const GAP_PX = 16;
const TILE = { width: { xs: 124, sm: 148 }, height: { xs: 54, sm: 64 } } as const;

/**
 * Nastro fermo: niente animazione e niente copie, tutti i loghi visibili in
 * una griglia (tre per riga su telefono).
 *
 * Vale per le pagine d'uso, per la pausa e per "riduci movimento": la striscia
 * non si congela a metà logo, diventa l'elenco dei sei sponsor.
 */
const STATIC_TRACK = {
  animation: "none",
  transform: "none",
  width: "auto",
  flexWrap: "wrap",
  '& [data-sponsor-clone="true"]': { display: "none" },
  "& > a": {
    width: { xs: `calc((100% - ${GAP_PX * 2}px) / 3)`, sm: TILE.width.sm },
  },
} as const;

/**
 * Gli sponsor, fascia superiore del footer (UX-39): stessi loghi, stesso
 * ordine, in ogni pagina pubblica. Sulle pagine di contenuto il nastro scorre
 * (con la pausa); sulle pagine d'uso sta fermo.
 */
export default function SponsorBanner() {
  const t = useTranslations("common");
  const tFooter = useTranslations("footer");
  const pathname = usePathname();
  const [paused, setPaused] = useState(false);
  const still = isTaskPath(pathname);
  const isStatic = still || paused;

  return (
    <Box component="section" aria-label={t("sponsorsLabel")}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, minHeight: 44 }}>
        <Typography variant="overline" component="h2" sx={{ color: heroText.muted }}>
          {tFooter("sponsorsTitle")}
        </Typography>
        {/* WCAG 2.2.2: un contenuto in movimento che parte da solo e dura più di
            cinque secondi deve poter essere fermato. La pausa in `:hover` non
            basta, perché da tastiera e su touch non è raggiungibile. Dove il
            nastro e' gia' fermo il comando non serve. */}
        {!still && (
          <IconButton
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t("sponsorsResume") : t("sponsorsPause")}
            aria-pressed={paused}
            sx={{
              ...TOUCH_TARGET,
              color: heroText.secondary,
              // Con "riduci movimento" il nastro e' gia' fermo.
              "@media (prefers-reduced-motion: reduce)": { display: "none" },
            }}
          >
            {paused ? <PlayArrowIcon sx={{ fontSize: 16 }} /> : <PauseIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        )}
      </Box>

      <Box
        sx={{
          overflow: "hidden",
          // Bordi sfumati mentre scorre. Maschera e non una sfumatura colorata:
          // il fondo del footer e' un gradiente, un colore pieno si vedrebbe.
          ...(!isStatic && {
            maskImage:
              "linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent)",
            "@media (prefers-reduced-motion: reduce)": { maskImage: "none" },
          }),
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: `${GAP_PX}px`,
            width: "max-content",
            "@keyframes marquee": {
              "0%": { transform: "translateX(0)" },
              // Meta' pista piu' meta' dello spazio fra le due copie: il ciclo
              // riparte esattamente da dove e' cominciato.
              "100%": { transform: `translateX(calc(-50% - ${GAP_PX / 2}px))` },
            },
            animation: `marquee ${SECONDS_PER_SET}s linear infinite`,
            "&:hover": { animationPlayState: "paused" },
            // Il blocco globale di `prefers-reduced-motion` nel tema azzera solo
            // la durata: da solo lascerebbe l'animazione a girare a scatti.
            // Qui viene tolta del tutto.
            "@media (prefers-reduced-motion: reduce)": STATIC_TRACK,
            ...(isStatic ? STATIC_TRACK : {}),
          }}
        >
          {COPIES.map((copy) =>
            SPONSORS.map((s) => (
              <SponsorTile key={`${s.name}-${copy}`} sponsor={s} clone={copy > 0} />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SponsorTile({ sponsor, clone }: { sponsor: Sponsor; clone: boolean }) {
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
        position: "relative",
        display: "block",
        flexShrink: 0,
        width: TILE.width,
        height: TILE.height,
        borderRadius: RADIUS.md,
        overflow: "hidden",
        bgcolor: sponsor.ownBackground ? "common.black" : "common.white",
        border: "1px solid",
        borderColor: sponsor.ownBackground ? heroText.lineStrong : "transparent",
        transition: "transform 0.15s",
        ...onHover({ transform: "scale(1.04)" }),
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: heroText.primary,
          outlineOffset: "2px",
        },
      }}
    >
      <Image
        src={sponsor.src}
        alt={sponsor.name}
        fill
        sizes="148px"
        style={
          sponsor.ownBackground
            ? { objectFit: "cover" }
            : { objectFit: "contain", padding: "8px 12px" }
        }
      />
    </Box>
  );
}
