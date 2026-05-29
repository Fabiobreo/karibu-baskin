// ── Rating engine (orchestratore TrueSkill per le partitelle) ────────────────
//
// Trasforma i risultati delle partitelle (TrainingMatchResult) in aggiornamenti
// dei rating μ/σ dei giocatori. La libreria `trueskill.ts` resta pura: qui vive
// la logica applicativa (margin of victory, snapshot dei roster, replay).
//
// Modello di consistenza: il rating di un giocatore è funzione PURA del log
// ordinato delle partitelle a cui ha partecipato. Per restare sempre coerenti
// dopo create / modifica / cancellazione di un risultato, ricalcoliamo (replay)
// dall'inizio. Le partitelle sono poche (qualche decina a stagione), quindi il
// replay è banale e si elimina ogni rischio di update "fuori ordine".
//
// NB Fase 1: il replay considera SOLO le partitelle. Il segnale secondario del
// campionato (W/L ufficiali) e gli eventi ROLE_CHANGE verranno fusi nello stesso
// log cronologico in una fase successiva.

import { Prisma, type PrismaClient, type RatingUpdateReason } from "@prisma/client";
import { defaultRating, rate2Draw, rate2Win, type Rating, TRUESKILL } from "./trueskill";

/** Client Prisma o transazione interattiva. */
type Db = PrismaClient | Prisma.TransactionClient;

/** Riferimento a un giocatore valutabile (account o figlio). Anonimi esclusi. */
export interface PlayerRef {
  userId?: string | null;
  childId?: string | null;
  name: string;
}

/** Snapshot congelato delle due squadre di una partitella. teamA ↔ scoreA. */
export interface RostersSnapshot {
  teamA: PlayerRef[];
  teamB: PlayerRef[];
}

// ── Margin of victory ─────────────────────────────────────────────────────────

// Scala dei margini nel baskin (i punteggi sono alti):
//   diff ≤ 4   → partita combattuta  (segnale debole sulla differenza di skill)
//   diff ~ 10  → partita equilibrata
//   diff ~ 18  → superiorità
//   diff > 18  → supremazia          (segnale forte; peso verso il massimo)

/** Differenza punti a cui il peso raggiunge il massimo (1.0). Tunable. */
const MOV_FULL_MARGIN = 24;
/** Peso minimo di una vittoria combattuta (~1 punto). Tunable. */
const MOV_BASE_WEIGHT = 0.5;

/**
 * Peso dell'update in [MOV_BASE_WEIGHT, 1] in funzione del margine.
 * Cresce linearmente col margine e satura a 1.0 sui distacchi da supremazia
 * (≥ MOV_FULL_MARGIN). Indicativamente: ~4 → 0.58, ~10 → 0.71, ~18 → 0.88,
 * ≥24 → 1.0.
 */
export function movWeight(scoreWin: number, scoreLose: number): number {
  const diff = Math.abs(scoreWin - scoreLose);
  const w = MOV_BASE_WEIGHT + (1 - MOV_BASE_WEIGHT) * Math.min(1, diff / MOV_FULL_MARGIN);
  return Math.min(1, Math.max(MOV_BASE_WEIGHT, w));
}

// ── Chiave giocatore (per il replay in memoria) ───────────────────────────────

type PlayerKey = `u:${string}` | `c:${string}`;

function keyOf(ref: PlayerRef): PlayerKey | null {
  if (ref.userId) return `u:${ref.userId}`;
  if (ref.childId) return `c:${ref.childId}`;
  return null; // anonimo → non valutato
}

function splitKey(key: PlayerKey): { kind: "u" | "c"; id: string } {
  const idx = key.indexOf(":");
  return { kind: key.slice(0, idx) as "u" | "c", id: key.slice(idx + 1) };
}

// ── Costruzione snapshot dal JSON `teams` della sessione ──────────────────────

/** Forma minima di un atleta dentro TrainingSession.teams (id = Registration.id). */
interface TeamAthlete {
  id: string;
  name: string;
}
interface TeamsJson {
  teamA?: TeamAthlete[];
  teamB?: TeamAthlete[];
  teamC?: TeamAthlete[];
}

/** Mappa Registration.id → { userId, childId } per risolvere gli atleti. */
export type RegistrationRefMap = Map<string, { userId: string | null; childId: string | null }>;

/**
 * Congela le due squadre coinvolte in un matchup risolvendo gli atleti a
 * userId/childId. Gli iscritti anonimi (né userId né childId) vengono esclusi.
 *
 * @param matchup "AB" | "AC" | "BC" | null (null ⇒ "AB", caso 2 squadre)
 */
