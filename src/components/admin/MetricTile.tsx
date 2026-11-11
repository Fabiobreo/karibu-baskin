import Link from "next/link";
import { Box, Paper, Typography } from "@mui/material";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** Sezione di `/admin/metriche`: titolo e griglia di tessere. */
export function MetricSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section">
      <Typography
        variant="overline"
        component="h2"
        sx={{ color: "text.secondary", display: "block", mb: 1 }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

interface MetricTileProps {
  value: string;
  label: string;
  caption: string;
  /** Confronto con quattro settimane prima, già scritto ("+3 rispetto al mese scorso"). */
  delta?: string;
  href?: string;
  highlight?: boolean;
}

/**
 * Un numero con la sua etichetta. KPI neutro (UX-29): niente verde o rosso,
 * nemmeno sul confronto, che è testo.
 */
export default function MetricTile({
  value,
  label,
  caption,
  delta,
  href,
  highlight,
}: MetricTileProps) {
  const body = (
    <Paper
      elevation={1}
      sx={{
        p: 2.5,
        height: "100%",
        // Evidenza, non azione (UX-29): bordo nel colore del testo, niente tinta.
        border: "2px solid",
        borderColor: highlight ? "text.primary" : "transparent",
      }}
    >
      <Typography
        component="p"
        sx={{
          fontSize: TYPE_SCALE.xl4,
          fontWeight: FONT_WEIGHT.bold,
          lineHeight: 1,
          color: "text.primary",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography variant="subtitle2" sx={{ mt: 0.75 }}>
        {label}
      </Typography>
      {delta && (
        <Typography variant="body2" sx={{ mt: 0.25, color: "text.primary" }}>
          {delta}
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.5, lineHeight: 1.4 }}
      >
        {caption}
      </Typography>
    </Paper>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {body}
    </Link>
  ) : (
    body
  );
}
