import { Box, useTheme } from "@mui/material";

interface RatingSparklineProps {
  /** Serie di μ in ordine cronologico. */
  values: number[];
  /** Colore della linea (token tema, es. "success.main"). Default primary. */
  colorToken?: string;
  width?: number;
  height?: number;
}

/**
 * Mini-grafico della curva di μ nel tempo, in SVG puro (nessuna dipendenza di
 * charting). Presentazionale: nessun hook di stato, può essere reso ovunque.
 */
export default function RatingSparkline({
  values,
  colorToken = "primary.main",
  width = 120,
  height = 32,
}: RatingSparklineProps) {
  const theme = useTheme();

  if (values.length < 2) {
    return <Box sx={{ width, height, display: "inline-block" }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + (1 - (v - min) / span) * h; // μ alto = in alto
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Risolve il token tema "a.b" → colore concreto per l'attributo SVG stroke.
  const [group, shade] = colorToken.split(".");
  const palette = theme.palette as unknown as Record<string, Record<string, string>>;
  const stroke = palette[group]?.[shade ?? "main"] ?? theme.palette.primary.main;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${width} ${height}`}
      sx={{ width, height, display: "inline-block", verticalAlign: "middle" }}
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r={2}
        fill={stroke}
      />
    </Box>
  );
}
