import { describe, it, expect } from "vitest";
import { computeBadges, computeBadgeState, getBadgeById } from "./badges";

const emptyInput = { matchStats: [], mvpCount: 0, topScorerCount: 0 };

const stat = (
  over: Partial<{
    points: number;
    twoPointers: number;
    threePointers: number;
    freeThrows: number;
  }> = {}
) => ({
  points: 0,
  twoPointers: 0,
  threePointers: 0,
  freeThrows: 0,
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

describe("getBadgeById", () => {
  it("ritorna i metadati del badge", () => {
    expect(getBadgeById("mvp")?.label).toBe("MVP");
  });
  it("ritorna undefined per id sconosciuto", () => {
    expect(getBadgeById("inesistente")).toBeUndefined();
  });
});
