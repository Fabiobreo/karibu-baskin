import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";

const us = { id: "us", name: "Kapuleti" };
const ours = [us];
const alpha = { id: "alpha", name: "Falchi Vicenza" };
const beta = { id: "beta", name: "Aquile Padova" };
const gamma = { id: "gamma", name: "Leoni Verona" };

const m = (
  ourScore: number | null,
  theirScore: number | null,
  opponent: { id: string; name: string }
) => ({
  ourScore,
  theirScore,
  opponent,
  teamId: us.id,
});

// ─── Punteggio Baskin: V=2, P=1, S=0 ────────────────────────────────────────

describe("computeStandings — punteggio Baskin V=2 P=1 S=0", () => {
  it("vittoria vale 2 punti", () => {
    const result = computeStandings(ours, [m(70, 50, alpha)], []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.points).toBe(2);
    expect(us_.won).toBe(1);
    expect(us_.drawn).toBe(0);
    expect(us_.lost).toBe(0);
  });

  it("pareggio vale 1 punto", () => {
    const result = computeStandings(ours, [m(60, 60, alpha)], []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.points).toBe(1);
    expect(us_.drawn).toBe(1);
  });

  it("sconfitta vale 0 punti", () => {
    const result = computeStandings(ours, [m(40, 80, alpha)], []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.points).toBe(0);
    expect(us_.lost).toBe(1);
  });

  it("l'avversario riceve i punti speculari", () => {
    const result = computeStandings(ours, [m(70, 50, alpha)], []);
    const opp = result.find((e) => e.id === "alpha")!;
    expect(opp.points).toBe(0);
    expect(opp.lost).toBe(1);
    expect(opp.goalsFor).toBe(50);
    expect(opp.goalsAgainst).toBe(70);
  });
});

// ─── Partite nostre (ourMatches) ─────────────────────────────────────────────

describe("computeStandings — partite nostre", () => {
  it("partite senza punteggio vengono ignorate", () => {
    const result = computeStandings(ours, [m(null, null, alpha)], []);
    expect(result).toHaveLength(0);
  });

  it("accumula più partite correttamente", () => {
    const matches = [m(70, 50, alpha), m(40, 80, beta), m(60, 60, gamma)];
    const result = computeStandings(ours, matches, []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.played).toBe(3);
    expect(us_.won).toBe(1);
    expect(us_.drawn).toBe(1);
    expect(us_.lost).toBe(1);
    expect(us_.points).toBe(3); // 2 + 0 + 1
    expect(us_.goalsFor).toBe(170);
    expect(us_.goalsAgainst).toBe(190);
  });

  it("ignora le partite il cui teamId non è tra le nostre squadre", () => {
    const result = computeStandings(
      ours,
      [{ ourScore: 70, theirScore: 50, opponent: alpha, teamId: "altra" }],
      []
    );
    expect(result.find((e) => e.id === "us")).toBeUndefined();
  });
});

// ─── Partite esterne (groupMatches) ──────────────────────────────────────────

describe("computeStandings — partite esterne", () => {
  it("partite esterne senza punteggio vengono ignorate", () => {
    const result = computeStandings(
      ours,
      [],
      [{ homeScore: null, awayScore: null, homeTeam: alpha, awayTeam: beta }]
    );
    expect(result).toHaveLength(0);
  });

  it("le partite esterne non aggiungono la nostra squadra", () => {
    const result = computeStandings(
      ours,
      [],
      [{ homeScore: 70, awayScore: 50, homeTeam: alpha, awayTeam: beta }]
    );
    expect(result.find((e) => e.id === "us")).toBeUndefined();
    expect(result.find((e) => e.id === "alpha")).toBeDefined();
    expect(result.find((e) => e.id === "beta")).toBeDefined();
  });

  it("home e away ricevono i punti corretti", () => {
    const result = computeStandings(
      ours,
      [],
      [{ homeScore: 70, awayScore: 50, homeTeam: alpha, awayTeam: beta }]
    );
    const home = result.find((e) => e.id === "alpha")!;
    const away = result.find((e) => e.id === "beta")!;
    expect(home.points).toBe(2);
    expect(home.goalsFor).toBe(70);
    expect(home.goalsAgainst).toBe(50);
    expect(away.points).toBe(0);
    expect(away.goalsFor).toBe(50);
    expect(away.goalsAgainst).toBe(70);
  });
});

