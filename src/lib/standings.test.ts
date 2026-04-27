// [CLAUDE - 09:00] Unit test per computeStandings (classifica girone Baskin)
import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";

const us = { id: "us", name: "Kapuleti" };
const alpha = { id: "alpha", name: "Falchi Vicenza" };
const beta  = { id: "beta",  name: "Aquile Padova" };
const gamma = { id: "gamma", name: "Leoni Verona" };

// ─── Punteggio Baskin: V=2, P=1, S=0 ────────────────────────────────────────

describe("computeStandings — punteggio Baskin V=2 P=1 S=0", () => {
  it("vittoria vale 2 punti", () => {
    const result = computeStandings(us, [{ ourScore: 70, theirScore: 50, opponent: alpha }], []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.points).toBe(2);
    expect(us_.won).toBe(1);
    expect(us_.drawn).toBe(0);
    expect(us_.lost).toBe(0);
  });

  it("pareggio vale 1 punto", () => {
    const result = computeStandings(us, [{ ourScore: 60, theirScore: 60, opponent: alpha }], []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.points).toBe(1);
    expect(us_.drawn).toBe(1);
  });

  it("sconfitta vale 0 punti", () => {
    const result = computeStandings(us, [{ ourScore: 40, theirScore: 80, opponent: alpha }], []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.points).toBe(0);
    expect(us_.lost).toBe(1);
  });

  it("l'avversario riceve i punti speculari", () => {
    const result = computeStandings(us, [{ ourScore: 70, theirScore: 50, opponent: alpha }], []);
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
    const result = computeStandings(
      us,
      [{ ourScore: null, theirScore: null, opponent: alpha }],
      [],
    );
    expect(result).toHaveLength(0);
  });

  it("accumula più partite correttamente", () => {
    const matches = [
      { ourScore: 70, theirScore: 50, opponent: alpha }, // W
      { ourScore: 40, theirScore: 80, opponent: beta  }, // L
      { ourScore: 60, theirScore: 60, opponent: gamma }, // D
    ];
    const result = computeStandings(us, matches, []);
    const us_ = result.find((e) => e.id === "us")!;
    expect(us_.played).toBe(3);
    expect(us_.won).toBe(1);
    expect(us_.drawn).toBe(1);
    expect(us_.lost).toBe(1);
    expect(us_.points).toBe(3); // 2 + 0 + 1
    expect(us_.goalsFor).toBe(170);
    expect(us_.goalsAgainst).toBe(190);
  });
});

// ─── Partite esterne (groupMatches) ──────────────────────────────────────────

describe("computeStandings — partite esterne", () => {
  it("partite esterne senza punteggio vengono ignorate", () => {
    const result = computeStandings(us, [], [
      { homeScore: null, awayScore: null, homeTeam: alpha, awayTeam: beta },
    ]);
    expect(result).toHaveLength(0);
  });

  it("le partite esterne non aggiungono la nostra squadra", () => {
    const result = computeStandings(us, [], [
      { homeScore: 70, awayScore: 50, homeTeam: alpha, awayTeam: beta },
    ]);
    expect(result.find((e) => e.id === "us")).toBeUndefined();
    expect(result.find((e) => e.id === "alpha")).toBeDefined();
    expect(result.find((e) => e.id === "beta")).toBeDefined();
  });

  it("home e away ricevono i punti corretti", () => {
    const result = computeStandings(us, [], [
      { homeScore: 70, awayScore: 50, homeTeam: alpha, awayTeam: beta },
    ]);
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
    const matches = [
      { ourScore: 70, theirScore: 50, opponent: alpha }, // us: 2pt, alpha: 0pt
      { ourScore: 60, theirScore: 80, opponent: beta  }, // us: 0pt, beta: 2pt
    ];
    const result = computeStandings(us, matches, []);
    // us: 2pt (W+L), beta: 2pt (W), alpha: 0pt (L)
    // us e beta a pari punti: tiebreaker goal-diff
    expect(result[0].id).not.toBe("alpha"); // alpha è ultimo
    expect(result[result.length - 1].id).toBe("alpha");
  });

  it("tiebreaker: differenza reti poi gol fatti", () => {
    // us: 1V (80-50 → +30, 80gf) + 1S = 2pt, gf=80, gs=50
    // alpha: 1V (70-60 → +10, 70gf) = 2pt, gf=70, gs=60
    // us ha diff migliore (+30 vs +10)
    const result = computeStandings(
      us,
      [
        { ourScore: 80, theirScore: 50, opponent: alpha },
        { ourScore: 40, theirScore: 50, opponent: beta  },
      ],
      [
        { homeScore: 70, awayScore: 60, homeTeam: gamma, awayTeam: beta },
      ],
    );
    const us_    = result.find((e) => e.id === "us")!;
    const gamma_ = result.find((e) => e.id === "gamma")!;
    expect(us_.points).toBe(2);
    expect(gamma_.points).toBe(2);
    // us diff = 80-50 + 40-50 = +20; gamma diff = 70-60 = +10 → us viene prima
    expect(result.indexOf(us_)).toBeLessThan(result.indexOf(gamma_));
  });
});

// ─── Flag isOurs ─────────────────────────────────────────────────────────────

describe("computeStandings — flag isOurs", () => {
  it("la nostra squadra ha isOurs=true", () => {
    const result = computeStandings(us, [{ ourScore: 70, theirScore: 50, opponent: alpha }], []);
    expect(result.find((e) => e.id === "us")!.isOurs).toBe(true);
  });

  it("gli avversari hanno isOurs=false", () => {
    const result = computeStandings(us, [{ ourScore: 70, theirScore: 50, opponent: alpha }], []);
    expect(result.find((e) => e.id === "alpha")!.isOurs).toBe(false);
  });

  it("le squadre nelle partite esterne hanno isOurs=false", () => {
    const result = computeStandings(us, [], [
      { homeScore: 70, awayScore: 50, homeTeam: beta, awayTeam: gamma },
    ]);
    expect(result.find((e) => e.id === "beta")!.isOurs).toBe(false);
    expect(result.find((e) => e.id === "gamma")!.isOurs).toBe(false);
  });
});

// ─── Edge case ───────────────────────────────────────────────────────────────

describe("computeStandings — edge case", () => {
  it("nessuna partita → classifica vuota", () => {
    expect(computeStandings(us, [], [])).toHaveLength(0);
  });

  it("stesso avversario in più partite accumula le stats", () => {
    const matches = [
      { ourScore: 70, theirScore: 50, opponent: alpha },
      { ourScore: 60, theirScore: 40, opponent: alpha },
    ];
    const result = computeStandings(us, matches, []);
    const opp = result.find((e) => e.id === "alpha")!;
    expect(opp.played).toBe(2);
    expect(opp.lost).toBe(2);
    expect(opp.goalsFor).toBe(90);
    expect(opp.goalsAgainst).toBe(130);
  });
});
