import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/colorUtils";
import { BRAND, NEUTRAL, OUTCOME, ROLE_FILL, TEAM } from "@/lib/palette";

// Le soglie di UX-29. Le distanze percettive (CIEDE2000, daltonismo) sono nel
// ticket: qui si tiene fermo il contrasto, che e' la parte che si rompe
// ritoccando un valore.
const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0;
const SURFACES_LIGHT = [NEUTRAL.light.paper, NEUTRAL.light.background];
const SURFACES_DARK = [NEUTRAL.dark.paper, NEUTRAL.dark.background, "#141414"];

describe("tinte squadra", () => {
  it.each(Object.entries(TEAM))(
    "%s regge l'etichetta bianca e il 3:1 su ogni superficie",
    (_, hex) => {
      expect(ratio(hex, BRAND.white)).toBeGreaterThanOrEqual(4.5);
      for (const s of [...SURFACES_LIGHT, ...SURFACES_DARK]) {
        expect(ratio(hex, s)).toBeGreaterThanOrEqual(3);
      }
    }
  );
});

describe("esiti", () => {
  it("in chiaro sono testo leggibile sul foglio, sul crema e sul loro fondo", () => {
    const o = OUTCOME.light;
    for (const [c, bg] of [
      [o.win, o.winBg],
      [o.loss, o.lossBg],
      [o.draw, o.drawBg],
    ]) {
      for (const s of [...SURFACES_LIGHT, bg]) expect(ratio(c, s)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c, o.onFill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("in scuro sono testo leggibile sulle superfici e sul loro fondo", () => {
    const o = OUTCOME.dark;
    for (const [c, bg] of [
      [o.win, o.winBg],
      [o.loss, o.lossBg],
      [o.draw, o.drawBg],
    ]) {
      for (const s of [NEUTRAL.dark.paper, NEUTRAL.dark.background, bg]) {
        expect(ratio(c, s)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("il pareggio non e' piu' l'arancio del marchio", () => {
    expect(OUTCOME.light.draw).not.toBe(BRAND.orangeOnLight);
    expect(OUTCOME.dark.draw).not.toBe(BRAND.orangeOnDark);
  });
});

describe("neutri", () => {
  it("il bordo dei campi regge il 3:1 (WCAG 1.4.11)", () => {
    for (const s of SURFACES_LIGHT)
      expect(ratio(NEUTRAL.light.borderControl, s)).toBeGreaterThanOrEqual(3);
    for (const s of [NEUTRAL.dark.paper, NEUTRAL.dark.background]) {
      expect(ratio(NEUTRAL.dark.borderControl, s)).toBeGreaterThanOrEqual(3);
    }
  });

  it("il badge del ruolo regge il numero bianco", () => {
    expect(ratio(ROLE_FILL, BRAND.white)).toBeGreaterThanOrEqual(4.5);
  });

  it("il grigio neutro regge l'etichetta bianca", () => {
    expect(ratio(NEUTRAL.grey, BRAND.white)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("manifest della PWA", () => {
  it("usa il marchio e il fondo del tema chiaro", () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "public", "manifest.json"), "utf8")
    ) as { theme_color: string; background_color: string };
    expect(manifest.theme_color).toBe(BRAND.orange);
    expect(manifest.background_color).toBe(NEUTRAL.light.background);
  });
});
