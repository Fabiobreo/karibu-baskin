/**
 * Metriche d'uso per il pannello admin (KB-32), calcolate dai dati che il
 * gestionale già conserva. Nessun tracciamento aggiuntivo: il piano Hobby di
 * Vercel non registra eventi personalizzati, e quello che serve allo staff
 * (chi si iscrive, chi risponde, chi è attivo) sta già nel database.
 *
 * Qui solo calcoli puri, testabili senza database; le query sono in
 * `loadAdminMetrics.ts`. Ogni rapporto restituisce `null` quando il
 * denominatore è zero: "non misurabile" è diverso da "0%".
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Utenti attivi ─────────────────────────────────────────────────────────────

export interface AuthSessionRow {
  userId: string;
  expires: Date;
}

/**
 * Utenti distinti che hanno usato l'app negli ultimi `windowDays` giorni.
 *
 * Con il rinnovo a scorrimento, ogni uso riporta la scadenza a "uso + maxAge"
 * (al più una volta ogni `updateAge`, quindi l'errore è di un giorno). Una
 * sessione con scadenza oltre "adesso + maxAge - finestra" è stata usata dentro
 * la finestra. Le sessioni con scadenza più lontana di "adesso + maxAge" sono
 * del vecchio regime da un anno e non dicono quando sono state usate l'ultima
 * volta: si escludono invece di contarle come attive.
 */
export function countActiveUsers(
  sessions: AuthSessionRow[],
  now: Date,
  windowDays: number,
  maxAgeSeconds: number
): number {
  const maxAgeMs = maxAgeSeconds * 1000;
  const lower = now.getTime() + maxAgeMs - windowDays * DAY_MS;
  const upper = now.getTime() + maxAgeMs + DAY_MS; // tolleranza sugli orologi
  const users = new Set<string>();
  for (const s of sessions) {
    const t = s.expires.getTime();
    if (t > lower && t <= upper) users.add(s.userId);
  }
  return users.size;
}

// ── Allenamenti ───────────────────────────────────────────────────────────────

export interface TrainingRegistrationRow {
  createdAt: Date;
  attended: boolean | null;
  userId: string | null;
  childId: string | null;
  registeredAsCoach: boolean;
}

export interface TrainingSessionRow {
  date: Date;
  registrationOpenedAt: Date | null;
  managedAt: Date | null;
  registrations: TrainingRegistrationRow[];
}

export interface TrainingMetrics {
  sessions: number;
  /** Media degli atleti iscritti per allenamento (i coach iscritti come allenatori non contano). */
  avgAthletes: number | null;
  /** Presenti sul totale delle presenze segnate: chi non è stato segnato non entra nel conto. */
  attendanceRate: number | null;
  /** Iscrizioni arrivate entro 24 ore dall'apertura, sulle sessioni con data di apertura nota. */
  within24hRate: number | null;
  /** Iscrizioni senza account (anonime). */
  anonymousRate: number | null;
  /** Allenamenti chiusi dallo staff entro 48 ore dall'inizio. */
  concludedWithin48hRate: number | null;
}

export function computeTrainingMetrics(rows: TrainingSessionRow[]): TrainingMetrics {
  let athletes = 0;
  let marked = 0;
  let present = 0;
  let timed = 0;
  let early = 0;
  let anonymous = 0;
  let concludedFast = 0;

  for (const s of rows) {
    const regs = s.registrations.filter((r) => !r.registeredAsCoach);
    athletes += regs.length;
    for (const r of regs) {
      if (r.attended !== null) {
        marked += 1;
        if (r.attended) present += 1;
      }
      if (!r.userId && !r.childId) anonymous += 1;
      if (s.registrationOpenedAt) {
        timed += 1;
        if (r.createdAt.getTime() - s.registrationOpenedAt.getTime() <= DAY_MS) early += 1;
      }
    }
    if (s.managedAt && s.managedAt.getTime() - s.date.getTime() <= 2 * DAY_MS) {
      concludedFast += 1;
    }
  }

  return {
    sessions: rows.length,
    avgAthletes: ratio(athletes, rows.length),
    attendanceRate: ratio(present, marked),
    within24hRate: ratio(early, timed),
    anonymousRate: ratio(anonymous, athletes),
    concludedWithin48hRate: ratio(concludedFast, rows.length),
  };
}

// ── Partite ───────────────────────────────────────────────────────────────────

export interface MatchAvailabilityRow {
  date: Date;
  /** Membri della squadra: chi dovrebbe dichiarare la disponibilità. */
  teamMembers: number;
  availabilities: { createdAt: Date }[];
}

export interface MatchMetrics {
  matches: number;
  /** Disponibilità dichiarate sul totale atteso (membri della squadra per partita). */
  responseRate: number | null;
  /** Anticipo mediano della risposta, in giorni prima della partita. */
  medianLeadDays: number | null;
}

export function computeMatchMetrics(rows: MatchAvailabilityRow[]): MatchMetrics {
  let expected = 0;
  let responses = 0;
  const leads: number[] = [];
  for (const m of rows) {
    expected += m.teamMembers;
    // Una squadra può avere risposte di giocatori poi usciti dalla rosa: il
    // tasso non supera mai il 100% per partita.
    responses += Math.min(m.availabilities.length, m.teamMembers);
    for (const a of m.availabilities) {
      leads.push((m.date.getTime() - a.createdAt.getTime()) / DAY_MS);
    }
  }
  return {
    matches: rows.length,
    responseRate: ratio(responses, expected),
    medianLeadDays: median(leads),
  };
}
