import { Box, Typography } from "@mui/material";
import type { ElementType } from "react";
import { heroGradient, heroText } from "@/lib/heroStyles";

interface CoverFallbackProps {
  /** Titolo in grande sulla copertina. Senza, resta solo il fondo. */
  title?: string;
  /** Elemento del titolo: la copertina fa da intestazione della card. */
  titleComponent?: ElementType;
  /**
   * Chiave stabile (l'id dell'entita') da cui si sceglie il disegno del fondo:
   * la stessa card ha sempre lo stesso, due card vicine di rado.
   */
  seed?: string;
}

const LINE = `2px solid ${heroText.line}`;
const ROUND = { position: "absolute", aspectRatio: "1", borderRadius: "50%", border: LINE };

/**
 * Disegni del fondo: pezzi di campo fatti coi bordi, in un filo neutro (UX-29:
 * l'arancio e' solo per cio' che si tocca). Stanno a destra e in alto, lontano
 * dal titolo che e' in basso a sinistra.
 */
const BACKDROPS = [
  // Meta' campo: linea e cerchio di centrocampo.
  [
    { ...ROUND, top: "50%", right: "-18%", width: "70%", transform: "translateY(-50%)" },
    { position: "absolute", top: 0, bottom: 0, right: "17%", borderLeft: LINE },
  ],
  // Arco dei tre punti dall'angolo in alto.
  [
    { ...ROUND, top: 0, right: 0, width: "95%", transform: "translate(50%, -50%)" },
    { ...ROUND, top: 0, right: 0, width: "50%", transform: "translate(50%, -50%)" },
  ],
  // Area con la lunetta, vista dall'alto.
  [
    { position: "absolute", top: -2, right: "10%", width: "32%", height: "58%", border: LINE },
    { ...ROUND, top: "58%", right: "10%", width: "32%", transform: "translateY(-50%)" },
  ],
  // Arco dei tre punti dall'angolo in basso.
  [
    { ...ROUND, bottom: 0, right: 0, width: "85%", transform: "translate(50%, 50%)" },
    { ...ROUND, bottom: 0, right: 0, width: "40%", transform: "translate(50%, 50%)" },
  ],
] as const;

/** Indice stabile del disegno a partire dalla chiave. */
export function coverBackdropIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % BACKDROPS.length;
}

/**
 * Copertina di ripiego per le card senza immagine (UX-19, UX-38): fondo grafite
 * degli hero con un pezzo di campo disegnato e il titolo in grande. Il titolo
 * e il disegno cambiano da una card all'altra, cosi' una griglia di card senza
 * foto non sembra un caricamento rimasto a meta'. Niente data: sta gia' nel
 * chip della card.
 *
 * Riempie il contenitore del genitore, che decide la proporzione (la stessa
 * delle copertine vere). Nessun hook: va bene sia nei Server sia nei Client
 * Component. Il fondo resta scuro in entrambi i temi, come gli hero.
 */
export default function CoverFallback({
  title,
  titleComponent = "span",
  seed,
}: CoverFallbackProps) {
  const backdrop = BACKDROPS[seed ? coverBackdropIndex(seed) : 0];
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: heroGradient.dark,
        color: heroText.primary,
        display: "flex",
        alignItems: "flex-end",
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Box aria-hidden>
        {backdrop.map((shape, i) => (
          <Box key={i} sx={shape} />
        ))}
      </Box>

      {title && (
        <Typography
          variant="h5"
          component={titleComponent}
          sx={{
            position: "relative",
            lineHeight: 1.15,
            textWrap: "balance",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </Typography>
      )}
    </Box>
  );
}
