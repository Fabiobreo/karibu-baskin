/**
 * Scala delle dimensioni del testo (UX-10, UX-27): l'unica fonte dei
 * `fontSize` del sito. Il tema la usa per `body2`, `caption` e `overline`;
 * dove serve solo la dimensione (numeri grandi con `variant="stat"`, titoli
 * degli hero, testo dentro un componente MUI che ha gia' il suo peso) si scrive
 * `fontSize: TYPE_SCALE.sm` invece di un letterale, che ESLint segnala.
 *
 * Minimo 12 px (`xs`) per qualunque testo. I gradini sono pochi di proposito:
 * prima c'erano una sessantina di valori diversi, spesso a mezzo pixel l'uno
 * dall'altro.
 */
export const TYPE_SCALE = {
  /** 12 px: didascalie, meta, chip. Il minimo. */
  xs: "0.75rem",
  /** 14 px: testo secondario (`body2`). */
  sm: "0.875rem",
  /** 16 px: testo corrente (`body1`). */
  md: "1rem",
  /** 18 px */
  lg: "1.125rem",
  /** 20 px (`h6`) */
  xl: "1.25rem",
  /** 24 px (`h5`) */
  "2xl": "1.5rem",
  /** 28 px */
  "3xl": "1.75rem",
  /** 32 px */
  "4xl": "2rem",
  /** 40 px */
  "5xl": "2.5rem",
  /** 48 px */
  "6xl": "3rem",
  /** 64 px */
  "7xl": "4rem",
  /** 80 px */
  "8xl": "5rem",
  /** 96 px */
  "9xl": "6rem",
  /** 144 px: solo numeri decorativi (404). */
  "10xl": "9rem",
} as const;

export type TypeStep = keyof typeof TYPE_SCALE;
