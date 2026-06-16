import { describe, it, expect } from "vitest";
import { simulateMatch } from "./matchSimulator";
import { TRUESKILL } from "./trueskill";

const M = TRUESKILL.MU;

describe("simulateMatch", () => {
  it("è deterministico: stesso seed ⇒ stesso risultato", () => {
    const input = { teamAMus: [M, M, M], teamBMus: [M, M, M], seed: "x|y|0" };
    const r1 = simulateMatch(input);
    const r2 = simulateMatch(input);
    expect(r2).toEqual(r1);
  });

  it("seed diversi cambiano il punteggio (rivincita)", () => {
    const base = { teamAMus: [M, M, M], teamBMus: [M, M, M] };
    const a = simulateMatch({ ...base, seed: "s|0" });
    const b = simulateMatch({ ...base, seed: "s|1" });
    expect(`${a.scoreA}-${a.scoreB}`).not.toEqual(`${b.scoreA}-${b.scoreB}`);
  });

  it("squadre identiche ⇒ probabilità ~50% ed Equilibrata", () => {
    const r = simulateMatch({ teamAMus: [M, M], teamBMus: [M, M], seed: "eq" });
    expect(r.winProbabilityA).toBeCloseTo(0.5, 5);
    expect(r.label).toBe("Equilibrata");
  });

  it("una squadra nettamente più forte è favorita e vince spesso", () => {
    const strong = [40, 40, 40, 40, 40, 40];
    const weak = [10, 10, 10, 10, 10, 10];
    const r = simulateMatch({ teamAMus: strong, teamBMus: weak, seed: "gap" });
    expect(r.winProbabilityA).toBeGreaterThan(0.6);
    expect(r.label).toBe("FavoritiA");

    // Su molti seed la più forte vince la grande maggioranza delle simulazioni.
    let winsA = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const sim = simulateMatch({ teamAMus: strong, teamBMus: weak, seed: `gap|${i}` });
      if (sim.winner === "A") winsA++;
    }
    expect(winsA / N).toBeGreaterThan(0.8);
  });

  it("gli upset restano possibili (la più debole vince almeno qualche volta)", () => {
    const strong = [32, 32, 32, 32, 32, 32];
    const weak = [22, 22, 22, 22, 22, 22];
    let winsB = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const sim = simulateMatch({ teamAMus: strong, teamBMus: weak, seed: `up|${i}` });
      if (sim.winner === "B") winsB++;
    }
    expect(winsB).toBeGreaterThan(0);
    expect(winsB).toBeLessThan(N / 2);
  });

  it("μ null usa il default μ₀ (nessun NaN)", () => {
    const r = simulateMatch({ teamAMus: [null, null], teamBMus: [null, M], seed: "nul" });
    expect(Number.isFinite(r.scoreA)).toBe(true);
    expect(Number.isFinite(r.scoreB)).toBe(true);
    expect(r.scoreA).toBeGreaterThanOrEqual(10);
  });

  it("non produce pareggi (li rompe con un tiro seedato)", () => {
    for (let i = 0; i < 50; i++) {
      const r = simulateMatch({ teamAMus: [M, M], teamBMus: [M, M], seed: `draw|${i}` });
      expect(r.winner).not.toBe("draw");
    }
  });
});
