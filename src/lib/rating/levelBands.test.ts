import { describe, it, expect } from "vitest";
import { bandThresholds, levelBand } from "./levelBands";

describe("levelBand", () => {
  const roster = [10, 20, 30, 40, 50, 60].map((mu) => ({ sportRole: 3, mu, sigma: 0 }));
  const thresholds = bandThresholds(roster);

  it("divide il gruppo di ruolo in terzi", () => {
    expect(levelBand(3, { mu: 60, sigma: 0 }, thresholds)).toBe("alta");
    expect(levelBand(3, { mu: 35, sigma: 0 }, thresholds)).toBe("media");
    expect(levelBand(3, { mu: 10, sigma: 0 }, thresholds)).toBe("bassa");
  });

  it("usa il valore prudente: tanta incertezza abbassa la fascia", () => {
    expect(levelBand(3, { mu: 60, sigma: 10 }, thresholds)).toBe("media");
  });

  it("un gruppo con meno di tre valutati dà la fascia centrale", () => {
    expect(levelBand(5, { mu: 99, sigma: 0 }, thresholds)).toBe("media");
  });
});
