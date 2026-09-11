import { describe, it, expect } from "vitest";
import { lightTheme, darkTheme } from "./theme";
import { contrastRatio } from "@/lib/colorUtils";

describe("palette.adminBand", () => {
  it.each([
    ["chiaro", lightTheme],
    ["scuro", darkTheme],
  ])("tema %s: testo e accento AA, indicatore >= 3:1 sulla banda", (_, theme) => {
    const band = theme.palette.adminBand;
    expect(contrastRatio(band.text, band.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(band.accent, band.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(band.indicator, band.bg)).toBeGreaterThanOrEqual(3);
  });
});
