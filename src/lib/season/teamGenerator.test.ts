import { describe, it, expect } from "vitest";
import { generateTeams, type Athlete } from "./teamGenerator";

const athletes: Athlete[] = [
  { id: "u1", name: "Alice", role: 5 },
  { id: "u2", name: "Bob", role: 5 },
  { id: "u3", name: "Carla", role: 4 },
  { id: "u4", name: "Davide", role: 4 },
  { id: "u5", name: "Elena", role: 3 },
  { id: "u6", name: "Fabio", role: 3 },
  { id: "u7", name: "Giada", role: 2 },
  { id: "u8", name: "Hector", role: 2 },
  { id: "u9", name: "Irene", role: 1 },
  { id: "u10", name: "Luca", role: 1 },
];

describe("generateTeams — 2 squadre", () => {
  it("produce esattamente 2 squadre", () => {
    const result = generateTeams(athletes, "session-abc", 2);
    expect(result.numTeams).toBe(2);
    expect(result.teamA).toBeDefined();
    expect(result.teamB).toBeDefined();
    expect(result.teamC).toBeUndefined();
  });

  it("tutti gli atleti sono distribuiti (nessuno mancante)", () => {
    const result = generateTeams(athletes, "session-abc", 2);
    const allIds = [...result.teamA, ...result.teamB].map((a) => a.id).sort();
    expect(allIds).toEqual(athletes.map((a) => a.id).sort());
  });

  it("nessun atleta è duplicato", () => {
    const result = generateTeams(athletes, "session-abc", 2);
    const allIds = [...result.teamA, ...result.teamB].map((a) => a.id);
    const unique = new Set(allIds);
    expect(unique.size).toBe(athletes.length);
  });

  it("il risultato è deterministico: stesso seed → stesse squadre", () => {
    const r1 = generateTeams(athletes, "session-xyz", 2);
    const r2 = generateTeams(athletes, "session-xyz", 2);
    expect(r1.teamA.map((a) => a.id)).toEqual(r2.teamA.map((a) => a.id));
    expect(r1.teamB.map((a) => a.id)).toEqual(r2.teamB.map((a) => a.id));
  });

  it("seed diverso produce risultati diversi", () => {
    const r1 = generateTeams(athletes, "session-111", 2);
    const r2 = generateTeams(athletes, "session-222", 2);
    // Con 10 atleti e 2 seed diversi è praticamente impossibile ottenere lo stesso ordine
    const ids1 = r1.teamA.map((a) => a.id).join(",");
    const ids2 = r2.teamA.map((a) => a.id).join(",");
    expect(ids1).not.toEqual(ids2);
  });

  it("band bassa (R1-R2) e alta (R3-R5) sono distribuite in modo bilanciato", () => {
    // L'algoritmo distribuisce per fasce (low/high), non per singolo ruolo
    const result = generateTeams(athletes, "session-abc", 2);
    const lowA = result.teamA.filter((a) => a.role <= 2).length;
    const lowB = result.teamB.filter((a) => a.role <= 2).length;
    const highA = result.teamA.filter((a) => a.role >= 3).length;
    const highB = result.teamB.filter((a) => a.role >= 3).length;
    expect(lowA + lowB).toBe(4); // 2 atleti per ruolo × 2 ruoli bassi
    expect(highA + highB).toBe(6); // 2 atleti per ruolo × 3 ruoli alti
    expect(Math.abs(lowA - lowB)).toBeLessThanOrEqual(1);
    expect(Math.abs(highA - highB)).toBeLessThanOrEqual(1);
    // Totale: max 1 di differenza tra le squadre
    expect(Math.abs(result.teamA.length - result.teamB.length)).toBeLessThanOrEqual(1);
  });
});

