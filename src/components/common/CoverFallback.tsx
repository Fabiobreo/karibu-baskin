import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { brandColor, heroGradient, heroText } from "@/lib/heroStyles";

interface CoverFallbackProps {
  /** Data in grande: "17" / "ottobre" / "sabato". Senza, resta solo il fondo. */
  day?: string;
  month?: string;
  weekday?: string;
}

/**
 * Copertina di ripiego per le card senza immagine (UX-19): fondo grafite degli
 * hero con il cerchio di centrocampo in arancio leggero e, se c'e', la data in
 * grande. Riempie il contenitore del genitore, che decide la proporzione (la
 * stessa delle copertine vere): una griglia di card tutte senza foto sembra
 * voluta, non rotta.
 *
 * Nessun hook: va bene sia nei Server sia nei Client Component. Il fondo resta
 * scuro in entrambi i temi, come gli hero.
 */
export default function CoverFallback({ day, month, weekday }: CoverFallbackProps) {
  const line = alpha(brandColor.orange, 0.28);
  return (
    <Box
      aria-hidden
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
      {/* Meta' campo: linea di centrocampo e cerchio, disegnati coi bordi. */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          right: "-18%",
          width: "70%",
          aspectRatio: "1",
          transform: "translateY(-50%)",
          borderRadius: "50%",
          border: `2px solid ${line}`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: "17%",
          borderLeft: `2px solid ${line}`,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          right: "calc(17% - 6px)",
          width: 12,
          height: 12,
          transform: "translateY(-50%)",
          borderRadius: "50%",
          bgcolor: line,
        }}
      />

      {day && (
        <Box sx={{ position: "relative", lineHeight: 1 }}>
          {weekday && (
            <Typography
              variant="overline"
              sx={{ color: heroText.secondary, display: "block", lineHeight: 1.6 }}
            >
              {weekday}
            </Typography>
          )}
          <Typography
            variant="h3"
            component="span"
            sx={{
              display: "block",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {day}
          </Typography>
          {month && (
            <Typography
              variant="subtitle1"
              component="span"
              sx={{ display: "block", color: heroText.secondary }}
            >
              {month}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
