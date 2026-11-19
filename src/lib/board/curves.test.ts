import { describe, expect, it } from "vitest";
import { drillContentSchema } from "@/lib/schemas/drill";
import { interpolateStep } from "./animation";
import { deriveArrows } from "./arrows";
import type { DrillContent } from "./content";
import {
  controlFromVia,
  isCurved,
  midpoint,
  pathLength,
  pathPoint,
  samplePath,
  trimPath,
} from "./curves";
import * as edit from "./editing";
import { PICK_AND_SHOOT } from "./fixtures";

const A = { x: 16, y: 4 };
const B = { x: 24, y: 4 };
const VIA = { x: 20, y: 7 };

/** Il 3 va dal passo 1 al passo 2 ad arco, e anche il passaggio dal 4 al 3 e' curvo. */
const curved = (): DrillContent => {
  let c = edit.setCurve(PICK_AND_SHOOT, 2, "a3", { x: 18, y: 7 }, "HALF");
  c = edit.setBallCurve(c, 1, { x: 18, y: 5 }, "HALF");
  return c;
};

describe("geometria dell'arco", () => {
  it("passa dal punto scelto a meta' strada e parte e arriva dove deve", () => {
    expect(pathPoint(A, B, VIA, 0)).toEqual(A);
    expect(pathPoint(A, B, VIA, 1)).toEqual(B);
    expect(pathPoint(A, B, VIA, 0.5)).toEqual(VIA);
    expect(controlFromVia(A, VIA, B)).toEqual({ x: 20, y: 10 });
  });

  it("senza punto e' dritto", () => {
    expect(pathPoint(A, B, undefined, 0.25)).toEqual({ x: 18, y: 4 });
    expect(samplePath(A, B, undefined)).toEqual([A, B]);
    expect(isCurved(A, B, undefined)).toBe(false);
    expect(isCurved(A, B, midpoint(A, B))).toBe(false);
    expect(isCurved(A, B, VIA)).toBe(true);
  });

  it("l'arco e' piu' lungo della corda e si accorcia ai capi", () => {
    const pts = samplePath(A, B, VIA);
    expect(pathLength(pts)).toBeGreaterThan(8);
    const trimmed = trimPath(pts, 1, 1)!;
    expect(pathLength(trimmed)).toBeCloseTo(pathLength(pts) - 2, 5);
    expect(trimPath([A, B], 5, 5)).toBeNull();
  });
});

describe("frecce e animazione", () => {
  it("la freccia porta il punto di passaggio, solo dove c'e'", () => {
    const c = curved();
    const step1 = deriveArrows(c, 1);
    expect(step1.find((a) => a.pieceId === "a3" && a.kind !== "shot")?.via).toEqual({
      x: 18,
      y: 7,
    });
    const pass = deriveArrows(c, 0).find((a) => a.kind === "pass");
    expect(pass?.via).toEqual({ x: 18, y: 5 });
    expect(deriveArrows(PICK_AND_SHOOT, 1).every((a) => a.via === undefined)).toBe(true);
  });

  it("la pedina segue l'arco, non la retta", () => {
    const c = curved();
    // A meta' tempo la pedina e' sul punto di passaggio (l'animazione e' simmetrica).
    const mid = interpolateStep(c, 1, 0.5).pieces.a3;
    expect(mid.x).toBeCloseTo(18, 5);
    expect(mid.y).toBeCloseTo(7, 5);
    const straight = interpolateStep(PICK_AND_SHOOT, 1, 0.5).pieces.a3;
    expect(straight).toMatchObject({ x: 17, y: 8.5 });
  });
});

describe("modifiche", () => {
  it("il primo passo non ha archi; si raddrizza con undefined", () => {
    expect(edit.setCurve(PICK_AND_SHOOT, 0, "a3", VIA, "HALF")).toBe(PICK_AND_SHOOT);
    const c = edit.setCurve(curved(), 2, "a3", undefined, "HALF");
    expect(c.steps[2].curves).toBeUndefined();
    expect(edit.setBallCurve(c, 1, undefined, "HALF").steps[1].ballCurve).toBeUndefined();
  });

  it("il punto resta dentro il campo", () => {
    const c = edit.setCurve(PICK_AND_SHOOT, 2, "a3", { x: 2, y: -3 }, "HALF");
    expect(c.steps[2].curves?.a3).toEqual({ x: 14, y: 0 });
  });

  it("togliendo un pezzo sparisce il suo arco", () => {
    expect(edit.removePiece(curved(), "a3").steps[2].curves).toBeUndefined();
  });

  it("togliendo o spostando un passo gli archi che non valgono piu' si raddrizzano", () => {
    const removed = edit.removeStep(curved(), 1);
    expect(removed.steps[1].curves).toBeUndefined();
    expect(removed.steps[0].ballCurve).toBeUndefined();
    const moved = edit.moveStep(curved(), 1, 1);
    expect(moved.steps.every((s) => !s.curves && !s.ballCurve)).toBe(true);
  });
});

describe("schema", () => {
  const half = drillContentSchema("HALF");

  it("accetta il contenuto con gli archi e quello vecchio senza", () => {
    expect(half.safeParse(curved()).success).toBe(true);
    expect(half.safeParse(PICK_AND_SHOOT).success).toBe(true);
  });

  it("rifiuta un arco sul primo passo, fuori dal campo o di un pezzo che non c'e'", () => {
    const base = curved();
    const withStep = (i: number, extra: object): DrillContent => ({
      ...base,
      steps: base.steps.map((s, j) => (j === i ? { ...s, ...extra } : s)),
    });
    expect(half.safeParse(withStep(0, { curves: { a3: { x: 18, y: 7 } } })).success).toBe(false);
    expect(half.safeParse(withStep(0, { ballCurve: { x: 18, y: 7 } })).success).toBe(false);
    expect(half.safeParse(withStep(2, { curves: { a3: { x: 5, y: 7 } } })).success).toBe(false);
    expect(half.safeParse(withStep(2, { curves: { zz: { x: 18, y: 7 } } })).success).toBe(false);
    expect(half.safeParse(withStep(1, { ballCurve: { x: 5, y: 5 } })).success).toBe(false);
  });
});
