import { describe, it, expect } from "vitest";
import { groupCallupsByRole } from "./callupGroups";

const u = (name: string, sportRole: number | null, points = 0) => ({
  user: { name, sportRole },
  child: null,
  points,
});
const ch = (name: string, sportRole: number | null) => ({
  user: null,
  child: { name, sportRole },
  points: 0,
});

describe("groupCallupsByRole", () => {
  it("ruoli in ordine crescente, chi non ha un ruolo in fondo, nomi in ordine", () => {
    const groups = groupCallupsByRole([u("Zoe", 3), ch("Anna", null), u("Bea", 1), ch("Ada", 3)]);
    expect(groups.map((g) => g.role)).toEqual([1, 3, null]);
    expect(groups[1].list.map((c) => (c.user ?? c.child)?.name)).toEqual(["Ada", "Zoe"]);
  });

  it("con i punti: prima chi ha segnato di più, a parità il nome", () => {
    const groups = groupCallupsByRole(
      [u("Ugo", 2, 4), u("Ada", 2, 4), u("Leo", 2, 10)],
      (c) => c.points
    );
    expect(groups[0].list.map((c) => c.user?.name)).toEqual(["Leo", "Ada", "Ugo"]);
  });

  it("un ruolo fuori scala vale come non assegnato", () => {
    expect(groupCallupsByRole([u("Ugo", 7)])[0].role).toBeNull();
  });
});
