// Costante condivisa tra Server Component (layout) e ThemeContext (client).
// Tenuta fuori da un modulo "use client" così il server può importarla come
// valore reale (e non come client-reference).
export const COLOR_MODE_COOKIE = "karibu-color-mode";

export type ColorMode = "light" | "dark" | "system";
