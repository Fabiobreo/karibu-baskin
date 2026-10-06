import { describe, it, expect } from "vitest";
import { LIVE_WINDOW_MS } from "@/lib/matches/matchPhase";
import { sortTeamsForViewer, summarizeTeamMatches, viewerTeamMarks } from "./teamSummary";

const NOW = new Date("2026-10-06T12:00:00Z").getTime();
const at = (offsetMs: number) => new Date(NOW + offsetMs);
const DAY = 24 * 60 * 60 * 1000;

const played = (result: "WIN" | "DRAW" | "LOSS", daysAgo: number) => ({
  date: at(-daysAgo * DAY),
  result,
  ourScore: 50,
  theirScore: 40,
});
const unscored = (offsetMs: number, id = "") => ({
  id,
  date: at(offsetMs),
  result: null,
  ourScore: null,
  theirScore: null,
});

describe("summarizeTeamMatches", () => {
  it("conta vinte, pareggiate e perse solo fra le partite con il punteggio", () => {
    const s = summarizeTeamMatches(
      [played("WIN", 30), played("WIN", 20), played("LOSS", 10), played("DRAW", 5)],
      NOW
    );
    expect(s).toMatchObject({ wins: 2, draws: 1, losses: 1, played: 4 });
    expect(s.upcoming).toEqual([]);
  });

  it("mette in programma le partite future, dalla più vicina", () => {
    const s = summarizeTeamMatches([unscored(20 * DAY, "b"), unscored(3 * DAY, "a")], NOW);
    expect(s.played).toBe(0);
    expect(s.upcoming.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("una partita in corso è ancora in programma, una finita senza punteggio no", () => {
    const s = summarizeTeamMatches(
      [unscored(-LIVE_WINDOW_MS + 60_000, "live"), unscored(-LIVE_WINDOW_MS - 60_000, "old")],
      NOW
    );
    expect(s.upcoming.map((m) => m.id)).toEqual(["live"]);
    expect(s.played).toBe(0);
  });

  it("senza partite: tutto a zero", () => {
    expect(summarizeTeamMatches([], NOW)).toEqual({
      wins: 0,
      draws: 0,
      losses: 0,
      played: 0,
      upcoming: [],
    });
  });
});

describe("viewerTeamMarks", () => {
  it("segna la squadra di chi guarda e quelle dei figli, per nome di battesimo", () => {
    const marks = viewerTeamMarks([
      { teamId: "t1", childName: null },
      { teamId: "t2", childName: "Giulia Rossi" },
      { teamId: "t2", childName: "  Marco  Rossi" },
      { teamId: "t2", childName: "Giulia Rossi" },
    ]);
    expect(marks.get("t1")).toEqual({ mine: true, children: [] });
    expect(marks.get("t2")).toEqual({ mine: false, children: ["Giulia", "Marco"] });
    expect(marks.has("t3")).toBe(false);
  });

  it("genitore che gioca nella stessa squadra del figlio: tutti e due i segni", () => {
    const marks = viewerTeamMarks([
      { teamId: "t1", childName: "Giulia Rossi" },
      { teamId: "t1", childName: null },
    ]);
    expect(marks.get("t1")).toEqual({ mine: true, children: ["Giulia"] });
  });
});

describe("sortTeamsForViewer", () => {
  const teams = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("la mia per prima, poi quelle dei figli, poi le altre nell'ordine dato", () => {
    const marks = viewerTeamMarks([
      { teamId: "c", childName: null },
      { teamId: "d", childName: "Giulia" },
    ]);
    expect(sortTeamsForViewer(teams, marks).map((t) => t.id)).toEqual(["c", "d", "a", "b"]);
  });

  it("senza legami l'ordine non cambia", () => {
    expect(sortTeamsForViewer(teams, new Map()).map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });
});
