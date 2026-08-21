/**
 * Tutela dei minori nelle superfici pubbliche (ricerca, sitemap, profili).
 *
 * Regola unica condivisa: un atleta è considerato minorenne se ha una
 * `birthDate` che lo colloca sotto i 18 anni. Chi non ha `birthDate` viene
 * trattato come adulto — non si può provare il contrario e la data di nascita
 * è un campo opzionale.
 *
 * Usato da:
 *  - `/api/search`  → esclude i minorenni dai risultati
 *  - `sitemap.ts`   → non indicizza i profili dei minorenni
 *  - `/giocatori/[slug]` → `noindex` + data di nascita nascosta
 */

/** Data di nascita limite: chi è nato entro questa data è maggiorenne. */
export function adultCutoffDate(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return cutoff;
}

/**
 * Filtro Prisma riutilizzabile: seleziona solo i non-minorenni.
 * Applicabile a `User` e `Child` (entrambi hanno `birthDate`).
 */
export function notMinorFilter(now: Date = new Date()) {
  return {
    OR: [{ birthDate: null }, { birthDate: { lte: adultCutoffDate(now) } }],
  };
}

/** True se la data di nascita indica una persona sotto i 18 anni. */
export function isMinor(birthDate: Date | string | null | undefined, now: Date = new Date()) {
  if (!birthDate) return false;
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) return false;
  return d > adultCutoffDate(now);
}
