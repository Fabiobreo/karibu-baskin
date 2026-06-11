/**
 * Utility per il contrasto testo/sfondo su colori dinamici (es. colore squadra dal DB).
 *
 * I colori squadra sono scelti dall'admin e possono essere chiari (giallo, bianco…):
 * il testo bianco fisso diventa illeggibile. `contrastText()` sceglie bianco o nero
 * in base alla luminanza YIQ dello sfondo.
 *
 * Nota: NON serve per ROLE_COLORS (palette fissa e volutamente scura, vedi constants.ts)
 * né per sfondi a token tema (lì si usano i token `*.contrastText` di MUI).
 */

const DARK_TEXT = "rgba(0,0,0,0.87)";
const LIGHT_TEXT = "#fff";

/** Converte un colore hex (#rgb o #rrggbb) in [r, g, b]; null se non parsabile. */
function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return null;
}

/**
 * Restituisce il colore testo leggibile ("#fff" o nero quasi pieno) per uno sfondo dato.
 * Accetta hex (#rgb/#rrggbb); per valori null/undefined o non parsabili (es. token tema)
 * assume sfondo scuro/brand e restituisce bianco, coerente col comportamento storico.
 */
export function contrastText(background: string | null | undefined): string {
  if (!background) return LIGHT_TEXT;
  const rgb = parseHex(background);
  if (!rgb) return LIGHT_TEXT;
  const [r, g, b] = rgb;
  // Luminanza YIQ: https://www.w3.org/TR/AERT/#color-contrast
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? DARK_TEXT : LIGHT_TEXT;
}
