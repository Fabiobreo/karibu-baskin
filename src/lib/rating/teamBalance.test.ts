import { describe, it, expect } from "vitest";
import { percentPair, teamBalance, teamWinProbability } from "./teamBalance";

const r = (mu: number, sigma = 3) => ({ mu, sigma });

describe("teamWinProbability", () => {
  it("vale 0,5 fra squadre uguali", () => {
    expect(teamWinProbability([r(25), r(25)], [r(25), r(25)])).toBeCloseTo(0.5, 6);
  });

  it("favorisce la squadra col livello medio più alto", () => {
    expect(teamWinProbability([r(30), r(28)], [r(22), r(24)])).toBeGreaterThan(0.7);
  });

  it("un giocatore in più allo stesso livello non la rende favorita", () => {
    const p = teamWinProbability([r(25), r(25), r(25)], [r(25), r(25)]);
    expect(p).toBeCloseTo(0.5, 2);
  });
});

describe("teamBalance", () => {
  const levels: Record<string, { mu: number; sigma: number }> = {
    a: r(30),
    b: r(30),
    e: r(30),
    c: r(20),
    d: r(20),
    f: r(20),
  };
  const levelOf = (id: string) => levels[id] ?? null;

  it("dà forza, probabilità e favorita con due squadre", () => {
    const out = teamBalance(
      [
        [{ id: "a" }, { id: "b" }, { id: "e" }],
        [{ id: "c" }, { id: "d" }, { id: "f" }],
      ],
      levelOf
    );
    expect(out.strengths).toEqual([30, 20]);
    expect(out.favourite).toBe(0);
    expect(out.winProbabilities![0] + out.winProbabilities![1]).toBeCloseTo(1, 9);
    expect(out.unrated).toBe(0);
  });

  it("squadre equilibrate: nessuna favorita", () => {
    const out = teamBalance(
      [
        [{ id: "a" }, { id: "c" }, { id: "x" }],
        [{ id: "b" }, { id: "d" }, { id: "y" }],
      ],
      levelOf
    );
    expect(out.favourite).toBeNull();
  });

  it("conta chi non ha un livello stimato", () => {
    const out = teamBalance([[{ id: "a" }, { id: "x" }], [{ id: "c" }]], levelOf);
    expect(out.unrated).toBe(1);
  });

  it("con tre squadre solo la forza", () => {
    const out = teamBalance(
      [
        [{ id: "a" }, { id: "b" }, { id: "e" }],
        [{ id: "c" }, { id: "d" }, { id: "f" }],
        [{ id: "x" }, { id: "y" }, { id: "z" }],
      ],
      levelOf
    );
    expect(out.winProbabilities).toBeNull();
    expect(out.strengths).toEqual([30, 20, 25]);
  });

  it("sotto tre giocatori niente forza né percentuale: sarebbe il livello di una persona", () => {
    const out = teamBalance([[{ id: "a" }], [{ id: "c" }, { id: "d" }, { id: "f" }]], levelOf);
    expect(out.strengths).toEqual([null, 20]);
    expect(out.winProbabilities).toBeNull();
    expect(out.favourite).toBeNull();
  });
});

describe("percentPair", () => {
  it("somma sempre 100", () => {
    expect(percentPair([0.555, 0.445])).toEqual([56, 44]);
    expect(percentPair([0.5, 0.5])).toEqual([50, 50]);
  });
});
