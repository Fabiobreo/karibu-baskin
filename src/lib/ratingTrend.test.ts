import { describe, it, expect } from "vitest";
import { classifyTrend } from "./ratingTrend";

describe("classifyTrend", () => {
  it("serie troppo corta → 'nuovo'", () => {
    expect(classifyTrend([25, 26, 27]).label).toBe("nuovo");
    expect(classifyTrend([]).label).toBe("nuovo");
  });

  it("serie crescente → 'crescita'", () => {
    expect(classifyTrend([20, 23, 26, 29, 32]).label).toBe("crescita");
  });

  it("serie decrescente → 'calo'", () => {
    expect(classifyTrend([32, 29, 26, 23, 20]).label).toBe("calo");
  });

  it("serie piatta → 'plateau'", () => {
    expect(classifyTrend([25, 25.1, 24.9, 25, 25.05]).label).toBe("plateau");
  });

  it("serie oscillante senza trend → 'altalenante'", () => {
    expect(classifyTrend([25, 31, 24, 32, 23, 30]).label).toBe("altalenante");
  });

  it("slope positivo riportato per una crescita", () => {
    const r = classifyTrend([10, 15, 20, 25, 30]);
    expect(r.slope).toBeGreaterThan(0);
    expect(r.totalTrend).toBeGreaterThan(0);
  });

  it("la volatilità è ~0 per una serie perfettamente lineare", () => {
    const r = classifyTrend([10, 12, 14, 16, 18]);
    expect(r.volatility).toBeCloseTo(0, 6);
  });
});