export function buildRostersSnapshot(
  teams: TeamsJson,
  matchup: string | null | undefined,
  refs: RegistrationRefMap
): RostersSnapshot {
  const m = matchup ?? "AB";
  const pick = (letter: string): TeamAthlete[] => {
    if (letter === "A") return teams.teamA ?? [];
    if (letter === "B") return teams.teamB ?? [];
    return teams.teamC ?? [];
  };

  const resolve = (athletes: TeamAthlete[]): PlayerRef[] => {
    const out: PlayerRef[] = [];
    for (const a of athletes) {
      const ref = refs.get(a.id);
      if (!ref || (!ref.userId && !ref.childId)) continue; // anonimo / non risolto
      out.push({ userId: ref.userId, childId: ref.childId, name: a.name });
    }
    return out;
  };

  return {
    teamA: resolve(pick(m[0] ?? "A")),
    teamB: resolve(pick(m[1] ?? "B")),
  };
}

// ── Replay in memoria ─────────────────────────────────────────────────────────

export interface ReplayEvent {
  snapshot: RostersSnapshot;
  scoreA: number;
  scoreB: number;
  /** Id del TrainingMatchResult sorgente (per lo storico). */
  sourceId?: string;
  /** Timestamp dell'evento (per ordinare le curve nello storico). */
  at?: Date;
}

export interface LogEntry {
  key: PlayerKey;
  reason: RatingUpdateReason;
  sourceId?: string;
  at?: Date;
  muBefore: number;
  sigmaBefore: number;
  muAfter: number;
  sigmaAfter: number;
}

export interface ReplayResult {
  /** Rating finale per ogni giocatore visto nel log. */
  ratings: Map<PlayerKey, Rating>;
  /** Variazioni in ordine cronologico (storico per le curve). */
  log: LogEntry[];
}

/** σ a cui si rigonfia l'incertezza dopo un cambio di categoria (μ invariato). */
const ROLE_CHANGE_SIGMA = TRUESKILL.SIGMA;

/** Evento "cambio categoria" di un giocatore (fonte: SportRoleHistory). */
export interface RoleChangeEvent {
  kind: "role";
  key: PlayerKey;
  sourceId?: string;
  at?: Date;
}
/** Evento "partitella". */
export interface MatchEvent extends ReplayEvent {
  kind: "match";
}
export type TimelineEvent = MatchEvent | RoleChangeEvent;

/**
 * Replay puro di una timeline ordinata di eventi (partitelle + cambi categoria).
 * Ogni giocatore parte da `defaultRating()` la prima volta che compare.
 *
 * Cambio categoria: NON è la prima assegnazione di ruolo e il giocatore è già
 * valutato ⇒ μ invariato, σ rigonfiato a `ROLE_CHANGE_SIGMA` (max con σ corrente,
 * così non si abbassa mai). La prima assegnazione di ruolo non gonfia nulla.
 */
export function replayTimeline(events: TimelineEvent[]): ReplayResult {
  const ratings = new Map<PlayerKey, Rating>();
  const log: LogEntry[] = [];
  const seenRole = new Set<PlayerKey>(); // chi ha già avuto un'assegnazione di ruolo
  const get = (k: PlayerKey): Rating => ratings.get(k) ?? defaultRating();

  for (const ev of events) {
    if (ev.kind === "role") {
      const first = !seenRole.has(ev.key);
      seenRole.add(ev.key);
      if (first) continue; // prima assegnazione di ruolo → nessun gonfiaggio
      const r = ratings.get(ev.key);
      if (!r) continue; // non ancora valutato → nessun effetto
      const newSigma = Math.max(r.sigma, ROLE_CHANGE_SIGMA);
      if (newSigma === r.sigma) continue; // già al massimo
      log.push({
        key: ev.key,
        reason: "ROLE_CHANGE",
        sourceId: ev.sourceId,
        at: ev.at,
        muBefore: r.mu,
        sigmaBefore: r.sigma,
        muAfter: r.mu,
        sigmaAfter: newSigma,
      });
      ratings.set(ev.key, { mu: r.mu, sigma: newSigma });
      continue;
    }

    // Partitella
    const aKeys = ev.snapshot.teamA.map(keyOf).filter((k): k is PlayerKey => k !== null);
    const bKeys = ev.snapshot.teamB.map(keyOf).filter((k): k is PlayerKey => k !== null);
    // Servono giocatori valutabili in entrambe le squadre, altrimenti nessun segnale.
    if (aKeys.length === 0 || bKeys.length === 0) continue;

    const aBefore = aKeys.map(get);
    const bBefore = bKeys.map(get);
    const isDraw = ev.scoreA === ev.scoreB;
    const weight = isDraw ? 1 : movWeight(ev.scoreA, ev.scoreB);

    let aAfter: Rating[];
    let bAfter: Rating[];
    if (isDraw) {
      const res = rate2Draw(aBefore, bBefore, { weight });
      aAfter = res.teamA;
      bAfter = res.teamB;
    } else if (ev.scoreA > ev.scoreB) {
      const res = rate2Win(aBefore, bBefore, { weight });
      aAfter = res.winners;
      bAfter = res.losers;
    } else {
      const res = rate2Win(bBefore, aBefore, { weight });
      bAfter = res.winners;
      aAfter = res.losers;
    }

    const record = (keys: PlayerKey[], before: Rating[], after: Rating[]) => {
      keys.forEach((k, i) => {
        log.push({
          key: k,
          reason: "TRAINING_MATCH",
          sourceId: ev.sourceId,
          at: ev.at,
          muBefore: before[i].mu,
          sigmaBefore: before[i].sigma,
          muAfter: after[i].mu,
          sigmaAfter: after[i].sigma,
        });
        ratings.set(k, after[i]);
      });
    };
    record(aKeys, aBefore, aAfter);
    record(bKeys, bBefore, bAfter);
  }

  return { ratings, log };
}

