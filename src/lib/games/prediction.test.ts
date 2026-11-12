import { describe, expect, it } from "vitest";
import {
  hasPrediction,
  matchOutcome,
  predictionRecord,
  predictionTotals,
  predictionVerdict,
  predictionWindow,
} from "./prediction";

const DAY = 24 * 60 * 60 * 1000;
const kickoff = new Date("2026-11-21T15:00:00Z");
const external = { date: kickoff, opponentId: "opp", opponentTeamId: null };
const noScore = { ourScore: null, theirScore: null };

describe("predictionWindow", () => {
  it("apre 3 giorni prima e chiude all'orario d'inizio", () => {
    expect(predictionWindow(external, kickoff.getTime() - 4 * DAY)).toBe("notYet");
    expect(predictionWindow(external, kickoff.getTime() - 3 * DAY)).toBe("open");
    expect(predictionWindow(external, kickoff.getTime() - 1000)).toBe("open");
    expect(predictionWindow(external, kickoff.getTime())).toBe("closed");
    expect(predictionWindow(external, kickoff.getTime() + DAY)).toBe("closed");
  });

  it("le amichevoli interne non hanno il pronostico", () => {
    const internal = { date: kickoff, opponentId: null, opponentTeamId: "team2" };
    expect(hasPrediction(internal)).toBe(false);
    expect(predictionWindow(internal, kickoff.getTime() - DAY)).toBe("none");
  });
});

describe("matchOutcome", () => {
  it("lo ricava dal punteggio, altrimenti dal risultato", () => {
    expect(matchOutcome({ ourScore: 40, theirScore: 30 })).toBe("WIN");
    expect(matchOutcome({ ourScore: 30, theirScore: 30 })).toBe("DRAW");
    expect(matchOutcome({ ourScore: 20, theirScore: 30 })).toBe("LOSS");
    expect(matchOutcome({ ...noScore, result: "WIN" })).toBe("WIN");
    expect(matchOutcome(noScore)).toBeNull();
  });
});

describe("predictionVerdict", () => {
  const played = { ourScore: 42, theirScore: 38 };

  it("dice se ha indovinato chi vince", () => {
    expect(predictionVerdict({ outcome: "WIN", ...noScore }, played)).toEqual({
      right: true,
      score: null,
    });
    expect(predictionVerdict({ outcome: "LOSS", ...noScore }, played)?.right).toBe(false);
  });

  it("dice quanto è andato vicino il punteggio", () => {
    expect(
      predictionVerdict({ outcome: "WIN", ourScore: 42, theirScore: 38 }, played)?.score
    ).toEqual({ exact: true, gap: 0 });
    expect(
      predictionVerdict({ outcome: "WIN", ourScore: 40, theirScore: 36 }, played)?.score
    ).toEqual({ exact: false, gap: 4 });
  });

  it("senza risultato non dice niente", () => {
    expect(predictionVerdict({ outcome: "WIN", ...noScore }, noScore)).toBeNull();
  });
});

describe("totali e record", () => {
  it("conta per risultato", () => {
    expect(predictionTotals([{ outcome: "WIN" }, { outcome: "WIN" }, { outcome: "DRAW" }])).toEqual(
      { total: 3, WIN: 2, DRAW: 1, LOSS: 0 }
    );
  });

  it("conta i giusti solo fra le partite con un risultato", () => {
    const won = { ourScore: 40, theirScore: 30, result: "WIN" as const };
    const notPlayed = { ...noScore, result: null };
    expect(
      predictionRecord([
        { outcome: "WIN", ...noScore, match: won },
        { outcome: "LOSS", ...noScore, match: won },
        { outcome: "WIN", ...noScore, match: notPlayed },
      ])
    ).toEqual({ right: 1, total: 2 });
  });
});
