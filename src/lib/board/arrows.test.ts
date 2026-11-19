import { describe, expect, it } from "vitest";
import { deriveArrows, MIN_MOVE } from "./arrows";
import { shotTargetPoint, type DrillContent } from "./content";
import { PICK_AND_SHOOT } from "./fixtures";

const kinds = (content: DrillContent, i: number) =>
  deriveArrows(content, i).map((a) => `${a.kind}:${a.pieceId ?? "-"}`);

describe("deriveArrows", () => {
  it("passo 1: chi porta palla palleggia, chi va a bloccare si muove, il blocco e' del passo", () => {
    expect(kinds(PICK_AND_SHOOT, 0).sort()).toEqual(
      ["screen:a5", "move:a3", "move:a5", "pass:a4", "move:a4"].sort()
    );
  });

  it("il passaggio va da dove era il passatore a dove arriva chi riceve", () => {
    const pass = deriveArrows(PICK_AND_SHOOT, 0).find((a) => a.kind === "pass");
    expect(pass).toMatchObject({ from: { x: 16, y: 7.5 }, to: { x: 19, y: 6 } });
  });

  it("chi palleggia e poi tira: palleggio fino al punto, poi il tiro da li'", () => {
    const arrows = deriveArrows(PICK_AND_SHOOT, 1);
    expect(arrows.find((a) => a.pieceId === "a3" && a.kind === "dribble")).toMatchObject({
      from: { x: 19, y: 6 },
      to: { x: 15, y: 11 },
    });
    expect(arrows.find((a) => a.kind === "shot")).toMatchObject({
      from: { x: 15, y: 11 },
      to: shotTargetPoint("bottomSide"),
    });
  });

  it("i pezzi fermi e il cono non hanno frecce; l'ultimo passo solo i blocchi", () => {
    expect(kinds(PICK_AND_SHOOT, 1).some((k) => k.endsWith(":c1") || k.endsWith(":d4"))).toBe(
      false
    );
    expect(deriveArrows(PICK_AND_SHOOT, 2)).toEqual([]);
    expect(deriveArrows(PICK_AND_SHOOT, 9)).toEqual([]);
  });

  it("chi tiene la palla e si sposta palleggia, senza passaggio", () => {
    const c = structuredClone(PICK_AND_SHOOT);
    c.steps[1].ball = { holder: "a4" };
    expect(kinds(c, 0)).toContain("dribble:a4");
    expect(kinds(c, 0).some((k) => k.startsWith("pass"))).toBe(false);
  });

  it("sotto i 10 cm non e' un movimento", () => {
    const c = structuredClone(PICK_AND_SHOOT);
    c.steps[1].at.a3 = { x: 20 + MIN_MOVE / 2, y: 4 };
    c.steps[1].ball = { holder: "a4" };
    c.steps[1].at.a4 = { x: 16, y: 7.5 };
    expect(kinds(c, 0)).not.toContain("move:a3");
  });

  it("chi entra o esce dal campo non ha frecce", () => {
    const c = structuredClone(PICK_AND_SHOOT);
    c.steps[1].at.d4 = null;
    expect(kinds(c, 0)).not.toContain("move:d4");
  });
});
