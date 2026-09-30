/**
 * Utility per il contrasto testo/sfondo su colori dinamici (es. colore squadra dal DB).
 *
 * I colori squadra sono scelti dall'admin e possono essere chiari (giallo, verde…):
 * il testo bianco fisso diventa illeggibile. `contrastText()` sceglie fra bianco e
 * nero quasi pieno quello che, sullo sfondo dato, ha il rapporto di contrasto WCAG
 * più alto.
 *
 * Prima la scelta passava per la formula YIQ con soglia 128, che è tarata sulla
 * luminosità percepita e non sul contrasto: sui verdi medi (il colore dei Montekki)
 * restituiva bianco, cioè circa 2,6:1 sul nome squadra. Il confronto diretto fra i
 * due rapporti non ha questo punto cieco.
 *
 * Nota: NON serve per ROLE_COLORS (palette fissa e volutamente scura, vedi constants.ts)
 * né per sfondi a token tema (lì si usano i token `*.contrastText` di MUI).
 */

import { BRAND, NEUTRAL } from "@/lib/palette";

const DARK_TEXT = NEUTRAL.onLightFill;
const LIGHT_TEXT = BRAND.white;

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

/** Luminanza relativa WCAG 2.x di un canale sRGB normalizzato. */
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminanza relativa WCAG di [r, g, b]. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Rapporto di contrasto WCAG fra due colori hex, da 1 (identici) a 21
 * (bianco/nero). Restituisce null se uno dei due non è parsabile.
 * Esportato perché serve anche ai test che verificano le soglie AA.
 */
export function contrastRatio(a: string, b: string): number | null {
  const rgbA = parseHex(a);
  const rgbB = parseHex(b);
  if (!rgbA || !rgbB) return null;
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const [hi, lo] = lA >= lB ? [lA, lB] : [lB, lA];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Adatta un colore dinamico (es. colore squadra) perché sia leggibile COME
 * TESTO sullo sfondo dato, scurendolo o schiarendolo finché non raggiunge la
 * soglia richiesta. È il caso speculare di `contrastText()`: lì il colore è lo
 * sfondo, qui è il testo.
 *
 * Serve dove il colore squadra fa da occhiello o da numero su una superficie
 * chiara: il verde dei Montekki (#43A047) su #F7F4F1 fa 3,02:1.
 *
 * Se il colore non è parsabile lo restituisce invariato (può essere un token
 * di tema, che non tocchiamo).
 */
export function readableOn(color: string, background: string, target = 4.5): string {
  const rgb = parseHex(color);
  const bg = parseHex(background);
  if (!rgb || !bg) return color;
  const bgLuminance = relativeLuminance(bg);
  // Su fondo chiaro si scurisce, su fondo scuro si schiarisce.
  const towardsWhite = bgLuminance < 0.5;
  let current: [number, number, number] = [...rgb];
  for (let i = 0; i < 24; i++) {
    const l = relativeLuminance(current);
    const [hi, lo] = l >= bgLuminance ? [l, bgLuminance] : [bgLuminance, l];
    if ((hi + 0.05) / (lo + 0.05) >= target) break;
    current = current.map((c) =>
      towardsWhite ? Math.round(c + (255 - c) * 0.12) : Math.round(c * 0.88)
    ) as [number, number, number];
  }
  return "#" + current.map((c) => c.toString(16).padStart(2, "0")).join("");
}

/**
 * Restituisce il colore testo leggibile (bianco o nero quasi pieno) per uno sfondo dato.
 * Accetta hex (#rgb/#rrggbb); per valori null/undefined o non parsabili (es. token tema)
 * assume sfondo scuro/brand e restituisce bianco, coerente col comportamento storico.
 */
export function contrastText(background: string | null | undefined): string {
  if (!background) return LIGHT_TEXT;
  const rgb = parseHex(background);
  if (!rgb) return LIGHT_TEXT;
  const luminance = relativeLuminance(rgb);
  const onWhite = 1.05 / (luminance + 0.05);
  const onBlack = (luminance + 0.05) / 0.05;
  return onBlack >= onWhite ? DARK_TEXT : LIGHT_TEXT;
}

/** Il testo scuro di `contrastText` è nero all'87%: il colore che si vede davvero sul fondo. */
function darkTextOn(rgb: [number, number, number]): [number, number, number] {
  return rgb.map((c) => Math.round(c * 0.13)) as [number, number, number];
}

function ratio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Fondo ed etichetta per un colore dinamico usato come RIEMPIMENTO (chip
 * squadra, UX-22). L'etichetta la sceglie `contrastText()`; se nemmeno la
 * migliore delle due arriva a 4,5:1 (i colori a metà luminosità, dove bianco e
 * nero quasi pieno si equivalgono) il fondo si scurisce finché il bianco regge.
 *
 * Con `preferWhite` l'etichetta resta sempre bianca e, se serve, si scurisce il
 * fondo: è la scelta del committente per i riempimenti arancio (UX-07, niente
 * nero su arancio), da usare su bottoni e chip che finora avevano il bianco.
 *
 * Con un colore non parsabile (token di tema, null) restituisce il riempimento
 * arancio del tema con etichetta bianca.
 */
export function readableFill(
  color: string | null | undefined,
  { preferWhite = false }: { preferWhite?: boolean } = {}
): { bg: string; fg: string } {
  const rgb = color ? parseHex(color) : null;
  if (!color || !rgb) return { bg: "primary.fill", fg: LIGHT_TEXT };
  const fg = preferWhite ? LIGHT_TEXT : contrastText(color);
  const shown: [number, number, number] = fg === LIGHT_TEXT ? [255, 255, 255] : darkTextOn(rgb);
  if (ratio(rgb, shown) >= 4.5) return { bg: color, fg };
  return { bg: readableOn(color, BRAND.white), fg: LIGHT_TEXT };
}