describe("generateTeams — 3 squadre", () => {
  it("produce esattamente 3 squadre", () => {
    const result = generateTeams(athletes, "session-abc", 3);
    expect(result.numTeams).toBe(3);
    expect(result.teamA).toBeDefined();
    expect(result.teamB).toBeDefined();
    expect(result.teamC).toBeDefined();
  });

  it("tutti gli atleti sono distribuiti tra 3 squadre", () => {
    const result = generateTeams(athletes, "session-abc", 3);
    const allIds = [...result.teamA, ...result.teamB, ...(result.teamC ?? [])]
      .map((a) => a.id)
      .sort();
    expect(allIds).toEqual(athletes.map((a) => a.id).sort());
  });

  it("nessun atleta è duplicato in 3 squadre", () => {
    const result = generateTeams(athletes, "session-abc", 3);
    const allIds = [...result.teamA, ...result.teamB, ...(result.teamC ?? [])].map((a) => a.id);
    expect(new Set(allIds).size).toBe(athletes.length);
  });

  it("determinismo garantito anche con 3 squadre", () => {
    const r1 = generateTeams(athletes, "session-3teams", 3);
    const r2 = generateTeams(athletes, "session-3teams", 3);
    expect(r1.teamA.map((a) => a.id)).toEqual(r2.teamA.map((a) => a.id));
    expect(r1.teamB.map((a) => a.id)).toEqual(r2.teamB.map((a) => a.id));
    expect(r1.teamC?.map((a) => a.id)).toEqual(r2.teamC?.map((a) => a.id));
  });

  it("differenza massima 1 tra le 3 squadre (bilanciamento)", () => {
    const result = generateTeams(athletes, "session-3teams-balance", 3);
    const sizes = [result.teamA.length, result.teamB.length, (result.teamC ?? []).length];
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("step 4 — corregge sbilanciamento quando low e high leftovers finiscono nella stessa squadra", () => {
    // 4 atleti role 1 (low) + 4 atleti role 3 (high): con 3 squadre base=1 per ruolo
    // → 1 leftover per gruppo, entrambi assegnati alla stessa squadra (team A) → [4,2,2]
    // step 4 sposta un atleta → max-min ≤ 1
    const uneven: Athlete[] = [
      { id: "a1", name: "A1", role: 1 },
      { id: "a2", name: "A2", role: 1 },
      { id: "a3", name: "A3", role: 1 },
      { id: "a4", name: "A4", role: 1 },
      { id: "b1", name: "B1", role: 3 },
      { id: "b2", name: "B2", role: 3 },
      { id: "b3", name: "B3", role: 3 },
      { id: "b4", name: "B4", role: 3 },
    ];
    const result = generateTeams(uneven, "session-step4", 3);
    const sizes = [result.teamA.length, result.teamB.length, (result.teamC ?? []).length];
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    const allIds = [...result.teamA, ...result.teamB, ...(result.teamC ?? [])]
      .map((a) => a.id)
      .sort();
    expect(allIds).toEqual(uneven.map((a) => a.id).sort());
  });
});

describe("generateTeams — edge case", () => {
  it("lista vuota → squadre vuote senza errori", () => {
    const result = generateTeams([], "session-empty", 2);
    expect(result.teamA).toEqual([]);
    expect(result.teamB).toEqual([]);
  });

  it("un solo atleta → finisce nella prima squadra", () => {
    const single = [{ id: "solo", name: "Solo", role: 3 }];
    const result = generateTeams(single, "session-solo", 2);
    const all = [...result.teamA, ...result.teamB];
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("solo");
  });

  it("atleti con ruoli misti/dispari distribuiti senza errori", () => {
    const odd: Athlete[] = [
      { id: "a1", name: "A", role: 1 },
      { id: "a2", name: "B", role: 1 },
      { id: "a3", name: "C", role: 1 }, // 3 atleti ruolo 1 → 2+1 nelle squadre
    ];
    const result = generateTeams(odd, "session-odd", 2);
    const all = [...result.teamA, ...result.teamB];
    expect(all).toHaveLength(3);
    expect(new Set(all.map((a) => a.id)).size).toBe(3);
  });
});

describe("generateTeams — layer skill (TrueSkill)", () => {
  const sumRating = (team: Athlete[]) => team.reduce((s, a) => s + (a.rating ?? 25), 0);

  it("avvicina il totale μ delle due squadre rispetto a una distribuzione sbilanciata", () => {
    // Due forti e due deboli per ruolo: senza skill layer potrebbero finire insieme.
    const rated: Athlete[] = [
      { id: "s1", name: "S1", role: 3, gender: "MALE", rating: 40 },
      { id: "w1", name: "W1", role: 3, gender: "MALE", rating: 10 },
      { id: "s2", name: "S2", role: 3, gender: "MALE", rating: 38 },
      { id: "w2", name: "W2", role: 3, gender: "MALE", rating: 12 },
      { id: "s3", name: "S3", role: 5, gender: "MALE", rating: 35 },
      { id: "w3", name: "W3", role: 5, gender: "MALE", rating: 15 },
      { id: "s4", name: "S4", role: 5, gender: "MALE", rating: 33 },
      { id: "w4", name: "W4", role: 5, gender: "MALE", rating: 17 },
    ];
    const result = generateTeams(rated, "skill-1", 2);
    const diff = Math.abs(sumRating(result.teamA) - sumRating(result.teamB));
    // Con scambi stesso-ruolo lo sbilanciamento di skill resta contenuto.
    expect(diff).toBeLessThanOrEqual(10);
  });

  it("preserva la distribuzione strutturale per ruolo", () => {
    const rated: Athlete[] = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      role: i < 4 ? 3 : 5,
      gender: "MALE",
      rating: 10 + i * 5,
    }));
    const result = generateTeams(rated, "skill-2", 2);
    const r3A = result.teamA.filter((a) => a.role === 3).length;
    const r3B = result.teamB.filter((a) => a.role === 3).length;
    expect(Math.abs(r3A - r3B)).toBeLessThanOrEqual(1);
  });

  it("è deterministico anche con i rating", () => {
    const rated: Athlete[] = [
      { id: "a", name: "A", role: 3, gender: "MALE", rating: 30 },
      { id: "b", name: "B", role: 3, gender: "MALE", rating: 20 },
      { id: "c", name: "C", role: 3, gender: "MALE", rating: 28 },
      { id: "d", name: "D", role: 3, gender: "MALE", rating: 22 },
    ];
    const r1 = generateTeams(rated, "skill-det", 2);
    const r2 = generateTeams(rated, "skill-det", 2);
    expect(r1.teamA.map((a) => a.id)).toEqual(r2.teamA.map((a) => a.id));
  });

  it("nessun atleta valutato → comportamento invariato (no-op)", () => {
    const plain: Athlete[] = [
      { id: "a1", name: "A", role: 3 },
      { id: "a2", name: "B", role: 3 },
      { id: "a3", name: "C", role: 5 },
      { id: "a4", name: "D", role: 5 },
    ];
    const withLayer = generateTeams(plain, "noop", 2);
    expect(withLayer.teamA.length + withLayer.teamB.length).toBe(4);
  });
});

