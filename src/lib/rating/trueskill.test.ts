import { describe, it, expect } from "vitest";
import { TRUESKILL, defaultRating, ordinal, rate2Win, rate2Draw, type Rating } from "./trueskill";

const def = (): Rating => defaultRating();

describe("defaultRating / ordinal", () => {
  it("usa le costanti di default", () => {
    const r = defaultRating();
    expect(r.mu).toBe(TRUESKILL.MU);
    expect(r.sigma).toBeCloseTo(TRUESKILL.SIGMA, 6);
  });

  it("ordinal = μ − 3σ", () => {
    expect(ordinal({ mu: 25, sigma: 8 })).toBe(1);
  });
});

describe("rate2Win — 1v1 squadre identiche", () => {
  const { winners, losers } = rate2Win([def()], [def()]);

  it("il vincitore sale, il perdente scende", () => {
    expect(winners[0].mu).toBeGreaterThan(TRUESKILL.MU);
    expect(losers[0].mu).toBeLessThan(TRUESKILL.MU);
  });

  it("l'incertezza σ diminuisce per entrambi", () => {
    expect(winners[0].sigma).toBeLessThan(TRUESKILL.SIGMA);
    expect(losers[0].sigma).toBeLessThan(TRUESKILL.SIGMA);
  });

  it("è simmetrico: spostamento del vincitore = spostamento del perdente", () => {
    expect(winners[0].mu - TRUESKILL.MU).toBeCloseTo(TRUESKILL.MU - losers[0].mu, 6);
    expect(winners[0].sigma).toBeCloseTo(losers[0].sigma, 6);
  });
});

describe("rate2Win — upset vs risultato atteso", () => {
  it("un vincitore debole guadagna più μ di un vincitore forte (a parità di avversario)", () => {
    const strong: Rating = { mu: 35, sigma: TRUESKILL.SIGMA };
    const weak: Rating = { mu: 15, sigma: TRUESKILL.SIGMA };
    const mid: Rating = { mu: 25, sigma: TRUESKILL.SIGMA };

    const expectedWin = rate2Win([strong], [mid]); // forte batte medio (atteso)
    const upsetWin = rate2Win([weak], [mid]); // debole batte medio (sorpresa)

    const expectedGain = expectedWin.winners[0].mu - strong.mu;
    const upsetGain = upsetWin.winners[0].mu - weak.mu;

    expect(upsetGain).toBeGreaterThan(expectedGain);
  });
});

describe("rate2Win — margin of victory (weight)", () => {
  it("peso più alto → spostamento di μ più grande", () => {
    const low = rate2Win([def()], [def()], { weight: 0.3 });
    const high = rate2Win([def()], [def()], { weight: 1 });

    const lowGain = low.winners[0].mu - TRUESKILL.MU;
    const highGain = high.winners[0].mu - TRUESKILL.MU;

    expect(highGain).toBeGreaterThan(lowGain);
  });

  it("weight=0 non cambia nulla (a meno della dinamica τ su σ)", () => {
    const { winners } = rate2Win([def()], [def()], { weight: 0 });
    expect(winners[0].mu).toBeCloseTo(TRUESKILL.MU, 6);
  });
});

describe("rate2Draw", () => {
  it("squadre identiche: μ resta ~invariato, σ diminuisce", () => {
    const { teamA, teamB } = rate2Draw([def()], [def()]);
    expect(teamA[0].mu).toBeCloseTo(TRUESKILL.MU, 4);
    expect(teamB[0].mu).toBeCloseTo(TRUESKILL.MU, 4);
    expect(teamA[0].sigma).toBeLessThan(TRUESKILL.SIGMA);
  });

  it("il pareggio avvicina i μ: il favorito scende, lo sfavorito sale", () => {
    const favorite: Rating = { mu: 35, sigma: TRUESKILL.SIGMA };
    const underdog: Rating = { mu: 15, sigma: TRUESKILL.SIGMA };
    const { teamA, teamB } = rate2Draw([favorite], [underdog]);
    expect(teamA[0].mu).toBeLessThan(favorite.mu);
    expect(teamB[0].mu).toBeGreaterThan(underdog.mu);
  });
});

describe("rate2Win — squadre multi-giocatore", () => {
  it("aggiorna tutti i giocatori e preserva l'ordine/lunghezza", () => {
    const winners = [def(), { mu: 30, sigma: 5 }];
    const losers = [def(), def(), def()];
    const res = rate2Win(winners, losers);
    expect(res.winners).toHaveLength(2);
    expect(res.losers).toHaveLength(3);
    res.winners.forEach((r) => expect(r.mu).toBeGreaterThan(0));
    res.losers.forEach((r) => expect(Number.isFinite(r.mu)).toBe(true));
  });
});

describe("convergenza", () => {
  it("vittorie ripetute fanno crescere μ e calare σ in modo monotono", () => {
    let a: Rating = def();
    let b: Rating = def();
    let prevMu = a.mu;
    let prevSigma = a.sigma;
    for (let i = 0; i < 10; i++) {
      const res = rate2Win([a], [b]);
      a = res.winners[0];
      b = res.losers[0];
      expect(a.mu).toBeGreaterThan(prevMu);
      expect(a.sigma).toBeLessThan(prevSigma + TRUESKILL.TAU); // σ scende al netto della dinamica
      prevMu = a.mu;
      prevSigma = a.sigma;
    }
  });
});
