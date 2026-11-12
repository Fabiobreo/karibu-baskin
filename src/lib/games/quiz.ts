import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import { seededShuffle, stringToSeed } from "@/lib/seededRandom";

/**
 * Regole del quiz del Baskin (UX-61), pure e testate: quali domande escono,
 * il codice della sfida, il punteggio scritto nel link.
 */

export const EASY_PER_ROUND = 3;
export const MEDIUM_PER_ROUND = 2;
export const QUIZ_LENGTH = EASY_PER_ROUND + MEDIUM_PER_ROUND;

/** Lunghezza massima del codice di sfida letto dal link. */
const MAX_CODE_LENGTH = 32;

/** Domande già fatte in questa visita (`sessionStorage`), per non ripeterle. */
export const QUIZ_SEEN_STORAGE_KEY = "karibu-quiz-seen";

/**
 * Le 5 domande di una partita: prima 3 facili, poi 2 medie. Con lo stesso seme
 * escono le stesse domande, nello stesso ordine, in tutte e due le lingue: è
 * così che funziona la sfida.
 */
export function pickRound(bank: readonly QuizQuestion[], seed: number): QuizQuestion[] {
  const pick = (level: QuizQuestion["level"], count: number, salt: string) =>
    seededShuffle(
      bank.filter((q) => q.level === level),
      stringToSeed(`${seed}-${salt}`)
    ).slice(0, count);
  return [...pick("facile", EASY_PER_ROUND, "easy"), ...pick("medio", MEDIUM_PER_ROUND, "medium")];
}

/** Tentativi per trovare un codice con domande nuove: calcolo puro, istantaneo. */
const FRESH_CODE_TRIES = 600;

/**
 * Ogni partita nasce da un codice, così "Sfida un amico" manda le stesse
 * domande appena fatte. Per non ripetere si provano dei codici e si tiene
 * quello che ripete meno: mai (salvo sfortuna estrema) le domande della
 * partita appena finita (`last`), il meno possibile quelle già viste (`seen`).
 */
export function pickFreshCode(
  bank: readonly QuizQuestion[],
  seen: ReadonlySet<string>,
  last: ReadonlySet<string> = new Set(),
  random: () => number = Math.random
): string {
  let best = "";
  let bestCost = Infinity;
  for (let i = 0; i < FRESH_CODE_TRIES && bestCost > 0; i++) {
    const code = newChallengeCode(random);
    const round = pickRound(bank, challengeSeed(code));
    const cost = round.reduce(
      (sum, q) => sum + (last.has(q.id) ? 100 : 0) + (seen.has(q.id) ? 1 : 0),
      0
    );
    if (cost < bestCost) {
      best = code;
      bestCost = cost;
    }
  }
  return best;
}

/**
 * Domande viste dopo una partita. Quando per un livello non ne restano
 * abbastanza di nuove per la partita dopo, si ricomincia da capo (tenendo
 * solo quelle appena fatte, che non escono subito di nuovo).
 */
export function nextSeen(
  bank: readonly QuizQuestion[],
  seen: ReadonlySet<string>,
  played: readonly QuizQuestion[]
): Set<string> {
  const next = new Set([...seen, ...played.map((q) => q.id)]);
  const freshLeft = (level: QuizQuestion["level"]) =>
    bank.filter((q) => q.level === level && !next.has(q.id)).length;
  if (freshLeft("facile") < EASY_PER_ROUND || freshLeft("medio") < MEDIUM_PER_ROUND) {
    return new Set(played.map((q) => q.id));
  }
  return next;
}

/** Seme di una partita di sfida: qualunque codice dà 5 domande valide. */
export function challengeSeed(code: string): number {
  return stringToSeed(`sfida-${code}`);
}

/** Codice della sfida letto dal link (`?sfida=`): `null` se manca o è vuoto. */
export function parseChallengeCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().slice(0, MAX_CODE_LENGTH);
  return code.length > 0 ? code : null;
}

/** Punteggio di chi ha sfidato (`&p=`): solo un intero da 0 a 5. */
export function parseChallengeScore(raw: string | null | undefined): number | null {
  if (raw == null || !/^\d$/.test(raw)) return null;
  const n = Number(raw);
  return n <= QUIZ_LENGTH ? n : null;
}

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Codice corto e leggibile per un link di sfida, fatto nel browser. */
export function newChallengeCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Percorso del link di sfida; il punteggio c'è solo se chi condivide lo vuole. */
export function challengePath(code: string, score: number | null): string {
  const params = new URLSearchParams({ sfida: code });
  if (score !== null) params.set("p", String(score));
  return `/giochi/quiz?${params.toString()}`;
}

/** Il punteggio non è mai "basso": tre toni, dallo 0 al 5. */
export function scoreTone(score: number): "perfect" | "good" | "learned" {
  if (score >= QUIZ_LENGTH) return "perfect";
  if (score >= 3) return "good";
  return "learned";
}