describe("generateTeams — bilanciamento per singolo ruolo", () => {
  const countRole = (team: Athlete[], role: number) => team.filter((a) => a.role === role).length;
  const teamsOf = (r: ReturnType<typeof generateTeams>) => [
    r.teamA,
    r.teamB,
    ...(r.teamC ? [r.teamC] : []),
  ];

  it("4 donne R4 + 1 donna R5 + 4 uomini R5 → ruoli pari (regressione: pool donne R4+R5 unico)", () => {
    // Composizione reale di un allenamento: prima della correzione il pool
    // femminile R4+R5 veniva distribuito contando solo le donne, e la donna R5
    // rubava il turno a una R4 → 3-1 su R4 e 2-3 su R5.
    const roster: Athlete[] = [
      { id: "w4a", name: "W4a", role: 4, gender: "FEMALE" },
      { id: "w4b", name: "W4b", role: 4, gender: "FEMALE" },
      { id: "w4c", name: "W4c", role: 4, gender: "FEMALE" },
      { id: "w4d", name: "W4d", role: 4, gender: "FEMALE" },
      { id: "w5", name: "W5", role: 5, gender: "FEMALE" },
      { id: "m5a", name: "M5a", role: 5, gender: "MALE" },
      { id: "m5b", name: "M5b", role: 5, gender: "MALE" },
      { id: "m5c", name: "M5c", role: 5, gender: "MALE" },
      { id: "m5d", name: "M5d", role: 5, gender: "MALE" },
    ];
    for (let seed = 0; seed < 30; seed++) {
      const result = generateTeams(roster, `prod-like-${seed}`, 2);
      expect(Math.abs(countRole(result.teamA, 4) - countRole(result.teamB, 4))).toBeLessThanOrEqual(
        1
      );
      expect(Math.abs(countRole(result.teamA, 5) - countRole(result.teamB, 5))).toBeLessThanOrEqual(
        1
      );
    }
  });

  it("ogni ruolo resta entro 1 di differenza su roster casuali (2 e 3 squadre)", () => {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let n = 0; n < 200; n++) {
      const size = 6 + Math.floor(rand() * 25);
      const roster: Athlete[] = Array.from({ length: size }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        role: 1 + Math.floor(rand() * 5),
        gender: rand() < 0.4 ? "FEMALE" : "MALE",
        rating: rand() < 0.7 ? 15 + rand() * 20 : null,
      }));
      for (const numTeams of [2, 3] as const) {
        const teams = teamsOf(generateTeams(roster, `rnd-${n}`, numTeams));
        for (let role = 1; role <= 5; role++) {
          const counts = teams.map((t) => countRole(t, role));
          expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        }
        const sizes = teams.map((t) => t.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(teams.flat()).toHaveLength(size);
      }
    }
  });

  it("le donne R4-R5 restano distribuite entro 1 dopo la riparazione dei ruoli", () => {
    const roster: Athlete[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `w${i}`,
        name: `W${i}`,
        role: 4 + (i % 2),
        gender: "FEMALE",
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `m${i}`,
        name: `M${i}`,
        role: 3 + (i % 3),
        gender: "MALE",
      })),
    ];
    for (let seed = 0; seed < 20; seed++) {
      const teams = teamsOf(generateTeams(roster, `women-${seed}`, 2));
      const women = teams.map((t) => t.filter((a) => a.gender === "FEMALE" && a.role >= 4).length);
      expect(Math.max(...women) - Math.min(...women)).toBeLessThanOrEqual(1);
    }
  });
});
