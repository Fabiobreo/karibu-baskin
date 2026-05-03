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

  it("band bassa (R1-R2) e alta (R3-R5) sono distribuite in modo bilanciato", () => {
    // L'algoritmo distribuisce per fasce (low/high), non per singolo ruolo
    const result = generateTeams(athletes, "session-abc", 2);
    const lowA = result.teamA.filter((a) => a.role <= 2).length;
    const lowB = result.teamB.filter((a) => a.role <= 2).length;
    const highA = result.teamA.filter((a) => a.role >= 3).length;
    const highB = result.teamB.filter((a) => a.role >= 3).length;
    expect(lowA + lowB).toBe(4);   // 2 atleti per ruolo × 2 ruoli bassi
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
    const allIds = [
      ...result.teamA,
      ...result.teamB,
      ...(result.teamC ?? []),
    ].map((a) => a.id).sort();
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
