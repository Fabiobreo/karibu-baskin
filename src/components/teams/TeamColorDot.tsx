import { Box } from "@mui/material";

interface TeamColorDotProps {
  /** Hex scelto dallo staff per la squadra; null = niente pallino. */
  color: string | null | undefined;
  size?: number;
}

/**
 * Pallino del colore squadra da mettere accanto al nome, dentro un testo o un
 * chip. Lo sfondo di chi lo ospita resta quello suo (es. l'avviso di un chip
 * "Solo <squadra>"): il colore squadra aggiunge il riconoscimento senza
 * cambiare il significato del contenitore.
 *
 * L'anello e' nel colore del testo (`currentColor`), che per definizione
 * contrasta con lo sfondo: cosi' anche i preset vicini allo sfondo (il nero in
 * tema scuro, l'arancio su un chip arancio) restano visibili.
 */
export default function TeamColorDot({ color, size = 8 }: TeamColorDotProps) {
  if (!color) return null;
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: color,
        boxShadow: "0 0 0 1.5px currentColor",
        verticalAlign: "middle",
        position: "relative",
        top: "-1px",
        // A sinistra c'e' gia' lo spazio della frase ("Solo "), a destra no.
        ml: "1px",
        mr: "5px",
        flexShrink: 0,
      }}
    />
  );
}
