import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import { seededShuffle, stringToSeed } from "@/lib/seededRandom";

/**
 * Regole della partita di un quiz (UX-61, UX-67), pure e testate: quali
 * domande escono, il codice della sfida, il punteggio scritto nel link.
 */

/** Domande per partita di un quiz che non dice altro. */
export const DEFAULT_QUIZ_LENGTH = 5;
/** Domande per partita che l'admin può scegliere per un quiz. */
export const MIN_QUIZ_LENGTH = 3;
export const MAX_QUIZ_LENGTH = 10;
/** Quota delle facili in una partita: 3 su 5, 5 su 8. */
const EASY_SHARE = 0.6;

/** Lunghezza massima del codice di sfida letto dal link. */
const MAX_CODE_LENGTH = 32;

/** Domande già fatte in questa visita (`sessionStorage`), per quiz, per non ripeterle. */
export function quizSeenStorageKey(quizId: string): string {
  return `karibu-quiz-seen:${quizId}`;
}

/**
 * Quante facili e quante medie in una partita di `length` domande: il 60% di
 * facili (3 su 5), il resto medie; se un livello non basta si completa con
 * l'altro (un quiz piccolo prende quelle che ha).
 */
export function roundShape(
  bank: readonly QuizQuestion[],
  length: number = DEFAULT_QUIZ_LENGTH
): { facile: number; medio: number } {
  const easyAvail = bank.filter((q) => q.level === "facile").length;
  const mediumAvail = bank.length - easyAvail;
  const easyWanted = Math.round(length * EASY_SHARE);
  let facile = Math.min(easyWanted, easyAvail);
  let medio = Math.min(length - easyWanted, mediumAvail);
  facile += Math.min(easyAvail - facile, length - facile - medio);
  medio += Math.min(mediumAvail - medio, length - facile - medio);
  return { facile, medio };
}

/**
 * Le domande di una partita: `length` (o tutte, se sono meno), prima le
 * facili e poi le medie. Con lo stesso seme e le stesse domande escono le
 * stesse, nello stesso ordine: è così che funziona la sfida. La banca va
 * ordinata sempre allo stesso modo (per id).
 */
export function pickRound(
  bank: readonly QuizQuestion[],
  seed: number,
  length: number = DEFAULT_QUIZ_LENGTH
): QuizQuestion[] {
  const shape = roundShape(bank, length);
  const pick = (level: QuizQuestion["level"], salt: string) =>
    seededShuffle(
      bank.filter((q) => q.level === level),
      stringToSeed(`${seed}-${salt}`)
    ).slice(0, shape[level]);
  return [...pick("facile", "easy"), ...pick("medio", "medium")];
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
  length: number = DEFAULT_QUIZ_LENGTH,
  random: () => number = Math.random
): string {
  let best = "";
  let bestCost = Infinity;
  for (let i = 0; i < FRESH_CODE_TRIES && bestCost > 0; i++) {
    const code = newChallengeCode(random);
    const round = pickRound(bank, challengeSeed(code), length);
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
  played: readonly QuizQuestion[],
  length: number = DEFAULT_QUIZ_LENGTH
): Set<string> {
  const next = new Set([...seen, ...played.map((q) => q.id)]);
  const shape = roundShape(bank, length);
  const freshLeft = (level: QuizQuestion["level"]) =>
    bank.filter((q) => q.level === level && !next.has(q.id)).length;
  if (freshLeft("facile") < shape.facile || freshLeft("medio") < shape.medio) {
    return new Set(played.map((q) => q.id));
  }
  return next;
}

/** Seme di una partita di sfida: qualunque codice dà una partita valida. */
export function challengeSeed(code: string): number {
  return stringToSeed(`sfida-${code}`);
}

/** Codice della sfida letto dal link (`?sfida=`): `null` se manca o è vuoto. */
export function parseChallengeCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().slice(0, MAX_CODE_LENGTH);
  return code.length > 0 ? code : null;
}

/** Punteggio di chi ha sfidato (`&p=`): solo un intero da 0 a `max`. */
export function parseChallengeScore(
  raw: string | null | undefined,
  max: number = DEFAULT_QUIZ_LENGTH
): number | null {
  if (raw == null || !/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= max ? n : null;
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

/** Indirizzo di un quiz (UX-67). */
export function quizPath(slug: string): string {
  return `/giochi/quiz/${slug}`;
}

/** Percorso del link di sfida; il punteggio c'è solo se chi condivide lo vuole. */
export function challengePath(slug: string, code: string, score: number | null): string {
  const params = new URLSearchParams({ sfida: code });
  if (score !== null) params.set("p", String(score));
  return `${quizPath(slug)}?${params.toString()}`;
}

/**
 * Il punteggio non è mai "basso": tre toni. Tutte giuste; almeno il 60%
 * (3 su 5, 5 su 8); sotto, "hai imparato qualcosa".
 */
export function scoreTone(score: number, total: number): "perfect" | "good" | "learned" {
  if (total > 0 && score >= total) return "perfect";
  if (score >= Math.ceil(total * 0.6)) return "good";
  return "learned";
}

/** Varianti di ogni frase di fine partita, nei dizionari (`tonePerfect1`…). */
export const TONE_VARIANTS = { perfect: 3, good: 3, learned: 3 } as const;
/** Varianti del messaggio di "Sfida un amico" (`waWithScore1`…, `waNoScore1`…). */
export const SHARE_VARIANTS = { withScore: 2, noScore: 1 } as const;

/**
 * Quale variante di una frase usare (1…`count`): a caso, ma presa dal codice
 * della partita, così ricaricando la pagina la frase non cambia.
 */
export function pickVariant(code: string, salt: string, count: number): number {
  return (stringToSeed(`${salt}-${code}`) % count) + 1;
}
