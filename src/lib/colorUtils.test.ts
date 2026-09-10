import { describe, it, expect } from "vitest";
import { contrastText, contrastRatio, readableOn } from "./colorUtils";

const WHITE = "#fff";
const DARK = "rgba(0,0,0,0.87)";

describe("contrastRatio", () => {
  it("calcola i rapporti WCAG noti", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#BF360C", "#F7F4F1")).toBeCloseTo(5.11, 1);
  });

  it("null se un colore non è parsabile", () => {
    expect(contrastRatio("primary.main", "#fff")).toBeNull();
  });
});

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
    expect(contrastText("#1565C0")).toBe(WHITE); // blu ROLE_COLORS
    expect(contrastText("#00f")).toBe(WHITE); // blu puro (shorthand)
    expect(contrastText("#546E7A")).toBe(WHITE); // blu-grigio squadra
  });

  it("sceglie il testo scuro sui verdi medi, dove YIQ sbagliava", () => {
    // Il verde dei Montekki: bianco farebbe circa 3,3:1, nero 6,4:1.
    expect(contrastText("#43A047")).toBe(DARK);
    expect(contrastText("#4CAF50")).toBe(DARK);
    // Stessa cosa per l'arancione brand usato come colore squadra:
    // bianco 3,79:1, nero 5,54:1.
    expect(contrastText("#E65100")).toBe(DARK);
  });

  it("il colore scelto è sempre quello col contrasto più alto", () => {
    for (const bg of ["#E65100", "#43A047", "#546E7A", "#FFC107", "#1565C0", "#7B1FA2"]) {
      const onWhite = contrastRatio(bg, "#ffffff")!;
      const onBlack = contrastRatio(bg, "#000000")!;
      expect(contrastText(bg)).toBe(onBlack >= onWhite ? DARK : WHITE);
    }
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

describe("readableOn", () => {
  it("scurisce finché il testo passa AA su fondo chiaro", () => {
    const bg = "#F7F4F1";
    for (const teamColor of ["#43A047", "#E65100", "#FFC107", "#4DD0E1"]) {
      const adjusted = readableOn(teamColor, bg);
      expect(contrastRatio(adjusted, bg)!).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("schiarisce su fondo scuro", () => {
    const bg = "#121212";
    for (const teamColor of ["#1565C0", "#C62828", "#1A1A1A"]) {
      const adjusted = readableOn(teamColor, bg);
      expect(contrastRatio(adjusted, bg)!).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("lascia stare i colori già leggibili", () => {
    expect(readableOn("#BF360C", "#F7F4F1")).toBe("#bf360c");
  });

  it("restituisce invariato ciò che non sa parsare (token di tema)", () => {
    expect(readableOn("primary.main", "#fff")).toBe("primary.main");
  });
});
