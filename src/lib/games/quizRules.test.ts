import { describe, expect, it } from "vitest";
import {
  canEnableQuiz,
  correctRate,
  countQuestions,
  hasEnglish,
  isPlayableIn,
  missingToEnable,
  needsReview,
  quizAccess,
  playableBank,
  quizGameVisibility,
  scoreAnswers,
  type QuizQuestionRow,
} from "./quizRules";

const row = (over: Partial<QuizQuestionRow> = {}): QuizQuestionRow => ({
  id: "q1",
  status: "APPROVED",
  level: "EASY",
  topic: "ruoli",
  text: "Quanti ruoli?",
  answers: ["3", "5", "7"],
  correct: 1,
  explanation: "Cinque ruoli.",
  textEn: "How many roles?",
  answersEn: ["3", "5", "7"],
  explanationEn: "Five roles.",
  ...over,
});

describe("hasEnglish", () => {
  it("vuole domanda, tre risposte e spiegazione", () => {
    expect(hasEnglish(row())).toBe(true);
    expect(hasEnglish(row({ textEn: null }))).toBe(false);
    expect(hasEnglish(row({ explanationEn: " " }))).toBe(false);
    expect(hasEnglish(row({ answersEn: ["a", "b"] }))).toBe(false);
    expect(hasEnglish(row({ answersEn: ["a", "", "c"] }))).toBe(false);
  });
});

describe("playableBank", () => {
  const rows = [
    row({ id: "c" }),
    row({ id: "a", status: "DRAFT" }),
    row({ id: "b", level: "MEDIUM", textEn: null }),
  ];

  it("solo le approvate, in ordine di id, nella lingua giusta", () => {
    const it_ = playableBank(rows, "it");
    expect(it_.map((q) => q.id)).toEqual(["b", "c"]);
    expect(it_[0].level).toBe("medio");
    expect(it_[1].text).toBe("Quanti ruoli?");
  });

  it("in inglese solo le tradotte", () => {
    const en = playableBank(rows, "en");
    expect(en.map((q) => q.id)).toEqual(["c"]);
    expect(en[0].text).toBe("How many roles?");
    expect(en[0].explanation).toBe("Five roles.");
  });
});

describe("accensione di un quiz", () => {
  const many = (n: number, over: Partial<QuizQuestionRow> = {}) =>
    Array.from({ length: n }, (_, i) => row({ id: `q${i}`, ...over }));

  it("servono 8 domande approvate", () => {
    const seven = countQuestions([...many(7), row({ id: "x", status: "DRAFT" })]);
    expect(seven).toEqual({ total: 8, approved: 7, approvedEn: 7 });
    expect(canEnableQuiz(seven)).toBe(false);
    expect(missingToEnable(seven)).toBe(1);
    expect(canEnableQuiz(countQuestions(many(8)))).toBe(true);
    expect(missingToEnable(countQuestions(many(9)))).toBe(0);
  });

  it("si gioca con una partita intera nella lingua di chi guarda", () => {
    const counts = countQuestions([...many(5, { textEn: null }), ...many(2)]);
    expect(isPlayableIn(counts, "it")).toBe(true);
    expect(isPlayableIn(counts, "en")).toBe(false);
  });
});

describe("quizGameVisibility", () => {
  const playable = { total: 10, approved: 10, approvedEn: 0 };
  const empty = { total: 40, approved: 0, approvedEn: 0 };

  it("vale il quiz più aperto fra quelli giocabili", () => {
    expect(
      quizGameVisibility([
        { visibility: "MEMBERS", counts: playable },
        { visibility: "PUBLIC", counts: empty },
      ])
    ).toBe("MEMBERS");
    expect(
      quizGameVisibility([
        { visibility: "MEMBERS", counts: playable },
        { visibility: "PUBLIC", counts: playable },
      ])
    ).toBe("PUBLIC");
  });

  it("senza quiz giocabili è spento", () => {
    expect(quizGameVisibility([])).toBe("OFF");
    expect(quizGameVisibility([{ visibility: "PUBLIC", counts: empty }])).toBe("OFF");
  });
});

describe("statistiche per domanda", () => {
  it("la quota solo da 20 uscite", () => {
    expect(correctRate(19, 19)).toBeNull();
    expect(correctRate(20, 5)).toBe(0.25);
  });

  it("da rileggere sotto il 25%", () => {
    expect(needsReview(20, 4)).toBe(true);
    expect(needsReview(20, 5)).toBe(false);
    expect(needsReview(10, 0)).toBe(false);
  });
});

describe("scoreAnswers", () => {
  it("conta solo le domande del quiz, una volta sola", () => {
    const questions = [
      { id: "a", correct: 0 },
      { id: "b", correct: 2 },
    ];
    expect(
      scoreAnswers(
        [
          { id: "a", pick: 0 },
          { id: "a", pick: 1 },
          { id: "b", pick: 1 },
          { id: "z", pick: 0 },
        ],
        questions
      )
    ).toEqual([
      { id: "a", right: true },
      { id: "b", right: false },
    ]);
  });
});

describe("quizAccess", () => {
  const playable = { total: 10, approved: 10, approvedEn: 0 };
  const drafts = { total: 40, approved: 0, approvedEn: 0 };

  it("un quiz acceso senza una partita intera non si mostra", () => {
    expect(quizAccess({ visibility: "PUBLIC", counts: drafts }, null, "it")).toBe("hidden");
    expect(quizAccess({ visibility: "PUBLIC", counts: playable }, null, "it")).toBe("play");
    expect(quizAccess({ visibility: "PUBLIC", counts: playable }, null, "en")).toBe("hidden");
  });

  it("spento: lo staff lo prova anche solo con domande in prova", () => {
    expect(quizAccess({ visibility: "OFF", counts: drafts }, "ADMIN", "it")).toBe("preview");
    expect(quizAccess({ visibility: "OFF", counts: drafts }, "ATHLETE", "it")).toBe("hidden");
    expect(
      quizAccess(
        { visibility: "OFF", counts: { total: 0, approved: 0, approvedEn: 0 } },
        "ADMIN",
        "it"
      )
    ).toBe("hidden");
  });

  it("dei tesserati: l'anonimo legge come entrare", () => {
    expect(quizAccess({ visibility: "MEMBERS", counts: playable }, null, "it")).toBe("members");
  });
});
