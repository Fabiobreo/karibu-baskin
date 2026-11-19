import { describe, expect, it } from "vitest";
import { COURT_LINES, COURT_WIDTH, courtShapes, threePointStraight } from "./court";

describe("threePointStraight", () => {
  it("fa incontrare l'arco da 6,75 m con i tratti dritti a 0,9 m dal lato", () => {
    const straight = threePointStraight({
      hoopFromBaseline: COURT_LINES.hoopFromBaseline,
      threeR: COURT_LINES.three.r,
    });
    const dx = straight - COURT_LINES.hoopFromBaseline;
    const dy = COURT_WIDTH / 2 - COURT_LINES.three.fromSideline;
    expect(Math.hypot(dx, dy)).toBeCloseTo(COURT_LINES.three.r, 9);
    expect(straight).toBeCloseTo(2.99, 2);
  });
});

describe("courtShapes", () => {
  it("disegna zone, perimetro, meta' campo, cerchio, aree, linee da tre e quattro canestri", () => {
    const shapes = courtShapes();
    expect(shapes.filter((s) => s.kind === "path" && s.filled)).toHaveLength(2);
    expect(shapes.filter((s) => s.kind === "circle" && s.stroke === "thick")).toHaveLength(4);
    expect(shapes).toHaveLength(13);
  });

  it("usa la zona dei pivot vera, salvo richiesta diversa", () => {
    const line = (r?: number) =>
      courtShapes(r ? { pivotZoneR: r } : {}).find((s) => s.kind === "line");
    expect(line()).toMatchObject({ y1: 3, y2: COURT_WIDTH - 3 });
    expect(line(4)).toMatchObject({ y1: 4, y2: COURT_WIDTH - 4 });
  });

  // Lo schema di /il-baskin (UX-41) era scritto a mano in unita' da 11 per
  // metro, con il campo a (26, 24): passando dal modulo non deve cambiare.
  it("riproduce le misure dello schema di /il-baskin", () => {
    const U = 11;
    const shapes = courtShapes({ pivotZoneR: 42 / U, hoopR: 3.5 / U, sideHoopInset: 5 / U });
    const keys = shapes.filter((s) => s.kind === "rect" && s.stroke === "thin");
    for (const k of keys) {
      if (k.kind !== "rect") continue;
      expect(k.w * U).toBeCloseTo(63.8, 1);
      expect(k.h * U).toBeCloseTo(54, 0);
    }
    const hoops = shapes.filter((s) => s.kind === "circle" && s.stroke === "thick");
    const [left, , top] = hoops;
    if (left.kind !== "circle" || top.kind !== "circle") throw new Error("ferri mancanti");
    expect(left.cx * U).toBeCloseTo(17.3, 0);
    expect(left.r * U).toBeCloseTo(3.5, 9);
    expect(top.cy * U).toBeCloseTo(5, 9);
    const circle = shapes.find((s) => s.kind === "circle" && s.stroke === "thin");
    expect(circle?.kind === "circle" && circle.r * U).toBeCloseTo(19.8, 9);
    const straight = threePointStraight({
      hoopFromBaseline: COURT_LINES.hoopFromBaseline,
      threeR: COURT_LINES.three.r,
    });
    expect(straight * U).toBeCloseTo(32.9, 1);
    expect(COURT_LINES.three.r * U).toBeCloseTo(74.25, 9);
    expect(COURT_LINES.three.fromSideline * U).toBeCloseTo(9.9, 9);
  });
});
