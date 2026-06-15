import { Box } from "@mui/material";

interface PointsTrendChartProps {
  /** Punti per partita in ordine cronologico. */
  values: number[];
  /** Token colore tema applicato via `color` (la linea usa currentColor). */
  colorToken?: string;
  height?: number;
}

/**
 * Grafico a linea dell'andamento punti per partita, in SVG puro (nessuna
 * dipendenza di charting, nessun hook → utilizzabile in Server Component).
 * La linea eredita `currentColor`, così il colore arriva dal tema via `sx`.
 */
export default function PointsTrendChart({
  values,
  colorToken = "primary.main",
  height = 90,
}: PointsTrendChartProps) {
  if (values.length < 2) return null;

  const width = 320;
  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + (1 - (v - min) / span) * h;
    return { x, y };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${pad},${pad + h} ${line} ${pad + w},${pad + h}`;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      sx={{ width: "100%", height, display: "block", color: colorToken }}
      aria-hidden
    >
      <polygon points={area} fill="currentColor" opacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 2} fill="currentColor" />
      ))}
    </Box>
  );
}