/**
 * Replay delle sole partitelle (wrapper di compatibilità per i test e gli usi
 * che non hanno bisogno dei cambi categoria).
 */
export function replayTrainingEvents(events: ReplayEvent[]): ReplayResult {
  return replayTimeline(events.map((e) => ({ kind: "match", ...e })));
}

// ── Persistenza: ricalcolo completo dei rating dalle partitelle ───────────────

function parseSnapshot(value: Prisma.JsonValue | null): RostersSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (!Array.isArray(s.teamA) || !Array.isArray(s.teamB)) return null;
  return { teamA: s.teamA as PlayerRef[], teamB: s.teamB as PlayerRef[] };
}

/** Reason gestiti dal replay (riscritti ad ogni ricalcolo). */
const REPLAY_REASONS: RatingUpdateReason[] = ["TRAINING_MATCH", "ROLE_CHANGE"];

/**
 * Ricalcola da zero i rating di tutti i giocatori replayando la timeline
 * completa — partitelle (con snapshot) + cambi categoria (da SportRoleHistory) —
 * in ordine cronologico, e riscrive lo storico RatingUpdate. Idempotente.
 * Da chiamare dopo ogni create/update/delete di un risultato e dopo un cambio
 * di ruolo confermato.
 *
 * NB: ricalcola i rating solo dei giocatori presenti nella timeline; chi non ha
 * mai giocato una partitella resta `null` (unrated). Il cambio categoria dei
 * figli (Child) non è coperto: non esiste uno storico ruoli per i figli.
 */
export async function recomputeRatings(db: Db): Promise<void> {
  // Json nullable non supporta un filtro "NOT null" diretto: prendiamo tutti i
  // risultati e scartiamo quelli senza snapshot via parseSnapshot (null → skip).
  const [results, roleHistory] = await Promise.all([
    db.trainingMatchResult.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, scoreA: true, scoreB: true, rostersSnapshot: true, createdAt: true },
    }),
    db.sportRoleHistory.findMany({
      orderBy: [{ changedAt: "asc" }, { id: "asc" }],
      select: { id: true, userId: true, childId: true, changedAt: true },
    }),
  ]);

  const timeline: TimelineEvent[] = [];
  for (const r of results) {
    const snap = parseSnapshot(r.rostersSnapshot);
    if (snap) {
      timeline.push({
        kind: "match",
        snapshot: snap,
        scoreA: r.scoreA,
        scoreB: r.scoreB,
        sourceId: r.id,
        at: r.createdAt,
      });
    }
  }
  for (const h of roleHistory) {
    const key: PlayerKey | null = h.userId ? `u:${h.userId}` : h.childId ? `c:${h.childId}` : null;
    if (key) timeline.push({ kind: "role", key, sourceId: h.id, at: h.changedAt });
  }

  // Ordine cronologico; a parità di istante la partitella precede il cambio ruolo
  // (così un cambio nello stesso momento agisce sul rating già aggiornato).
  timeline.sort((a, b) => {
    const ta = a.at?.getTime() ?? 0;
    const tb = b.at?.getTime() ?? 0;
    if (ta !== tb) return ta - tb;
    return (a.kind === "match" ? 0 : 1) - (b.kind === "match" ? 0 : 1);
  });

  const { ratings, log } = replayTimeline(timeline);

  // Persisti i rating finali sui giocatori che compaiono nella timeline.
  for (const [key, rating] of ratings) {
    const { kind, id } = splitKey(key);
    if (kind === "u") {
      await db.user.update({
        where: { id },
        data: { ratingMu: rating.mu, ratingSigma: rating.sigma },
      });
    } else {
      await db.child.update({
        where: { id },
        data: { ratingMu: rating.mu, ratingSigma: rating.sigma },
      });
    }
  }

  // Riscrivi lo storico (curve del Development Tracker).
  await db.ratingUpdate.deleteMany({ where: { reason: { in: REPLAY_REASONS } } });
  if (log.length > 0) {
    await db.ratingUpdate.createMany({
      data: log.map((e) => {
        const { kind, id } = splitKey(e.key);
        return {
          userId: kind === "u" ? id : null,
          childId: kind === "c" ? id : null,
          reason: e.reason,
          muBefore: e.muBefore,
          sigmaBefore: e.sigmaBefore,
          muAfter: e.muAfter,
          sigmaAfter: e.sigmaAfter,
          sourceId: e.sourceId ?? null,
          ...(e.at ? { createdAt: e.at } : {}),
        };
      }),
    });
  }
}

// Re-export di comodo per i consumer.
export { TRUESKILL };
