"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";

// ── Dati sponsor ──────────────────────────────────────────────────────────────
// src: percorso immagine in /public (es. "/sponsors/denis.png")
// Lasciare src: null finché l'immagine non è disponibile → mostra placeholder

const SPONSORS = [
  { name: "Denis M. Photographer", url: "https://www.facebook.com/Denis.M.photographer", color: "#1A1A1A", initials: "DM", src: "/sponsors/denis.jpg" },
  { name: "Villani and Partners",  url: "https://villaniandpartners.eu/",                color: "#1E88E5", initials: "VP", src: "/sponsors/villani.png" },
  { name: "LLP",                   url: "https://www.llp.it/",                           color: "#43A047", initials: "LLP", src: "/sponsors/LLP.png" },
  { name: "Tetti Tecchio",         url: "https://www.tettitecchio.it/",                  color: "#FF6D00", initials: "TT", src: "/sponsors/tettitecchio.png" },
  { name: "Saby Sport",            url: "https://www.sabysport.com/",                    color: "#F44336", initials: "SS", src: "/sponsors/sabysport.png" },
  { name: "CGRD",                  url: "https://www.cgrd.it/it/",                       color: "#8E24AA", initials: "CG", src: "/sponsors/cgrd.png" },
] satisfies { name: string; url: string; color: string; initials: string; src: string | null }[];

type Sponsor = typeof SPONSORS[number];

export default function SponsorBanner() {
  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        py: 1.5,
        overflow: "hidden",
        position: "relative",
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 64,
          zIndex: 2,
          pointerEvents: "none",
        },
        "&::before": {
          left: 0,
          background: "linear-gradient(to right, var(--Paper-overlay, #fff), transparent)",
        },
        "&::after": {
          right: 0,
          background: "linear-gradient(to left, var(--Paper-overlay, #fff), transparent)",
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "text.disabled",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          zIndex: 3,
          fontSize: "0.6rem",
          display: { xs: "none", sm: "block" },
        }}
      >
        Sponsor
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 3,
          width: "max-content",
          "@keyframes marquee": {
            "0%":   { transform: "translateX(0)" },
            "100%": { transform: "translateX(-50%)" },
          },
          // 6 copie: -50% copre 3 set → stessa velocità per sponsor
          animation: `marquee ${SPONSORS.length * 4 * 3}s linear infinite`,
          "&:hover": { animationPlayState: "paused" },
        }}
      >
        {Array(6).fill(SPONSORS).flat().map((s, i) => (
          <SponsorCard key={i} sponsor={s} />
        ))}
      </Box>
    </Box>
  );
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  return (
    <Box
      component="a"
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer"
      title={sponsor.name}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        textDecoration: "none",
        flexShrink: 0,
        cursor: "pointer",
        transition: "transform 0.15s, opacity 0.15s",
        "&:hover": { transform: "scale(1.06)", opacity: 0.85 },
      }}
    >
      {/* Logo reale o placeholder */}
      <Box
        sx={{
          width: 110,
          height: 44,
          borderRadius: "6px",
          overflow: "hidden",
          bgcolor: sponsor.src ? "transparent" : sponsor.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: sponsor.src ? "1px solid" : "2px dashed rgba(255,255,255,0.35)",
          borderColor: sponsor.src ? "divider" : undefined,
          position: "relative",
        }}
      >
        {sponsor.src ? (
          <Image
            src={sponsor.src}
            alt={sponsor.name}
            fill
            style={{ objectFit: "contain", padding: "4px" }}
          />
        ) : (
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1rem", letterSpacing: "0.06em", userSelect: "none" }}>
            {sponsor.initials}
          </Typography>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", fontWeight: 500 }}>
        {sponsor.name}
      </Typography>
    </Box>
  );
}
