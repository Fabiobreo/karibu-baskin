import { describe, expect, it } from "vitest";
import { assignSlots, type SlotTeam } from "./assign";
import type { DrillContent } from "./content";
import { PICK_AND_SHOOT } from "./fixtures";

const neri: SlotTeam = {
  key: "teamA",
  athletes: [
    { id: "r1", name: "Marco", role: 3 },
    { id: "r2", name: "Giulia", role: 3 },
    { id: "r3", name: "Luca", role: 4 },
    { id: "r4", name: "Sara", role: 5 },
  ],
};
const bianchi: SlotTeam = {
  key: "teamB",
  athletes: [
    { id: "r5", name: "Paolo", role: 4 },
    { id: "r6", name: "Anna", role: 2 },
  ],
};
const names = (r: ReturnType<typeof assignSlots>) =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.name]));

describe("assignSlots", () => {
  it("le pedine d'attacco prendono la squadra scelta, quelle di difesa l'altra, per ruolo", () => {
    const r = assignSlots(PICK_AND_SHOOT, { attack: neri, defense: bianchi, seed: "s1:d1" });
    expect(["Marco", "Giulia"]).toContain(r.a3.name);
    expect(names(r)).toMatchObject({ a4: "Luca", a5: "Sara", d4: "Paolo" });
    expect(r.c1).toBeUndefined();
  });

  it("stesso seme, stessi nomi; con due ruoli 3 il seme sceglie chi", () => {
    const pick = (seed: string) =>
      assignSlots(PICK_AND_SHOOT, { attack: neri, defense: null, seed }).a3.id;
    expect(pick("s1:d1")).toBe(pick("s1:d1"));
    const seen = new Set(Array.from({ length: 20 }, (_, i) => pick(`s${i}:d1`)));
    expect(seen).toEqual(new Set(["r1", "r2"]));
  });

  it("senza giocatori di quel ruolo la pedina resta senza nome", () => {
    const r = assignSlots(PICK_AND_SHOOT, { attack: bianchi, defense: neri, seed: "x" });
    expect(r.a3).toBeUndefined();
    expect(r.a5).toBeUndefined();
    expect(r.a4.name).toBe("Paolo");
    expect(r.d4.name).toBe("Luca");
  });

  it("valgono gli scambi dello staff, anche fra ruoli, e chi e' scambiato non si ripete", () => {
    const r = assignSlots(PICK_AND_SHOOT, {
      attack: neri,
      defense: null,
      seed: "s1:d1",
      assignments: { teamA: { a4: "r4", a5: "r3" } },
    });
    expect(names(r)).toMatchObject({ a4: "Sara", a5: "Luca" });
    expect(new Set(Object.values(r).map((a) => a.id)).size).toBe(Object.keys(r).length);
  });

  it("ignora gli scambi di chi non e' piu' in squadra o di un'altra squadra", () => {
    const r = assignSlots(PICK_AND_SHOOT, {
      attack: neri,
      defense: bianchi,
      seed: "s1:d1",
      assignments: { teamA: { a4: "sparito" }, teamB: { a4: "r3" } },
    });
    expect(r.a4.name).toBe("Luca");
  });

  it("pedine senza ruolo e allenatore non prendono nomi", () => {
    const c: DrillContent = {
      v: 1,
      pieces: [
        { id: "f1", kind: "free", side: "attack", label: "A" },
        { id: "k1", kind: "coach", coach: "tutor" },
      ],
      steps: [{ at: { f1: { x: 15, y: 5 }, k1: { x: 16, y: 5 } } }],
    };
    expect(assignSlots(c, { attack: neri, defense: bianchi, seed: "x" })).toEqual({});
  });
});
