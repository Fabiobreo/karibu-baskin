// Costante condivisa tra Server Component (layout) e ThemeContext (client).
// Tenuta fuori da un modulo "use client" così il server può importarla come
// valore reale (e non come client-reference).
export const COLOR_MODE_COOKIE = "karibu-color-mode";

export type ColorMode = "light" | "dark" | "system";

// Esito RISOLTO della preferenza (mai "system"): in modalità "system" viene
// scritto dallo script bloccante in <head>, prima del primo paint, così dal
// caricamento successivo il Server Component sa già cosa rendere e non c'è
// più il lampo chiaro.
export const COLOR_SCHEME_COOKIE = "karibu-scheme";

export type ResolvedScheme = "light" | "dark";

export function resolveScheme(mode: ColorMode, hint: ResolvedScheme): ResolvedScheme {
  return mode === "system" ? hint : mode;
}
