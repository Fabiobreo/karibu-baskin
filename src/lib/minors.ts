/**
 * Tutela dei minori nelle superfici pubbliche (ricerca, sitemap, profili).
 *
 * Due regole, perché i due tipi di soggetto partono da presupposti opposti.
 *
 * **`User`** — account autonomo. È minorenne se ha una `birthDate` sotto i 18
 * anni; senza data di nascita è trattato come adulto, perché un account creato
 * da sé appartiene di norma a un adulto e il campo è facoltativo.
 *
 * **`Child`** — anagrafica gestita da un genitore. È minorenne per default:
 * un record `Child` esiste **perché** l'atleta è gestito da qualcun altro, e
 * l'assenza della data di nascita non è una prova di maggiore età, è un dato
 * mancante. Il default precedente (assente = adulto) rendeva la tutela inerte
 * proprio sui soggetti per cui era stata scritta: bastava non compilare un
 * campo facoltativo perché un figlio finisse in ricerca pubblica con nome e
 * ruolo Baskin. Un `Child` con `birthDate` che lo colloca sopra i 18 anni resta
 * escluso dalla regola: è un adulto che non ha un account, non un minore.
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

/**
 * Filtro Prisma per `Child`: seleziona solo chi è dimostrabilmente maggiorenne.
 * A differenza di `notMinorFilter`, l'assenza di `birthDate` **esclude** il
 * record invece di includerlo.
 */
export function notMinorFilterChild(now: Date = new Date()) {
  return { birthDate: { not: null, lte: adultCutoffDate(now) } };
}

/**
 * Variante di `isMinor` per i `Child`: senza una data di nascita leggibile è
 * minorenne. Anche una data non parsabile ricade qui — è un dato mancante, non
 * una prova di maggiore età.
 */
export function isMinorChild(birthDate: Date | string | null | undefined, now: Date = new Date()) {
  if (!birthDate) return true;
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) return true;
  return isMinor(d, now);
}

/** True se la data di nascita indica una persona sotto i 18 anni. */
export function isMinor(birthDate: Date | string | null | undefined, now: Date = new Date()) {
  if (!birthDate) return false;
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) return false;
  return d > adultCutoffDate(now);
}
