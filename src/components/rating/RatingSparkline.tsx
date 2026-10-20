import { Box, useTheme } from "@mui/material";
import type { CurvePoint } from "@/lib/rating/ratingTrend";

interface RatingSparklineProps {
  /** Punti della curva in ordine cronologico. */
  points: CurvePoint[];
  /**
   * Scala comune a tutta la rosa: chi è stabile ha una linea piatta e una
   * salita disegnata è una salita vera (con una scala per giocatore anche una
   * variazione minima andava da un bordo all'altro).
   */
  scale: { min: number; max: number };
  /** Livello medio della rosa: riga tratteggiata di riferimento. */
  reference?: number;
  /**
   * Colore del pallino finale: e' l'unico punto dove mettere una valenza
   * (es. `success.main` per un trend in salita). La serie resta neutra.
   */
  endColorToken?: string;
  /** Cerchio per le partitelle, quadrato per le ufficiali (vista di dettaglio). */
  markers?: boolean;
  width?: number;
  height?: number;
  /** Larghezza al 100% del contenitore, altezza in proporzione. */
  fluid?: boolean;
}

/**
 * Curva del livello stimato nel tempo, in SVG puro. La fascia attorno alla
 * linea è l'incertezza (±σ): larga all'inizio, si stringe a ogni partita.
 * UX-29: i dati sono in inchiostro, mai in arancio (che vuol dire "si tocca").
 */
export default function RatingSparkline({
  points,
  scale,
  reference,
  endColorToken,
  markers = false,
  width = 140,
  height = 34,
  fluid = false,
}: RatingSparklineProps) {
  const theme = useTheme();
  const size = fluid ? { width: "100%", height: "auto" } : { width, height };

  if (points.length < 2) {
    return <Box sx={{ ...size, display: "inline-block" }} />;
  }

  const pad = markers ? 6 : 3;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const span = scale.max - scale.min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * w;
  // μ alto = in alto; la fascia può uscire dalla scala e si ferma al bordo.
  const y = (v: number) => pad + Math.min(1, Math.max(0, 1 - (v - scale.min) / span)) * h;

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.mu).toFixed(1)}`).join(" ");
  const upper = points.map((p, i) => `${x(i).toFixed(1)},${y(p.mu + p.sigma).toFixed(1)}`);
  const lower = points
    .map((p, i) => `${x(i).toFixed(1)},${y(p.mu - p.sigma).toFixed(1)}`)
    .reverse();

  // Risolve il token tema "a.b" → colore concreto per gli attributi SVG.
  const palette = theme.palette as unknown as Record<string, Record<string, string>>;
  const resolve = (token: string) => {
    const [group, shade] = token.split(".");
    return palette[group]?.[shade ?? "main"] ?? theme.palette.text.primary;
  };
  const ink = theme.palette.text.primary;
  const end = endColorToken ? resolve(endColorToken) : ink;
  const last = points.length - 1;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${width} ${height}`}
      sx={{ ...size, display: "inline-block", verticalAlign: "middle" }}
      aria-hidden
    >
      {reference !== undefined && (
        <line
          x1={0}
          x2={width}
          y1={y(reference)}
          y2={y(reference)}
          stroke={theme.palette.divider}
          strokeDasharray="3 4"
        />
      )}
      <polygon points={[...upper, ...lower].join(" ")} fill={ink} fillOpacity={0.08} />
      <polyline
        points={line}
        fill="none"
        stroke={ink}
        strokeWidth={markers ? 2 : 1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {markers &&
        points
          .slice(0, last)
          .map((p, i) =>
            p.kind === "official" ? (
              <rect key={i} x={x(i) - 3.5} y={y(p.mu) - 3.5} width={7} height={7} fill={ink} />
            ) : p.kind === "training" ? (
              <circle key={i} cx={x(i)} cy={y(p.mu)} r={3.5} fill={ink} />
            ) : null
          )}
      {/* L'ultimo punto tiene la sua forma (quadrato = ufficiale) e porta la valenza. */}
      {markers && points[last].kind === "official" ? (
        <rect x={x(last) - 5} y={y(points[last].mu) - 5} width={10} height={10} fill={end} />
      ) : (
        <circle cx={x(last)} cy={y(points[last].mu)} r={markers ? 5 : 3} fill={end} />
      )}
    </Box>
  );
}
