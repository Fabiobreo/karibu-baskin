import { describe, it, expect } from "vitest";
import {
  computeBadges,
  computeBadgeState,
  computeAllBadges,
  getBadgeById,
  type MatchStat,
  type StatsInput,
} from "./badges";

const emptyInput: StatsInput = { matchStats: [], mvpCount: 0, topScorerCount: 0 };

const stat = (over: Partial<MatchStat> = {}): MatchStat => ({
  points: 0,
  twoPointers: 0,
  threePointers: 0,
  freeThrows: 0,
  shotsAttempted: 0,
  fouls: 0,
  illegalFouls: 0,
  isLoan: false,
  won: false,
  date: new Date("2026-01-01"),
  season: "2025-26",
  ...over,
});

describe("computeBadges", () => {
  it("nessun badge senza partite", () => {
    expect(computeBadges(emptyInput)).toEqual([]);
  });

  it("sblocca esordiente e primo canestro alla prima partita con punti", () => {
    const ids = computeBadges({
      ...emptyInput,
      matchStats: [stat({ points: 4, twoPointers: 2 })],
    }).map((b) => b.id);
    expect(ids).toContain("esordiente");
    expect(ids).toContain("primo_canestro");
  });

  it("sblocca bomber a 20+ punti in una gara", () => {
    const ids = computeBadges({
      ...emptyInput,
      matchStats: [stat({ points: 21 })],
    }).map((b) => b.id);
    expect(ids).toContain("bomber");
  });

  it("sblocca mvp con almeno un premio", () => {
    expect(computeBadges({ ...emptyInput, mvpCount: 1 }).map((b) => b.id)).toContain("mvp");
  });
});

describe("computeBadgeState", () => {
  it("riporta i bloccati con avanzamento corretto", () => {
    const { earned, locked } = computeBadgeState({
      ...emptyInput,
      matchStats: Array.from({ length: 7 }, () => stat({ points: 2, twoPointers: 1 })),
    });
    expect(earned.map((b) => b.id)).toContain("esordiente");
    const dieci = locked.find((b) => b.id === "dieci_partite");
    expect(dieci).toBeDefined();
    expect(dieci).toMatchObject({ current: 7, target: 10 });
  });

  it("un badge sbloccato non compare tra i bloccati", () => {
    const { earned, locked } = computeBadgeState({
      ...emptyInput,
      matchStats: [stat({ points: 25 })],
    });
    expect(earned.some((b) => b.id === "bomber")).toBe(true);
    expect(locked.some((b) => b.id === "bomber")).toBe(false);
  });

  it("bomber bloccato mostra il record punti come avanzamento", () => {
    const { locked } = computeBadgeState({
      ...emptyInput,
      matchStats: [stat({ points: 12 }), stat({ points: 8 })],
    });
    expect(locked.find((b) => b.id === "bomber")).toMatchObject({ current: 12, target: 20 });
  });
});

describe("computeAllBadges", () => {
  it("ritorna i badge applicabili (esclusi quelli riservati ad altri ruoli)", () => {
    // emptyInput non ha sportRole → i badge R5/R4-R5 sono esclusi.
    const all = computeAllBadges(emptyInput);
    expect(all).toHaveLength(28);
    expect(all.every((b) => b.earned === false)).toBe(true);
    expect(all.some((b) => b.id === "mira_acciaio")).toBe(false);
  });

  it("include i badge riservati agli R5 quando il giocatore è R5", () => {
    const all = computeAllBadges({ ...emptyInput, sportRole: 5 });
    expect(all).toHaveLength(31);
    expect(all.some((b) => b.id === "mira_acciaio")).toBe(true);
    expect(all.some((b) => b.id === "cecchino_perfetto")).toBe(true);
    expect(all.some((b) => b.id === "fair_play")).toBe(true);
  });

  it("marca earned i badge sbloccati e include l'avanzamento per i bloccati", () => {
    const all = computeAllBadges({
      ...emptyInput,
      matchStats: Array.from({ length: 12 }, () => stat({ points: 2, twoPointers: 1 })),
    });
    const dieci = all.find((b) => b.id === "dieci_partite");
    const venti = all.find((b) => b.id === "venti_partite");
    expect(dieci?.earned).toBe(true);
    expect(venti?.earned).toBe(false);
    expect(venti).toMatchObject({ current: 12, target: 20 });
  });
});

