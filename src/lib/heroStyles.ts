/**
 * Costanti di styling condivise per gli hero del sito.
 *
 * Estratte da `src/theme.ts` perché quel file è `"use client"`: importare
 * costanti da moduli client in Server Components le serializza come
 * client references → diventano `undefined` a runtime lato server.
 */

export const heroGradient = {
  dark: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
} as const;
