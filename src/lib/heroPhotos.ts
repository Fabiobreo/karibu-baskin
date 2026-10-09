import { romeCalendarDaysBetween } from "@/lib/dateUtils";

/**
 * Foto dell'hero della home. Ogni voce ha due immagini, perche' lo stesso
 * scatto non regge i due formati: una orizzontale per la fascia larga del
 * desktop e una verticale per il telefono, dove il testo copre la meta' bassa
 * e le facce devono stare in quella alta. `position` e' il punto che resta in
 * vista quando la fascia taglia la foto (`object-position`).
 *
 * Una foto nuova: i file in `public/hero/` (orizzontale larga 3.200 px,
 * verticale gia' ritagliata sul gruppo, con il prato sotto) e una voce qui.
 */
export interface HeroImage {
  src: string;
  position: string;
}

export interface HeroPhoto {
  key: string;
  wide: HeroImage;
  tall: HeroImage;
}

export const HERO_PHOTOS: readonly HeroPhoto[] = [
  {
    key: "palestra",
    wide: { src: "/hero.jpg", position: "center" },
    tall: { src: "/hero.jpg", position: "center" },
  },
  {
    // Tutto il club al castello; su telefono la squadra arancione.
    key: "castello-tutti",
    wide: { src: "/hero/castello-tutti.jpg", position: "50% 92%" },
    tall: { src: "/hero/castello-arancioni-tall.jpg", position: "center bottom" },
  },
  {
    // La squadra nera al castello; su telefono il centro del gruppo, con i due colori.
    key: "castello-neri",
    wide: { src: "/hero/castello-neri.jpg", position: "center bottom" },
    tall: { src: "/hero/castello-tutti-tall.jpg", position: "center bottom" },
  },
];

// Un giorno qualunque da cui contare: conta solo che il conto avanzi di uno al giorno.
const ROTATION_START = new Date("2026-01-01T12:00:00Z");

/**
 * La foto di un giorno: una al giorno (a Roma), a rotazione, uguale per tutti.
 * Non a ogni caricamento: la home cambierebbe faccia anche solo tornando
 * indietro da una pagina.
 */
export function heroPhotoForDay(date: Date): HeroPhoto {
  const days = romeCalendarDaysBetween(ROTATION_START, date);
  const n = HERO_PHOTOS.length;
  return HERO_PHOTOS[((days % n) + n) % n];
}

/**
 * La foto di oggi. Legge l'orologio: da chiamare sul server, non nel render di un client.
 *
 * `preview` e' la chiave di una foto (`/?foto=castello-tutti`): serve a
 * guardarne una senza aspettare il suo giorno. Una chiave sconosciuta non fa nulla.
 */
export function todaysHeroPhoto(preview?: string): HeroPhoto {
  return HERO_PHOTOS.find((p) => p.key === preview) ?? heroPhotoForDay(new Date());
}
