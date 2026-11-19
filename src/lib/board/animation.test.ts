import { describe, expect, it } from "vitest";
import { easeInOut, interpolateStep } from "./animation";
import { shotTargetPoint } from "./content";
import { PICK_AND_SHOOT } from "./fixtures";

const hand = (p: { x: number; y: number }) => ({ x: p.x, y: p.y, hand: 1 });

describe("easeInOut", () => {
  it("parte e arriva fermo, a meta' e' a meta'", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe("interpolateStep", () => {
  it("con t = 0 e' il passo, con t = 1 e' il passo dopo", () => {
    const start = interpolateStep(PICK_AND_SHOOT, 0, 0);
    expect(start.pieces.a3).toEqual({ x: 20, y: 4, opacity: 1 });
    expect(start.ball).toEqual(hand({ x: 16, y: 7.5 }));
    const end = interpolateStep(PICK_AND_SHOOT, 0, 1);
    expect(end.pieces.a3).toEqual({ x: 19, y: 6, opacity: 1 });
    expect(end.ball).toEqual(hand({ x: 19, y: 6 }));
  });

  it("a meta' i pezzi sono a meta' strada", () => {
    expect(interpolateStep(PICK_AND_SHOOT, 0, 0.5).pieces.a3).toEqual({
      x: 19.5,
      y: 5,
      opacity: 1,
    });
  });

  it("la palla resta al passatore fino a meta', poi vola", () => {
    const early = interpolateStep(PICK_AND_SHOOT, 0, 0.4);
    expect(early.ball).toEqual(hand(early.pieces.a4));
    const late = interpolateStep(PICK_AND_SHOOT, 0, 0.75);
    expect(late.ball).not.toEqual(hand(late.pieces.a4));
    expect(late.ball).not.toEqual(hand(late.pieces.a3));
  });

  it("il tiro finisce nel ferro", () => {
    expect(interpolateStep(PICK_AND_SHOOT, 1, 1).ball).toEqual({
      ...shotTargetPoint("bottomSide"),
      hand: 0,
    });
    expect(interpolateStep(PICK_AND_SHOOT, 2, 0).ball).toEqual({
      ...shotTargetPoint("bottomSide"),
      hand: 0,
    });
  });

  it("chi esce sfuma sul posto, chi entra compare sul posto", () => {
    const c = structuredClone(PICK_AND_SHOOT);
    c.steps[1].at.d4 = null;
    expect(interpolateStep(c, 0, 0.25).pieces.d4).toEqual({ x: 21, y: 4.5, opacity: 0.75 });
    expect(interpolateStep(c, 1, 0.25).pieces.d4).toEqual({ x: 21, y: 4.5, opacity: 0.25 });
    expect(interpolateStep(c, 1, 0).pieces.d4).toBeUndefined();
  });

  it("sull'ultimo passo t non conta, e un passo che non c'e' e' vuoto", () => {
    expect(interpolateStep(PICK_AND_SHOOT, 2, 0.7)).toEqual(interpolateStep(PICK_AND_SHOOT, 2, 0));
    expect(interpolateStep(PICK_AND_SHOOT, 5)).toEqual({ pieces: {}, ball: null });
  });
});
