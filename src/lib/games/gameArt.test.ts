import { describe, expect, it } from "vitest";
import { DEFAULT_QUIZ_ART, gamesGridColumns, isQuizArt, quizArt } from "@/lib/games/gameArt";

describe("quizArt", () => {
  it("accetta solo i disegni dell'elenco", () => {
    expect(isQuizArt("club")).toBe(true);
    expect(isQuizArt("foto")).toBe(false);
    expect(quizArt("history")).toBe("history");
    expect(quizArt("foto")).toBe(DEFAULT_QUIZ_ART);
    expect(quizArt(null)).toBe(DEFAULT_QUIZ_ART);
  });
});

describe("gamesGridColumns", () => {
  it("tre colonne solo quando le righe sono piene", () => {
    expect(gamesGridColumns(3)).toBe(3);
    expect(gamesGridColumns(6)).toBe(3);
  });
  it("altrimenti due, così nessuna card resta sola", () => {
    expect(gamesGridColumns(1)).toBe(2);
    expect(gamesGridColumns(2)).toBe(2);
    expect(gamesGridColumns(4)).toBe(2);
    expect(gamesGridColumns(5)).toBe(2);
  });
});
