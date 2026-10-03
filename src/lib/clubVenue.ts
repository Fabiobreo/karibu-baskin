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

/** Dati di una partita che servono a dire dove si gioca. */
export interface MatchLocationInput {
  isHome: boolean;
  venue?: string | null;
  /** Avversaria esterna: il suo indirizzo vale in trasferta senza `venue`. */
  opponent?: { address?: string | null; city?: string | null } | null;
  /** Amichevole interna (due squadre nostre): si gioca alla sede del club. */
  internal?: boolean;
}

/**
 * Dove si gioca una partita (UX-50).
 * - `club`: la sede del club (`label` = CLUB_VENUE_LABEL);
 * - `venue`: il campo scritto dallo staff sulla partita;
 * - `opponent`: indirizzo e citta' dell'avversaria (trasferta senza `venue`);
 * - `unknown`: nessun dato, `label` null ("Luogo da confermare", niente Maps).
 */
export type MatchLocation =
  | { kind: "club" | "venue" | "opponent"; label: string }
  | { kind: "unknown"; label: null };

/**
 * Luogo di una partita: una fonte sola per hero, blocco "Dove e quando",
 * dati strutturati e calendario (.ics singolo e feed).
 */
export function matchLocation(m: MatchLocationInput): MatchLocation {
  const venue = m.venue?.trim();
  if (venue) return { kind: "venue", label: venue };
  if (m.isHome || m.internal) return { kind: "club", label: CLUB_VENUE_LABEL };
  const address = m.opponent?.address?.trim();
  if (address) {
    const city = m.opponent?.city?.trim();
    const label = city && !endsWithCity(address, city) ? `${address}, ${city}` : address;
    return { kind: "opponent", label };
  }
  return { kind: "unknown", label: null };
}

/**
 * Luogo in breve, per la riga dell'hero quando sotto c'e' il blocco "Dove e
 * quando" con l'indirizzo intero: la citta' della sede o dell'avversaria, il
 * nome del campo scritto dallo staff (primo segmento). Null se da confermare.
 */
export function matchPlaceShort(
  m: Pick<MatchLocationInput, "opponent">,
  location: MatchLocation
): string | null {
  switch (location.kind) {
    case "club":
      return CLUB_VENUE.city;
    case "opponent":
      return m.opponent?.city?.trim() || firstSegment(location.label);
    case "venue":
      return firstSegment(location.label);
    default:
      return null;
  }
}

function firstSegment(label: string): string {
  return label.split(",")[0].trim() || label;
}

/** Minuscole, senza accenti e senza punteggiatura, parole separate da uno spazio. */
function normalizeWords(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * L'indirizzo dice gia' la citta'? Conta solo l'ultimo segmento (dopo l'ultima
 * virgola), dove si scrive la citta' ("Via Roma 1, 36100 Roma"), e la citta'
 * deve comparirvi come parole intere: "Via Vicenza 3" non e' a Vicenza.
 */
function endsWithCity(address: string, city: string): boolean {
  const comma = address.lastIndexOf(",");
  if (comma < 0) return false;
  const segment = ` ${normalizeWords(address.slice(comma + 1))} `;
  const wanted = normalizeWords(city);
  return wanted.length > 0 && segment.includes(` ${wanted} `);
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
