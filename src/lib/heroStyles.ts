/**
 * Costanti di styling condivise per gli hero del sito.
 *
 * Estratte da `src/theme.ts` perché quel file è `"use client"`: importare
 * costanti da moduli client in Server Components le serializza come
 * client references → diventano `undefined` a runtime lato server.
 */

import { BRAND, HERO, HERO_TEXT, MEDAL, OUTCOME, SOCIAL_BRAND } from "@/lib/palette";

// Fondo degli hero (UX-08): grafite pieno, non piu' il marrone, che diluiva
// l'identita' arancio e nero. I valori stanno in `@/lib/palette` (UX-29).
const HERO_BASE = `linear-gradient(160deg, ${HERO.from} 0%, ${HERO.to} 100%)`;

// Fascia delle intestazioni (UX-32): grafite piu' chiaro dell'header, senza
// bagliore (sul grafite l'arancio sfumato si leggeva come una macchia marrone).
const HERO_BAND = `linear-gradient(160deg, ${HERO.bandFrom} 0%, ${HERO.bandTo} 100%)`;

/**
 * L'unico punto in cui si scrivono i colori degli hero. Tutti gli hero del sito
 * (PageHero, EntityHero, allenamento, partita, giocatore, squadra, errori)
 * passano di qui: per cambiarli basta questo file.
 */
export const heroGradient = {
  /** Hero standard: grafite con un solo bagliore arancio leggero in alto a destra. */
  dark: `radial-gradient(90% 120% at 100% 0%, ${BRAND.orangeGlow} 0%, ${BRAND.orangeGlowNone} 60%), ${HERO_BASE}`,
  /** Fascia di `PageHero` ed `EntityHero`: grafite un gradino sopra l'header, senza bagliore. */
  band: HERO_BAND,
  /** Variante senza bagliore, usata dal footer e dalle fasce scure di fine pagina. */
  footer: HERO_BASE,
} as const;

/**
 * Hero di un'entita' con un suo colore (squadra, giocatore, esito della
 * partita): stesso grafite, con il colore che affiora da un angolo invece di
 * tingere tutta la superficie. `color` puo' arrivare dal database, quindi si
 * miscela con `color-mix` e non con un suffisso esadecimale.
 *
 * Il picco resta al 45% (sopra, sull'Oro, i testi secondari scendono sotto
 * 4,5:1); la sfumatura arriva all'80% del raggio, cosi' la tinta si vede su
 * circa meta' dell'hero e non solo nell'angolo.
 */
export function heroTint(color: string): string {
  return `radial-gradient(100% 140% at 100% 100%, color-mix(in srgb, ${color} 45%, transparent) 0%, transparent 80%), ${HERO_BAND}`;
}

/** Foto di copertina sotto l'hero, velata per reggere il testo bianco. */
export function heroImage(url: string): string {
  return `linear-gradient(${HERO.photoScrim}, ${HERO.photoScrim}), url(${url})`;
}

/**
 * Colori degli esiti per gli hero delle partite, che restano scuri in entrambi
 * i temi: i valori del tema chiaro, che reggono il bianco.
 */
export const heroResultColor = {
  WIN: OUTCOME.light.win,
  LOSS: OUTCOME.light.loss,
  DRAW: OUTCOME.light.draw,
} as const;

/**
 * Bordo inferiore degli hero: in tema scuro un hero grafite su una pagina
 * #121212 si confonderebbe con lo sfondo. In chiaro e' trasparente.
 */
export const heroBottomBorder = {
  borderBottom: "1px solid",
  borderColor: "heroGradient.border",
} as const;

/**
 * Card in testa alla home di tesserati e ospiti (UX-33): sale sopra il bordo
 * basso dell'hero, cosi' l'hero resta alta e la card si vede senza scorrere.
 * `HeroSection greeting` lascia sotto il saluto lo spazio che la card copre.
 */
export const heroOverlapSx = {
  position: "relative",
  zIndex: 2,
  mt: { xs: -7, md: -10 },
} as const;

/**
 * I due colori del marchio, come costanti importabili anche dai Server
 * Component (`src/theme.ts` e' `"use client"` e non e' importabile di la').
 * Servono per le velature `alpha(...)` dentro `sx`: in un Server Component non
 * si puo' passare `sx={(theme) => ...}`, perche' le funzioni non attraversano
 * il confine RSC. Nei Client Component si usa il tema.
 */
export const brandColor = {
  orange: BRAND.orange,
  white: BRAND.white,
  black: BRAND.black,
  /** Il nero del marchio: fondo degli hero e dell'AppBar, non `#000`. */
  dark: BRAND.dark,
  /** Un gradino sopra `dark`, per bordi e superfici staccate sul fondo scuro. */
  darkSoft: BRAND.darkSoft,
} as const;

/**
 * Testo sopra gli hero, che restano scuri in entrambi i temi: qui i token
 * `text.*` non servono, perche' seguirebbero il tema corrente e in chiaro
 * darebbero testo nero su fondo nero.
 */
export const heroText = HERO_TEXT;

/**
 * Medaglie sugli hero, che sono scuri in entrambi i temi: qui servono sempre i
 * valori metallici chiari, non quelli del tema corrente (in chiaro sono
 * scuriti per staccarsi dalle card bianche). Speculari a `darkMedal` in
 * `src/theme.ts`.
 */
export const heroMedal = {
  gold: MEDAL.dark.gold,
  goldDeep: MEDAL.dark.goldDeep,
  silver: MEDAL.dark.silver,
  silverDeep: MEDAL.dark.silverDeep,
  bronze: MEDAL.dark.bronze,
  bronzeDeep: MEDAL.dark.bronzeDeep,
} as const;

/**
 * Colori identitari delle piattaforme esterne, per gli hover delle icone social.
 * Sono gli unici letterali legittimi in `sx`: non sono colori del tema ma il
 * marchio altrui, quindi non hanno un token e non cambiano col tema.
 */
export const socialBrandColor = SOCIAL_BRAND;
