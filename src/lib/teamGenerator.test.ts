// [CLAUDE - 09:00] Unit test per l'algoritmo deterministico di generazione squadre
import { describe, it, expect } from "vitest";
import { generateTeams, type Athlete } from "./teamGenerator";

const athletes: Athlete[] = [
  { id: "u1", name: "Alice",   role: 5 },
  { id: "u2", name: "Bob",     role: 5 },
  { id: "u3", name: "Carla",   role: 4 },
  { id: "u4", name: "Davide",  role: 4 },
  { id: "u5", name: "Elena",   role: 3 },
  { id: "u6", name: "Fabio",   role: 3 },
  { id: "u7", name: "Giada",   role: 2 },
  { id: "u8", name: "Hector",  role: 2 },
  { id: "u9", name: "Irene",   role: 1 },
  { id: "u10", name: "Luca",   role: 1 },
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

  it("atleti dello stesso ruolo sono distribuiti tra le squadre (bilanciamento)", () => {
    // Con 2 atleti per ruolo e 2 squadre, ogni squadra deve avere 1 per ruolo
    const result = generateTeams(athletes, "session-abc", 2);
    for (const role of [1, 2, 3, 4, 5]) {
      const inA = result.teamA.filter((a) => a.role === role).length;
      const inB = result.teamB.filter((a) => a.role === role).length;
      expect(inA + inB).toBe(2);
      expect(Math.abs(inA - inB)).toBeLessThanOrEqual(1);
    }
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
    const allIds = [...result.teamA, ...result.teamB, ...(result.teamC ?? [])].map((a) => a.id).sort();
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
