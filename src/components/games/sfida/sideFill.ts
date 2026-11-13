import { BIB, BRAND, HERO_TEXT } from "@/lib/palette";
import type { SideColor } from "@/lib/games/sfidaState";

/**
 * Riempimento del segno di un lato della Sfida (UX-69): la tinta della squadra
 * vera, la casacca d'allenamento per i lati mescolati (eccezione chiusa della
 * palette, sempre accanto al nome), o neutro. È un disco o una barra, mai il
 * fondo di un testo piccolo.
 */
export function sideFill(color: SideColor): { bg: string; fg: string; ring: string | null } {
  if (color?.kind === "team") return { bg: color.bg, fg: color.fg, ring: null };
  if (color?.kind === "bib") {
    return color.bib === "orange"
      ? { bg: BIB.orange, fg: BRAND.white, ring: null }
      : { bg: BIB.black, fg: BRAND.white, ring: HERO_TEXT.lineStrong };
  }
  return { bg: BRAND.darkSoft, fg: HERO_TEXT.secondary, ring: HERO_TEXT.lineStrong };
}

/** Iniziale del nome di un lato, per il disco. */
export function sideInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase() || "?";
}
