import { describe, expect, it } from "vitest";
import type { QuizLevel, QuizQuestion } from "@/lib/content/baskinQuiz";
import {
  challengePath,
  challengeSeed,
  newChallengeCode,
  nextSeen,
  parseChallengeCode,
  parseChallengeScore,
  pickFreshCode,
  pickRound,
  QUIZ_LENGTH,
  roundShape,
  scoreTone,
} from "./quiz";

/** Banca di prova: le domande stanno nel database (UX-67). */
function makeBank(easy: number, medium: number): QuizQuestion[] {
  const q = (level: QuizLevel, i: number): QuizQuestion => ({
    id: `${level}-${String(i).padStart(2, "0")}`,
    level,
    topic: "ruoli",
    text: `Domanda ${level} ${i}`,
    answers: ["a", "b", "c"],
    correct: i % 3,
    explanation: "Perché sì.",
  });
  return [
    ...Array.from({ length: easy }, (_, i) => q("facile", i)),
    ...Array.from({ length: medium }, (_, i) => q("medio", i)),
  ];
}

// Come il quiz del Baskin: 18 facili e 22 medie.
const bank = makeBank(18, 22);

describe("pickRound", () => {
  it("dà 5 domande diverse: 3 facili e poi 2 medie", () => {
    const round = pickRound(bank, 42);
    expect(round).toHaveLength(QUIZ_LENGTH);
    expect(new Set(round.map((q) => q.id)).size).toBe(QUIZ_LENGTH);
    expect(round.map((q) => q.level)).toEqual(["facile", "facile", "facile", "medio", "medio"]);
  });

  it("con lo stesso codice di sfida e le stesse domande escono le stesse", () => {
    const seed = challengeSeed("ab3k9z");
    const a = pickRound(bank, seed).map((q) => q.id);
    const b = pickRound(bank, seed).map((q) => q.id);
    expect(b).toEqual(a);
  });

  it("un quiz piccolo completa con l'altro livello, prima le facili", () => {
    expect(roundShape(makeBank(1, 7))).toEqual({ facile: 1, medio: 4 });
    expect(roundShape(makeBank(8, 0))).toEqual({ facile: 5, medio: 0 });
    expect(pickRound(makeBank(2, 6), 7).map((q) => q.level)).toEqual([
      "facile",
      "facile",
      "medio",
      "medio",
      "medio",
    ]);
  });

  it("con meno di 5 domande le prende tutte", () => {
    expect(pickRound(makeBank(2, 1), 1)).toHaveLength(3);
  });

  it("un codice inventato dà comunque 5 domande valide", () => {
    for (const code of ["x", "!!!", "codice-lunghissimo-inventato", "😀"]) {
      const round = pickRound(bank, challengeSeed(code));
      expect(round).toHaveLength(QUIZ_LENGTH);
      expect(round.every((q) => bank.includes(q))).toBe(true);
    }
  });
});

describe("pickFreshCode", () => {
  it("sceglie un codice con domande non ancora viste", () => {
    const first = pickRound(bank, challengeSeed("primo"));
    const seen = new Set(first.map((q) => q.id));
    const code = pickFreshCode(bank, seen);
    expect(pickRound(bank, challengeSeed(code)).some((q) => seen.has(q.id))).toBe(false);
  });
});

describe("nextSeen", () => {
  it("accumula le domande fatte", () => {
    const round = pickRound(bank, 3);
    expect(nextSeen(bank, new Set(), round).size).toBe(QUIZ_LENGTH);
  });

  it("ricomincia quando non restano domande nuove, tenendo fuori quelle appena fatte", () => {
    let seen = new Set<string>();
    let last = pickRound(bank, challengeSeed(pickFreshCode(bank, seen)));
    for (let i = 1; i < 30; i++) {
      seen = nextSeen(bank, seen, last);
      const lastIds = new Set(last.map((q) => q.id));
      const next = pickRound(bank, challengeSeed(pickFreshCode(bank, seen, lastIds)));
      // Mai le stesse domande della partita appena finita.
      expect(next.some((q) => last.includes(q))).toBe(false);
      last = next;
    }
  });
});

describe("link di sfida", () => {
  it("legge il codice e il punteggio solo se validi", () => {
    expect(parseChallengeCode(null)).toBeNull();
    expect(parseChallengeCode("  ")).toBeNull();
    expect(parseChallengeCode("abc")).toBe("abc");
    expect(parseChallengeCode("a".repeat(100))).toHaveLength(32);
    expect(parseChallengeScore("4")).toBe(4);
    expect(parseChallengeScore("0")).toBe(0);
    expect(parseChallengeScore("6")).toBeNull();
    expect(parseChallengeScore("-1")).toBeNull();
    expect(parseChallengeScore("4.5")).toBeNull();
    expect(parseChallengeScore(null)).toBeNull();
  });

  it("fa codici corti e un percorso con il punteggio solo se scelto", () => {
    const code = newChallengeCode(() => 0.5);
    expect(code).toMatch(/^[a-z0-9]{6}$/);
    expect(challengePath("baskin", "abc", 4)).toBe("/giochi/quiz/baskin?sfida=abc&p=4");
    expect(challengePath("baskin", "abc", null)).toBe("/giochi/quiz/baskin?sfida=abc");
  });
});

describe("scoreTone", () => {
  it("non dice mai che un punteggio è basso", () => {
    expect(scoreTone(5)).toBe("perfect");
    expect(scoreTone(3)).toBe("good");
    expect(scoreTone(0)).toBe("learned");
  });
});
