import { describe, expect, it } from "vitest";
import { formatDecimal } from "./numberFormat";

describe("formatDecimal", () => {
  it("usa la virgola in italiano e il punto in inglese", () => {
    expect(formatDecimal(17.66, "it")).toBe("17,7");
    expect(formatDecimal(17.66, "en")).toBe("17.7");
  });

  it("non aggiunge decimali inutili", () => {
    expect(formatDecimal(18, "it")).toBe("18");
    expect(formatDecimal(0, "it")).toBe("0");
  });

  it("rispetta il numero di decimali richiesto", () => {
    expect(formatDecimal(3.14159, "it", 2)).toBe("3,14");
  });
});