describe("nuovi badge", () => {
  it("centurione a 100 punti totali in carriera", () => {
    const ids = computeBadges({
      ...emptyInput,
      matchStats: Array.from({ length: 10 }, () => stat({ points: 10 })),
    }).map((b) => b.id);
    expect(ids).toContain("centurione");
  });

  it("vincente conta solo le partite vinte", () => {
    const matchStats = [
      ...Array.from({ length: 9 }, () => stat({ won: true })),
      ...Array.from({ length: 5 }, () => stat({ won: false })),
    ];
    expect(computeBadges({ ...emptyInput, matchStats }).map((b) => b.id)).not.toContain("vincente");
    matchStats.push(stat({ won: true }));
    expect(computeBadges({ ...emptyInput, matchStats }).map((b) => b.id)).toContain("vincente");
  });

  it("in fiamme richiede 10+ punti in 3 partite consecutive (ordinate per data)", () => {
    const matchStats = [
      stat({ points: 12, date: new Date("2026-01-01") }),
      stat({ points: 11, date: new Date("2026-01-08") }),
      stat({ points: 3, date: new Date("2026-01-15") }), // rompe la serie
      stat({ points: 15, date: new Date("2026-01-22") }),
    ];
    expect(computeBadges({ ...emptyInput, matchStats }).map((b) => b.id)).not.toContain(
      "in_fiamme"
    );
    matchStats[2] = stat({ points: 20, date: new Date("2026-01-15") });
    expect(computeBadges({ ...emptyInput, matchStats }).map((b) => b.id)).toContain("in_fiamme");
  });

  it("mercenario con una partita in prestito", () => {
    expect(
      computeBadges({ ...emptyInput, matchStats: [stat({ isLoan: true })] }).map((b) => b.id)
    ).toContain("mercenario");
  });

  it("mira d'acciaio sbloccabile solo dagli R5", () => {
    const matchStats = [stat({ twoPointers: 4, freeThrows: 0, shotsAttempted: 5, points: 8 })];
    // 8 canestri-equivalenti? made = 4, attempted 5 → 80% ≥ 70%
    const r1 = computeBadges({ ...emptyInput, sportRole: 1, matchStats }).map((b) => b.id);
    const r5 = computeBadges({ ...emptyInput, sportRole: 5, matchStats }).map((b) => b.id);
    expect(r1).not.toContain("mira_acciaio");
    expect(r5).toContain("mira_acciaio");
  });
});

describe("getBadgeById", () => {
  it("ritorna i metadati del badge", () => {
    expect(getBadgeById("mvp")?.label).toBe("MVP");
  });
  it("ritorna undefined per id sconosciuto", () => {
    expect(getBadgeById("inesistente")).toBeUndefined();
  });
});

