import { describe, it, expect } from "vitest";
import {
  buildRostersSnapshot,
  movWeight,
  onlyExisting,
  ratingColumns,
  replayTimeline,
  replayTrainingEvents,
  type RegistrationRefMap,
  type ReplayEvent,
  type TimelineEvent,
} from "./ratingEngine";
import { TRUESKILL } from "./trueskill";

describe("movWeight", () => {
  it("partita combattuta (~1 punto) → peso base (~0.5)", () => {
    expect(movWeight(51, 50)).toBeCloseTo(0.5 + 0.5 / 24, 4);
  });

  it("scala baskin: combattuta < equilibrata < superiorità", () => {
    const combattuta = movWeight(54, 50); // diff 4
    const equilibrata = movWeight(60, 50); // diff 10
    const superiorita = movWeight(68, 50); // diff 18
    expect(combattuta).toBeLessThan(equilibrata);
    expect(equilibrata).toBeLessThan(superiorita);
    expect(superiorita).toBeLessThan(1);
  });

  it("supremazia (margine ≥ 24) → peso massimo cappato a 1", () => {
    expect(movWeight(80, 50)).toBe(1); // diff 30
    expect(movWeight(74, 50)).toBe(1); // diff 24 = soglia
    expect(movWeight(73, 50)).toBeLessThan(1); // diff 23
  });

  it("simmetrico rispetto a chi vince", () => {
    expect(movWeight(70, 50)).toBe(movWeight(50, 70));
  });
});

describe("buildRostersSnapshot", () => {
  const refs: RegistrationRefMap = new Map([
    ["r1", { userId: "u1", childId: null }],
    ["r2", { userId: null, childId: "c1" }],
    ["r3", { userId: null, childId: null }], // anonimo
  ]);
  const teams = {
    teamA: [
      { id: "r1", name: "Alice" },
      { id: "r3", name: "Anon" },
    ],
    teamB: [{ id: "r2", name: "Bea" }],
    teamC: [{ id: "r1", name: "Alice" }],
  };

  it("matchup null ⇒ AB e risolve userId/childId", () => {
    const snap = buildRostersSnapshot(teams, null, refs);
    expect(snap.teamA).toEqual([{ userId: "u1", childId: null, name: "Alice" }]);
    expect(snap.teamB).toEqual([{ userId: null, childId: "c1", name: "Bea" }]);
  });

  it("esclude gli iscritti anonimi", () => {
    const snap = buildRostersSnapshot(teams, "AB", refs);
    expect(snap.teamA).toHaveLength(1); // r3 anonimo escluso
  });

  it("matchup BC seleziona le squadre B e C", () => {
    const snap = buildRostersSnapshot(teams, "BC", refs);
    expect(snap.teamA[0].childId).toBe("c1"); // B → teamA dello snapshot
    expect(snap.teamB[0].userId).toBe("u1"); // C → teamB dello snapshot
  });
});

describe("replayTrainingEvents", () => {
  const ev = (scoreA: number, scoreB: number): ReplayEvent => ({
    snapshot: {
      teamA: [{ userId: "u1", name: "A" }],
      teamB: [{ userId: "u2", name: "B" }],
    },
    scoreA,
    scoreB,
  });

  it("il vincitore (teamA) sale, il perdente scende", () => {
    const { ratings } = replayTrainingEvents([ev(20, 10)]);
    expect(ratings.get("u:u1")!.mu).toBeGreaterThan(TRUESKILL.MU);
    expect(ratings.get("u:u2")!.mu).toBeLessThan(TRUESKILL.MU);
  });

  it("vince teamB quando scoreB > scoreA", () => {
    const { ratings } = replayTrainingEvents([ev(8, 18)]);
    expect(ratings.get("u:u2")!.mu).toBeGreaterThan(TRUESKILL.MU);
    expect(ratings.get("u:u1")!.mu).toBeLessThan(TRUESKILL.MU);
  });

  it("produce una riga di log per giocatore per evento", () => {
    const { log } = replayTrainingEvents([ev(20, 10), ev(15, 12)]);
    expect(log).toHaveLength(4); // 2 eventi × 2 giocatori
    expect(log[0]).toMatchObject({ key: "u:u1" });
  });

  it("salta gli eventi senza giocatori valutabili in una squadra", () => {
    const empty: ReplayEvent = {
      snapshot: { teamA: [{ userId: "u1", name: "A" }], teamB: [] },
      scoreA: 10,
      scoreB: 5,
    };
    const { ratings, log } = replayTrainingEvents([empty]);
    expect(log).toHaveLength(0);
    expect(ratings.size).toBe(0);
  });

  it("è deterministico e idempotente sulla sequenza", () => {
    const seq = [ev(20, 10), ev(5, 15), ev(12, 12)];
    const r1 = replayTrainingEvents(seq);
    const r2 = replayTrainingEvents(seq);
    expect(r1.ratings.get("u:u1")).toEqual(r2.ratings.get("u:u1"));
  });

  it("distingue user (u:) e child (c:) nelle chiavi", () => {
    const mixed: ReplayEvent = {
      snapshot: {
        teamA: [{ childId: "c1", name: "Kid" }],
        teamB: [{ userId: "u1", name: "Adult" }],
      },
      scoreA: 21,
      scoreB: 7,
    };
    const { ratings } = replayTrainingEvents([mixed]);
    expect(ratings.has("c:c1")).toBe(true);
    expect(ratings.has("u:u1")).toBe(true);
  });
});

