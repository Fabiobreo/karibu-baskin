/**
 * Sede abituale degli allenamenti (UX-15). E' il luogo predefinito dei nuovi
 * allenamenti e quello mostrato quando `TrainingSession.location` e' vuoto.
 * Gli stessi dati stanno nei dati strutturati (`@/lib/structuredData`) e in
 * Contatti.
 */
export const CLUB_VENUE = {
  name: "Polisportivo Gino Cosaro",
  street: "Via del Vigo, 11",
  postalCode: "36075",
  city: "Montecchio Maggiore",
  province: "VI",
} as const;

/** Indirizzo su una riga, come si scrive in un campo "Luogo". */
export const CLUB_VENUE_LABEL = `${CLUB_VENUE.name}, ${CLUB_VENUE.street}, ${CLUB_VENUE.city}`;

/** Luogo da mostrare per un allenamento: il suo, oppure la sede del club. */
export function trainingLocation(location: string | null | undefined): string {
  const l = location?.trim();
  return l ? l : CLUB_VENUE_LABEL;
}

/** Link a Google Maps per un luogo scritto a testo (niente embed: nessun cookie). */
export function mapsSearchUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

/**
 * Sezione "Vieni a provare" in Contatti (UX-15): tutte le CTA per chi non e'
 * tesserato puntano qui. Sta in un modulo senza "use client" perche' la usano
 * anche i Server Component.
 */
export const TRY_IT_HREF = "/contatti#vieni-a-provare";
