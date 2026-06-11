import { describe, it, expect } from "vitest";
import { contrastText } from "./colorUtils";

const WHITE = "#fff";
const DARK = "rgba(0,0,0,0.87)";

describe("contrastText", () => {
  it("restituisce testo scuro su sfondi chiari", () => {
    expect(contrastText("#ffffff")).toBe(DARK);
    expect(contrastText("#FFEB3B")).toBe(DARK); // giallo
    expect(contrastText("#fff59d")).toBe(DARK); // giallo chiaro
    expect(contrastText("#e0e0e0")).toBe(DARK); // grigio chiaro
    expect(contrastText("#0f0")).toBe(DARK); // verde puro (shorthand)
  });

  it("restituisce bianco su sfondi scuri", () => {
    expect(contrastText("#000000")).toBe(WHITE);
    expect(contrastText("#1A1A1A")).toBe(WHITE); // nero squadra
    expect(contrastText("#E65100")).toBe(WHITE); // arancione brand
    expect(contrastText("#1565C0")).toBe(WHITE); // blu ROLE_COLORS
    expect(contrastText("#00f")).toBe(WHITE); // blu puro (shorthand)
  });

  it("gestisce hex senza # e con spazi", () => {
    expect(contrastText(" #ffffff ")).toBe(DARK);
    expect(contrastText("1A1A1A")).toBe(WHITE);
  });

  it("fallback bianco per null/undefined/non parsabile (token tema)", () => {
    expect(contrastText(null)).toBe(WHITE);
    expect(contrastText(undefined)).toBe(WHITE);
    expect(contrastText("")).toBe(WHITE);
    expect(contrastText("primary.main")).toBe(WHITE);
    expect(contrastText("rgb(255,255,255)")).toBe(WHITE); // formato non supportato → fallback
  });
});