describe("replayTimeline — cambio categoria (σ rigonfiato)", () => {
  const match = (scoreA: number, scoreB: number): TimelineEvent => ({
    kind: "match",
    snapshot: { teamA: [{ userId: "u1", name: "A" }], teamB: [{ userId: "u2", name: "B" }] },
    scoreA,
    scoreB,
  });
  const role = (key: "u:u1" | "u:u2"): TimelineEvent => ({ kind: "role", key });

  it("la prima assegnazione di ruolo NON gonfia σ", () => {
    const { log } = replayTimeline([role("u:u1"), match(20, 10)]);
    expect(log.every((e) => e.reason === "TRAINING_MATCH")).toBe(true);
  });

  it("un cambio categoria dopo alcune partite riporta σ a σ₀ mantenendo μ", () => {
    const tl: TimelineEvent[] = [
      role("u:u1"), // prima assegnazione (no-op)
      match(25, 10),
      match(22, 12),
      match(20, 14), // u1 ha vinto: σ scesa, μ salito
      role("u:u1"), // CAMBIO categoria → rigonfia σ
    ];
    const { ratings, log } = replayTimeline(tl);
    const roleEntry = log.find((e) => e.reason === "ROLE_CHANGE");
    expect(roleEntry).toBeDefined();
    expect(roleEntry!.muAfter).toBeCloseTo(roleEntry!.muBefore, 6); // μ invariato
    expect(roleEntry!.sigmaAfter).toBeGreaterThan(roleEntry!.sigmaBefore); // σ rigonfiato
    expect(ratings.get("u:u1")!.sigma).toBeCloseTo(TRUESKILL.SIGMA, 6); // tornata a σ₀
    expect(ratings.get("u:u1")!.mu).toBeGreaterThan(TRUESKILL.MU); // μ resta alto
  });

  it("nessun gonfiaggio se il giocatore non ha mai giocato (non valutato)", () => {
    // u2 non compare in nessuna partita: due eventi role ma nessun rating → nessun log
    const { log } = replayTimeline([role("u:u2"), role("u:u2")]);
    expect(log).toHaveLength(0);
  });
});

describe("ratingColumns", () => {
  it("divide account e figli in colonne parallele, nello stesso ordine", () => {
    const cols = ratingColumns(
      new Map([
        ["u:a", { mu: 30, sigma: 5 }],
        ["c:k", { mu: 22, sigma: 7 }],
        ["u:b", { mu: 18.5, sigma: 4.25 }],
      ])
    );
    expect(cols.users).toEqual({ ids: ["a", "b"], mus: [30, 18.5], sigmas: [5, 4.25] });
    expect(cols.children).toEqual({ ids: ["k"], mus: [22], sigmas: [7] });
  });

  it("restituisce colonne vuote senza giocatori", () => {
    const cols = ratingColumns(new Map());
    expect(cols.users.ids).toHaveLength(0);
    expect(cols.children.ids).toHaveLength(0);
  });

  it("non si confonde con un id che contiene i due punti", () => {
    const cols = ratingColumns(new Map([["u:x:y", { mu: 1, sigma: 2 }]]));
    expect(cols.users.ids).toEqual(["x:y"]);
  });
});

describe("onlyExisting", () => {
  it("toglie rating e storico di chi è stato eliminato", () => {
    const entry = (key: "u:a" | "u:gone" | "c:k" | "c:gone") => ({
      key,
      reason: "TRAINING_MATCH" as const,
      muBefore: 25,
      sigmaBefore: 8,
      muAfter: 26,
      sigmaAfter: 7,
    });
    const out = onlyExisting(
      {
        ratings: new Map([
          ["u:a", { mu: 26, sigma: 7 }],
          ["u:gone", { mu: 20, sigma: 7 }],
          ["c:k", { mu: 22, sigma: 7 }],
          ["c:gone", { mu: 22, sigma: 7 }],
        ]),
        log: [entry("u:a"), entry("u:gone"), entry("c:k"), entry("c:gone")],
      },
      new Set(["a"]),
      new Set(["k"])
    );
    expect([...out.ratings.keys()]).toEqual(["u:a", "c:k"]);
    expect(out.log.map((e) => e.key)).toEqual(["u:a", "c:k"]);
  });
});
