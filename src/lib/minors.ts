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
 *  - `/giocatori/[slug]` → `noindex` (la data di nascita non è mai pubblica, per nessuno)
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

// ── Superfici pubbliche ─────────────────────────────────────────────────────

interface BirthDated {
  birthDate?: Date | string | null;
}

/**
 * Record che riferisce un giocatore come User o come Child: statistiche,
 * convocazioni, MVP, appartenenze a una squadra.
 */
export interface PlayerSubject {
  user?: BirthDated | null;
  child?: BirthDated | null;
}

/** Minore secondo la regola del tipo di soggetto (vedi l'intestazione del file). */
export function isMinorSubject(s: PlayerSubject, now: Date = new Date()): boolean {
  if (s.child) return isMinorChild(s.child.birthDate, now);
  if (s.user) return isMinor(s.user.birthDate, now);
  return false;
}

function withoutBirthDate<U extends BirthDated | null | undefined>(u: U): U {
  if (!u) return u;
  const copy = { ...u } as BirthDated;
  delete copy.birthDate;
  return copy as U;
}

/**
 * Prepara una lista di giocatori per una superficie visibile al pubblico.
 *
 * Due operazioni, entrambe necessarie:
 * - per chi non è tesserato toglie i minori (il ruolo Baskin degli adulti resta);
 * - per tutti toglie `birthDate`. La data di nascita viene letta solo per
 *   decidere chi è minore: se restasse nell'oggetto, passando a un componente
 *   client finirebbe nel payload della pagina, e le date di nascita di tutti
 *   i giocatori, adulti compresi, arriverebbero al browser.
 */
export function publicSubjects<T extends PlayerSubject>(
  items: T[],
  viewerIsMember: boolean,
  now: Date = new Date()
): T[] {
  return items
    .filter((s) => viewerIsMember || !isMinorSubject(s, now))
    .map((s) => ({ ...s, user: withoutBirthDate(s.user), child: withoutBirthDate(s.child) }) as T);
}
