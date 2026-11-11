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
  return activeUserIds(sessions, now, windowDays, maxAgeSeconds).size;
}

/** Gli account di `countActiveUsers`, per contarli per famiglia. */
export function activeUserIds(
  sessions: AuthSessionRow[],
  now: Date,
  windowDays: number,
  maxAgeSeconds: number
): Set<string> {
  const maxAgeMs = maxAgeSeconds * 1000;
  const lower = now.getTime() + maxAgeMs - windowDays * DAY_MS;
  const upper = now.getTime() + maxAgeMs + DAY_MS; // tolleranza sugli orologi
  const users = new Set<string>();
  for (const s of sessions) {
    const t = s.expires.getTime();
    if (t > lower && t <= upper) users.add(s.userId);
  }
  return users;
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

// ── Coinvolgimento (UX-55) ────────────────────────────────────────────────────
//
// Ogni misura si calcola "a una data" (`asOf`): la pagina la chiede per oggi e
// per quattro settimane fa, e mostra la differenza.

/** Differenza fra due valori, `null` se uno dei due non è misurabile. */
export function metricDelta(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

export interface FamilyActivity {
  families: number;
  activeFamilies: number;
  /** Famiglie attive sulle famiglie tesserate. */
  rate: number | null;
}

/**
 * Famiglie con almeno un account attivo. `familyOf` viene da `groupFamilies`
 * (`@/lib/familyLinks`); un account attivo che non è in `familyOf` (un ospite)
 * non conta.
 */
export function computeFamilyActivity(
  familyOf: Map<string, string>,
  active: Set<string>
): FamilyActivity {
  const families = new Set(familyOf.values());
  const activeFamilies = new Set<string>();
  for (const id of active) {
    const f = familyOf.get(id);
    if (f) activeFamilies.add(f);
  }
  return {
    families: families.size,
    activeFamilies: activeFamilies.size,
    rate: ratio(activeFamilies.size, families.size),
  };
}

/** Anticipo con cui si chiede la disponibilità: il primo promemoria parte 14 giorni prima. */
export const AVAILABILITY_REMINDER_LEAD_DAYS = 14;

export interface AvailabilityEngagementRow {
  date: Date;
  createdAt: Date;
  /** Giocatori della rosa: chi dovrebbe rispondere. */
  rosterSize: number;
  /** Prima convocazione salvata (dal registro attività), se c'è. */
  firstCallupAt: Date | null;
  /** Risposte date dalla persona o da un genitore (non quelle segnate dallo staff). */
  responses: { createdAt: Date }[];
}

export interface AvailabilityEngagement {
  matches: number;
  /** Rosa che ha risposto prima della prima convocazione. */
  answeredBeforeCallupRate: number | null;
  /** Ore mediane fra l'apertura della domanda e la risposta. */
  medianResponseHours: number | null;
}

/**
 * Quanto e quanto presto si risponde. La domanda si apre alla creazione della
 * partita, o al primo promemoria se la partita è stata inserita molto prima
 * (un calendario importato a inizio stagione): altrimenti il tempo di
 * risposta misurerebbe solo quanto in anticipo si è caricato il calendario.
 * Chi risponde prima dell'apertura conta zero. Senza convocazioni la scadenza
 * è l'inizio della partita.
 */
export function computeAvailabilityEngagement(
  rows: AvailabilityEngagementRow[]
): AvailabilityEngagement {
  let expected = 0;
  let answered = 0;
  const hours: number[] = [];
  for (const m of rows) {
    const opening = Math.max(
      m.createdAt.getTime(),
      m.date.getTime() - AVAILABILITY_REMINDER_LEAD_DAYS * DAY_MS
    );
    const deadline = m.firstCallupAt?.getTime() ?? m.date.getTime();
    const inTime = m.responses.filter((r) => r.createdAt.getTime() < deadline);
    expected += m.rosterSize;
    // Risposte di chi è poi uscito dalla rosa: mai oltre il 100% per partita.
    answered += Math.min(inTime.length, m.rosterSize);
    for (const r of m.responses) {
      hours.push(Math.max(0, r.createdAt.getTime() - opening) / HOUR_MS);
    }
  }
  return {
    matches: rows.length,
    answeredBeforeCallupRate: ratio(answered, expected),
    medianResponseHours: median(hours),
  };
}

export interface RegistrationSource {
  total: number;
  byStaff: number;
  /** Iscrizioni fatte dalla persona o dal genitore (anonime comprese). */
  selfRate: number | null;
}

export function computeRegistrationSource(
  registrationIds: string[],
  staffAddedIds: Set<string>
): RegistrationSource {
  const byStaff = registrationIds.filter((id) => staffAddedIds.has(id)).length;
  return {
    total: registrationIds.length,
    byStaff,
    selfRate: ratio(registrationIds.length - byStaff, registrationIds.length),
  };
}

export interface GuestFunnelRow {
  createdAt: Date;
  /** Primo allenamento a cui si è iscritto (lui o un figlio). */
  firstTrainingAt: Date | null;
  /** Passaggio da ospite ad atleta o genitore (registro attività). */
  convertedAt: Date | null;
}

export interface GuestFunnel {
  created: number;
  trained: number;
  converted: number;
  /** Giorni mediani dalla creazione dell'account al primo allenamento. */
  medianDaysToTraining: number | null;
  /** Giorni mediani dal primo allenamento al tesseramento. */
  medianDaysToConversion: number | null;
}

/**
 * Da contatto a tesserato, per gli account ospiti creati nei `windowDays`
 * giorni prima di `asOf`. Conta solo quello che era successo a `asOf`. "Con un
 * allenamento" vuol dire da ospite: un allenamento dopo il tesseramento non è
 * un passo dell'imbuto.
 */
export function computeGuestFunnel(
  rows: GuestFunnelRow[],
  asOf: Date,
  windowDays: number
): GuestFunnel {
  const t = asOf.getTime();
  const from = t - windowDays * DAY_MS;
  const until = (d: Date | null) => (d && d.getTime() <= t ? d : null);
  let created = 0;
  let trained = 0;
  let converted = 0;
  const toTraining: number[] = [];
  const toConversion: number[] = [];
  for (const r of rows) {
    const c = r.createdAt.getTime();
    if (c < from || c > t) continue;
    created += 1;
    const conv = until(r.convertedAt);
    const train = until(r.firstTrainingAt);
    const asGuest = train && (!conv || train.getTime() <= conv.getTime()) ? train : null;
    if (asGuest) {
      trained += 1;
      toTraining.push(Math.max(0, asGuest.getTime() - c) / DAY_MS);
    }
    if (conv) {
      converted += 1;
      if (asGuest) toConversion.push((conv.getTime() - asGuest.getTime()) / DAY_MS);
    }
  }
  return {
    created,
    trained,
    converted,
    medianDaysToTraining: median(toTraining),
    medianDaysToConversion: median(toConversion),
  };
}

export interface NotificationOpenRow {
  type: string;
  pushSent: number;
  pushOpened: number;
  /** Notifiche in-app indirizzate a una persona, e quante lette. */
  inAppSent: number;
  inAppRead: number;
}

export interface NotificationOpenStat extends NotificationOpenRow {
  pushRate: number | null;
  inAppRate: number | null;
}

/**
 * Tabella delle aperture per tipo, dalla quota di push aperte più bassa: in
 * cima le candidate da tagliare. I tipi senza push inviate stanno in fondo.
 */
export function computeNotificationOpens(rows: NotificationOpenRow[]): NotificationOpenStat[] {
  return rows
    .map((r) => ({
      ...r,
      pushRate: ratio(r.pushOpened, r.pushSent),
      inAppRate: ratio(r.inAppRead, r.inAppSent),
    }))
    .sort((a, b) => {
      if (a.pushRate === null || b.pushRate === null) {
        return (
          Number(a.pushRate === null) - Number(b.pushRate === null) || b.inAppSent - a.inAppSent
        );
      }
      return a.pushRate - b.pushRate || b.pushSent - a.pushSent;
    });
}

/** Quota complessiva di push aperte. */
export function overallPushOpenRate(rows: NotificationOpenRow[]): number | null {
  const sent = rows.reduce((n, r) => n + r.pushSent, 0);
  const opened = rows.reduce((n, r) => n + r.pushOpened, 0);
  return ratio(opened, sent);
}

// ── Visite dalle condivisioni (UX-56) ───────────────────────────────────────

export interface ShareVisitRow {
  day: Date;
  campaign: string;
  source: string;
  visits: number;
}

export interface ShareVisitByCampaign {
  campaign: string;
  total: number;
  whatsapp: number;
  link: number;
  qr: number;
}

export interface ShareVisitSummary {
  total: number;
  previousTotal: number;
  /** Ultimo periodo, dalla campagna che porta più visite. */
  byCampaign: ShareVisitByCampaign[];
}

/**
 * Divide le righe di `ShareVisitStat` fra il periodo attuale (giorni da
 * `split` in poi) e quello prima, e somma l'attuale per campagna e fonte.
 */
export function summarizeShareVisits(rows: ShareVisitRow[], split: Date): ShareVisitSummary {
  const splitTime = split.getTime();
  const byCampaign = new Map<string, ShareVisitByCampaign>();
  let total = 0;
  let previousTotal = 0;
  for (const r of rows) {
    if (r.day.getTime() < splitTime) {
      previousTotal += r.visits;
      continue;
    }
    total += r.visits;
    let c = byCampaign.get(r.campaign);
    if (!c) {
      c = { campaign: r.campaign, total: 0, whatsapp: 0, link: 0, qr: 0 };
      byCampaign.set(r.campaign, c);
    }
    c.total += r.visits;
    if (r.source === "whatsapp" || r.source === "link" || r.source === "qr") {
      c[r.source] += r.visits;
    }
  }
  return {
    total,
    previousTotal,
    byCampaign: [...byCampaign.values()].sort(
      (a, b) => b.total - a.total || a.campaign.localeCompare(b.campaign)
    ),
  };
}
