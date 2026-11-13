import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * Simulatore lato server (KB-40).
 *
 * Il TrueSkill è visibile solo allo staff ma il simulatore è per tutti i
 * tesserati: questi test verificano che il calcolo resti possibile senza che il
 * rating esca, e che non si possa usare il simulatore per leggere il rating
 * relativo di due singole persone.
 */

type Row = {
  id: string;
  sportRole: number;
  gender: "MALE" | "FEMALE";
  ratingMu: number | null;
};

const db = vi.hoisted(() => ({ users: [] as Row[], children: [] as Row[] }));

vi.mock("@/lib/db", () => {
  const pick = (rows: Row[]) =>
    vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      rows.filter((r) => where.id.in.includes(r.id))
    );
  return {
    prisma: {
      user: { findMany: vi.fn((args) => pick(db.users)(args)) },
      child: { findMany: vi.fn((args) => pick(db.children)(args)) },
    },
  };
});

import { runMatchSimulation, runSimulation } from "./simulatorServer";
import { quarterPlan } from "@/lib/games/sfida";
import { mulberry32 } from "@/lib/seededRandom";

// Formazione Baskin valida: 6 giocatori, un solo ruolo 1-2, somma ruoli ≤ 23,
// almeno un ruolo 3, almeno due ruoli 5, uomini e donne tra i ruoli 4 e 5.
function lineup(prefix: string, mu: number): Row[] {
  const spec: [number, "MALE" | "FEMALE"][] = [
    [1, "MALE"],
    [3, "MALE"],
    [3, "FEMALE"],
    [4, "FEMALE"],
    [5, "MALE"],
    [5, "MALE"],
  ];
  return spec.map(([sportRole, gender], i) => ({
    id: `${prefix}${i}`,
    sportRole,
    gender,
    ratingMu: mu,
  }));
}

const keys = (rows: Row[], kind = "user") => rows.map((r) => `${kind}-${r.id}`);

describe("runSimulation", () => {
  const teamA = lineup("a", 30);
  const teamB = lineup("b", 20);

  beforeEach(() => {
    db.users = [...teamA, ...teamB];
    db.children = [];
  });

  it("simula due formazioni valide e restituisce solo dati aggregati", async () => {
    const outcome = await runSimulation(keys(teamA), keys(teamB), 0);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(Object.keys(outcome.result).sort()).toEqual(
      ["label", "scoreA", "scoreB", "winProbabilityA", "winner"].sort()
    );
    // La squadra con rating più alto è favorita.
    expect(outcome.result.winProbabilityA).toBeGreaterThan(0.5);
  });

  it("è riproducibile: stesse formazioni e stesso nonce danno lo stesso risultato", async () => {
    const first = await runSimulation(keys(teamA), keys(teamB), 3);
    const second = await runSimulation(keys(teamA), keys(teamB), 3);
    expect(first).toEqual(second);
  });

  it("rifiuta una sfida uno contro uno, che rivelerebbe il rating relativo di due persone", async () => {
    const outcome = await runSimulation(["user-a0"], ["user-b0"], 0);
    expect(outcome).toEqual({ ok: false, reason: "invalid-lineup" });
  });

  it("rifiuta un giocatore schierato in entrambe le squadre", async () => {
    const b = keys(teamB);
    b[0] = "user-a0";
    expect(await runSimulation(keys(teamA), b, 0)).toEqual({ ok: false, reason: "invalid-keys" });
  });

  it("rifiuta chiavi malformate", async () => {
    const a = keys(teamA);
    a[0] = "admin-a0";
    expect(await runSimulation(a, keys(teamB), 0)).toEqual({ ok: false, reason: "invalid-keys" });
  });

  it("rifiuta giocatori inesistenti", async () => {
    const a = keys(teamA);
    a[0] = "user-sconosciuto";
    expect(await runSimulation(a, keys(teamB), 0)).toEqual({ ok: false, reason: "invalid-keys" });
  });

  it("accetta figli senza account nelle formazioni", async () => {
    db.users = [...teamB];
    db.children = [...teamA];
    const outcome = await runSimulation(keys(teamA, "child"), keys(teamB), 0);
    expect(outcome.ok).toBe(true);
  });
});

describe("runMatchSimulation (partita intera, UX-69)", () => {
  // Rose da 9: con 8 e due pivot i 4 tempi non si coprono.
  function squad(prefix: string, mu: number): Row[] {
    const spec: [number, "MALE" | "FEMALE"][] = [
      [1, "MALE"],
      [2, "FEMALE"],
      [3, "MALE"],
      [3, "FEMALE"],
      [4, "FEMALE"],
      [4, "MALE"],
      [5, "MALE"],
      [5, "MALE"],
      [5, "FEMALE"],
    ];
    return spec.map(([sportRole, gender], i) => ({
      id: `${prefix}${i}`,
      sportRole,
      gender,
      ratingMu: mu,
    }));
  }
  const A = squad("fa", 30);
  const B = squad("fb", 20);
  const quarters = (rows: Row[]) =>
    quarterPlan(
      rows.map((r) => ({ key: `user-${r.id}`, sportRole: r.sportRole, gender: r.gender })),
      mulberry32(9)
    )!.map((l) => l.map((p) => p.key));

  beforeEach(() => {
    db.users = [...A, ...B];
    db.children = [];
  });

  it("4 tempi, punteggi sommati, nessun pareggio e nessuna probabilità", async () => {
    const r = await runMatchSimulation(quarters(A), quarters(B), 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.quarters).toHaveLength(4);
    expect(r.result.scoreA).toBe(r.result.quarters.reduce((s, q) => s + q.a, 0));
    expect(r.result.scoreB).toBe(r.result.quarters.reduce((s, q) => s + q.b, 0));
    expect(r.result.scoreA).not.toBe(r.result.scoreB);
    expect(Object.keys(r.result)).not.toContain("winProbabilityA");
    expect(JSON.stringify(r.result)).not.toMatch(/mu|rating/i);
  });

  it("stessi tempi e stesso nonce danno lo stesso risultato", async () => {
    const one = await runMatchSimulation(quarters(A), quarters(B), 5);
    const two = await runMatchSimulation(quarters(A), quarters(B), 5);
    expect(one).toEqual(two);
  });

  it("rifiuta chi gioca da tutti e due i lati", async () => {
    const shared = quarters(B);
    shared[0] = [...shared[0].slice(1), `user-${A[1].id}`];
    expect((await runMatchSimulation(quarters(A), shared, 1)).ok).toBe(false);
  });

  it("accetta chi gioca tutti e quattro i tempi", async () => {
    const same = quarters(A).map(() => quarters(A)[0]);
    expect((await runMatchSimulation(same, quarters(B), 1)).ok).toBe(true);
  });

  it("rifiuta un tempo non valido", async () => {
    const bad = quarters(A);
    bad[2] = bad[2].slice(0, 5);
    expect((await runMatchSimulation(bad, quarters(B), 1)).ok).toBe(false);
  });
});