// ─── Ordinamento classifica ───────────────────────────────────────────────────

describe("computeStandings — ordinamento", () => {
  it("ordina per punti decrescenti", () => {
    const matches = [m(70, 50, alpha), m(60, 80, beta)];
    const result = computeStandings(ours, matches, []);
    expect(result[0].id).not.toBe("alpha");
    expect(result[result.length - 1].id).toBe("alpha");
  });

  it("tiebreaker: differenza reti poi gol fatti", () => {
    const result = computeStandings(
      ours,
      [m(80, 50, alpha), m(40, 50, beta)],
      [{ homeScore: 70, awayScore: 60, homeTeam: gamma, awayTeam: beta }]
    );
    const us_ = result.find((e) => e.id === "us")!;
    const gamma_ = result.find((e) => e.id === "gamma")!;
    expect(us_.points).toBe(2);
    expect(gamma_.points).toBe(2);
    expect(result.indexOf(us_)).toBeLessThan(result.indexOf(gamma_));
  });
});

// ─── Flag isOurs ─────────────────────────────────────────────────────────────

describe("computeStandings — flag isOurs", () => {
  it("la nostra squadra ha isOurs=true", () => {
    const result = computeStandings(ours, [m(70, 50, alpha)], []);
    expect(result.find((e) => e.id === "us")!.isOurs).toBe(true);
  });

  it("gli avversari hanno isOurs=false", () => {
    const result = computeStandings(ours, [m(70, 50, alpha)], []);
    expect(result.find((e) => e.id === "alpha")!.isOurs).toBe(false);
  });

  it("le squadre nelle partite esterne hanno isOurs=false", () => {
    const result = computeStandings(
      ours,
      [],
      [{ homeScore: 70, awayScore: 50, homeTeam: beta, awayTeam: gamma }]
    );
    expect(result.find((e) => e.id === "beta")!.isOurs).toBe(false);
    expect(result.find((e) => e.id === "gamma")!.isOurs).toBe(false);
  });
});

// ─── Edge case ───────────────────────────────────────────────────────────────

describe("computeStandings — edge case", () => {
  it("nessuna partita → classifica vuota", () => {
    expect(computeStandings(ours, [], [])).toHaveLength(0);
  });

  it("stesso avversario in più partite accumula le stats", () => {
    const matches = [m(70, 50, alpha), m(60, 40, alpha)];
    const result = computeStandings(ours, matches, []);
    const opp = result.find((e) => e.id === "alpha")!;
    expect(opp.played).toBe(2);
    expect(opp.lost).toBe(2);
    expect(opp.goalsFor).toBe(90);
    expect(opp.goalsAgainst).toBe(130);
  });

  it("più nostre squadre nello stesso girone compaiono entrambe in classifica", () => {
    const usA = { id: "usA", name: "Karibu Gold" };
    const usB = { id: "usB", name: "Karibu Silver" };
    const result = computeStandings(
      [usA, usB],
      [
        { ourScore: 80, theirScore: 50, opponent: alpha, teamId: usA.id },
        { ourScore: 60, theirScore: 70, opponent: beta, teamId: usB.id },
      ],
      []
    );
    const a = result.find((e) => e.id === "usA")!;
    const b = result.find((e) => e.id === "usB")!;
    expect(a.isOurs).toBe(true);
    expect(a.points).toBe(2);
    expect(b.isOurs).toBe(true);
    expect(b.points).toBe(0);
  });
});
