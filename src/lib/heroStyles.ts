/**
 * Costanti di styling condivise per gli hero del sito.
 *
 * Estratte da `src/theme.ts` perché quel file è `"use client"`: importare
 * costanti da moduli client in Server Components le serializza come
 * client references → diventano `undefined` a runtime lato server.
 */

export const heroGradient = {
  dark: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
  /** Variante corta, usata dal footer e dalle fasce scure di fine pagina. */
  footer: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
  /** Fascia arancione piena (banner compleanni). */
  orange: "linear-gradient(90deg, #E65100 0%, #FF8F00 100%)",
} as const;

/**
 * I due colori del marchio, come costanti importabili anche dai Server
 * Component (`src/theme.ts` e' `"use client"` e non e' importabile di la').
 * Servono per le velature `alpha(...)` dentro `sx`: in un Server Component non
 * si puo' passare `sx={(theme) => ...}`, perche' le funzioni non attraversano
 * il confine RSC. Nei Client Component si usa il tema.
 */
export const brandColor = {
  orange: "#E65100",
  white: "#FFFFFF",
  black: "#000000",
  /** Il nero del marchio: fondo degli hero e dell'AppBar, non `#000`. */
  dark: "#1A1A1A",
  /** Un gradino sopra `dark`, per bordi e superfici staccate sul fondo scuro. */
  darkSoft: "#2A2A2A",
} as const;

/**
 * Testo sopra gli hero, che restano scuri in entrambi i temi: qui i token
 * `text.*` non servono, perche' seguirebbero il tema corrente e in chiaro
 * darebbero testo nero su fondo nero.
 */
export const heroText = {
  primary: "#FFFFFF",
  /** Sottotitoli e didascalie. */
  secondary: "#E0E0E0",
  /** Testo di servizio, il piu' smorzato che regga la soglia AA sul fondo hero. */
  muted: "#BDBDBD",
} as const;

/**
 * Medaglie sugli hero, che sono scuri in entrambi i temi: qui servono sempre i
 * valori metallici chiari, non quelli del tema corrente (in chiaro sono
 * scuriti per staccarsi dalle card bianche). Speculari a `darkMedal` in
 * `src/theme.ts`.
 */
export const heroMedal = {
  gold: "#FFD54F",
  goldDeep: "#FFA000",
  silver: "#E0E0E0",
  silverDeep: "#9E9E9E",
  bronze: "#D7A56B",
  bronzeDeep: "#8D6E63",
} as const;

/**
 * Colori identitari delle piattaforme esterne, per gli hover delle icone social.
 * Sono gli unici letterali legittimi in `sx`: non sono colori del tema ma il
 * marchio altrui, quindi non hanno un token e non cambiano col tema.
 */
export const socialBrandColor = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  youtube: "#FF0000",
  whatsapp: "#25D366",
  /** Verde scuro di WhatsApp, per bordi e stati hover sulle superfici chiare. */
  whatsappDark: "#128C7E",
} as const;