describe("traguardi degli allenamenti (UX-59)", () => {
  const training = (date: string, attended = true, season = "2025-26") => ({
    date: new Date(date),
    season,
    attended,
  });
  /** `n` allenamenti, uno a settimana dal 1° ottobre 2025. */
  const weekly = (n: number, attended: (i: number) => boolean = () => true) =>
    Array.from({ length: n }, (_, i) =>
      training(new Date(Date.UTC(2025, 9, 1 + i * 7, 17)).toISOString(), attended(i))
    );
  const ids = (input: Partial<StatsInput>) =>
    computeBadges({ ...emptyInput, currentSeason: "2026-27", ...input }).map((b) => b.id);

  it("10 presenze e nessuna partita: primo allenamento e 10 allenamenti", () => {
    const got = ids({ trainings: weekly(10) });
    expect(got).toContain("primo_allenamento");
    expect(got).toContain("dieci_allenamenti");
    expect(got).not.toContain("venticinque_allenamenti");
  });

  it("le soglie 25 e 50", () => {
    expect(ids({ trainings: weekly(25) })).toContain("venticinque_allenamenti");
    expect(ids({ trainings: weekly(49) })).not.toContain("cinquanta_allenamenti");
    expect(ids({ trainings: weekly(50) })).toContain("cinquanta_allenamenti");
  });

  it("le assenze e gli allenamenti senza presenza non contano", () => {
    const got = ids({ trainings: weekly(12, (i) => i < 9) });
    expect(got).toContain("primo_allenamento");
    expect(got).not.toContain("dieci_allenamenti");
  });

  it("senza allenamenti nessun traguardo, e la barra parte da zero", () => {
    expect(ids({})).toEqual([]);
    const locked = computeBadgeState(emptyInput).locked.find((b) => b.id === "dieci_allenamenti");
    expect(locked).toMatchObject({ current: 0, target: 10 });
  });

  it("mese pieno: tutti e 4 gli allenamenti di un mese", () => {
    const month = [
      training("2025-11-03T17:00:00Z"),
      training("2025-11-10T17:00:00Z"),
      training("2025-11-17T17:00:00Z"),
      training("2025-11-24T17:00:00Z"),
    ];
    expect(ids({ trainings: month })).toContain("mese_pieno");
    const missed = month.map((t, i) => (i === 2 ? { ...t, attended: false } : t));
    expect(ids({ trainings: missed })).not.toContain("mese_pieno");
  });

  it("mese pieno: un allenamento riservato a un'altra squadra non rompe il mese", () => {
    // 4 allenamenti nel mese, uno riservato a un'altra squadra: chi carica i
    // dati lo lascia fuori (non poteva iscriversi), quindi restano 3 su 3…
    const three = [
      training("2025-11-03T17:00:00Z"),
      training("2025-11-10T17:00:00Z"),
      training("2025-11-17T17:00:00Z"),
    ];
    // …e un mese di 3 non basta per la regola dei 4: serve il quarto a cui
    // poteva venire. Con l'allenamento congiunto del 24 il mese è pieno.
    expect(ids({ trainings: three })).not.toContain("mese_pieno");
    expect(ids({ trainings: [...three, training("2025-11-24T17:00:00Z")] })).toContain(
      "mese_pieno"
    );
  });

  it("mese pieno: il mese è quello di Roma", () => {
    // 31 ottobre alle 23:30 UTC è già il 1° novembre a Roma.
    const nov = [
      training("2025-10-31T23:30:00Z"),
      training("2025-11-10T17:00:00Z"),
      training("2025-11-17T17:00:00Z"),
      training("2025-11-24T17:00:00Z"),
    ];
    expect(ids({ trainings: nov })).toContain("mese_pieno");
  });

  it("stagione fedele: 80% di una stagione finita", () => {
    expect(ids({ trainings: weekly(20, (i) => i % 5 !== 0) })).toContain("stagione_fedele");
    expect(ids({ trainings: weekly(20, (i) => i % 4 !== 0) })).not.toContain("stagione_fedele");
  });

  it("stagione fedele: non nella stagione in corso", () => {
    const got = computeBadges({
      ...emptyInput,
      currentSeason: "2025-26",
      trainings: weekly(20),
    }).map((b) => b.id);
    expect(got).not.toContain("stagione_fedele");
  });

  it("stagione fedele: si conta dal primo allenamento in cui c'era", () => {
    // Arriva al 9° allenamento e poi non ne perde uno: 12 su 12 da lì.
    expect(ids({ trainings: weekly(20, (i) => i >= 8) })).toContain("stagione_fedele");
    // Arriva troppo tardi: meno di 10 allenamenti da contare.
    expect(ids({ trainings: weekly(20, (i) => i >= 12) })).not.toContain("stagione_fedele");
  });
});
