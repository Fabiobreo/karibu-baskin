import { describe, expect, it } from "vitest";
import { drillContentSchema, EMPTY_DRILL_CONTENT } from "@/lib/schemas/drill";
import type { DrillContent } from "./content";
import {
  addPiece,
  addStep,
  clampContentToHalf,
  clampToCourt,
  dropBall,
  freeSpot,
  leaveFromStep,
  moveStep,
  movePiece,
  removePiece,
  removeStep,
  setScreen,
  setStepText,
} from "./editing";
import { PICK_AND_SHOOT } from "./fixtures";

const valid = (c: DrillContent, court: "FULL" | "HALF" = "HALF") =>
  drillContentSchema(court).safeParse(c).success;

describe("editing della lavagna", () => {
  it("un pezzo aggiunto al passo 2 e' fuori dal campo prima, in campo dopo", () => {
    const { content, id } = addPiece(PICK_AND_SHOOT, 1, { kind: "cone" }, { x: 20, y: 10 });
    expect(id).toBe("p1");
    expect(content.steps.map((s) => s.at[id])).toEqual([null, { x: 20, y: 10 }, { x: 20, y: 10 }]);
    expect(valid(content)).toBe(true);
  });

  it("togliere un pezzo toglie anche la palla in mano sua e i suoi blocchi", () => {
    const c = removePiece(PICK_AND_SHOOT, "a5");
    expect(c.steps[0].screens).toBeUndefined();
    const noBall = removePiece(PICK_AND_SHOOT, "a4");
    expect(noBall.steps[0].ball).toBeUndefined();
    expect(valid(noBall)).toBe(true);
    expect(noBall.pieces.some((p) => p.id === "a4")).toBe(false);
  });

  it("chi esce dal campo da un passo non c'e' piu' da li' in poi", () => {
    const c = leaveFromStep(PICK_AND_SHOOT, 1, "a3");
    expect(c.steps.map((s) => s.at.a3)).toEqual([{ x: 20, y: 4 }, null, null]);
    expect(c.steps[1].ball).toBeUndefined();
    expect(valid(c)).toBe(true);
  });

  it("spostare tiene i pezzi nella meta' campo", () => {
    const c = movePiece(PICK_AND_SHOOT, 0, "a3", { x: 2, y: -3 }, "HALF");
    expect(c.steps[0].at.a3).toEqual({ x: 14, y: 0 });
    expect(clampToCourt({ x: 30.123, y: 7.456 }, "FULL")).toEqual({ x: 28, y: 7.46 });
  });

  it("la palla lasciata vicino a un giocatore gli va in mano, lontano resta per terra", () => {
    expect(dropBall(PICK_AND_SHOOT, 0, { x: 19.7, y: 3.8 }, "HALF").steps[0].ball).toEqual({
      holder: "a3",
    });
    expect(dropBall(PICK_AND_SHOOT, 0, { x: 18, y: 11.8 }, "HALF").steps[0].ball).toEqual({
      x: 18,
      y: 11.8,
    });
  });

  it("un passo nuovo copia le posizioni e la palla, non il testo ne' i blocchi", () => {
    const c = addStep(PICK_AND_SHOOT, 0);
    expect(c.steps).toHaveLength(4);
    expect(c.steps[1].at).toEqual(PICK_AND_SHOOT.steps[0].at);
    expect(c.steps[1].ball).toEqual({ holder: "a4" });
    expect(c.steps[1].text).toBeUndefined();
    expect(c.steps[1].screens).toBeUndefined();
    // Dopo un tiro, la palla non c'e'.
    expect(addStep(PICK_AND_SHOOT, 2).steps[3].ball).toBeUndefined();
  });

  it("il primo passo non diventa mai un tiro", () => {
    const twoSteps: DrillContent = { ...PICK_AND_SHOOT, steps: PICK_AND_SHOOT.steps.slice(1) };
    expect(moveStep(twoSteps, 1, -1)).toBe(twoSteps);
    const c = removeStep(twoSteps, 0);
    expect(c.steps[0].ball).toBeUndefined();
    expect(removeStep(EMPTY_DRILL_CONTENT, 0)).toBe(EMPTY_DRILL_CONTENT);
  });

  it("testo vuoto = niente testo; un blocco per giocatore per passo", () => {
    expect(setStepText(PICK_AND_SHOOT, 0, "   ").steps[0].text).toBeUndefined();
    const c = setScreen(PICK_AND_SHOOT, 0, "a5", { x: 22, y: 6 }, "HALF");
    expect(c.steps[0].screens).toEqual([{ from: "a5", to: { x: 22, y: 6 } }]);
  });

  it("un posto libero non si sovrappone a un pezzo", () => {
    const p = freeSpot(PICK_AND_SHOOT, 0, "HALF");
    for (const q of Object.values(PICK_AND_SHOOT.steps[0].at)) {
      if (q) expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeGreaterThanOrEqual(1.2);
    }
  });

  it("passando a meta' campo tutto entra nella meta' di destra", () => {
    const full: DrillContent = structuredClone(PICK_AND_SHOOT);
    full.steps[0].at.a3 = { x: 3, y: 4 };
    full.steps[2].ball = { shot: "leftMain" };
    expect(valid(full, "HALF")).toBe(false);
    expect(valid(clampContentToHalf(full), "HALF")).toBe(true);
  });
});
