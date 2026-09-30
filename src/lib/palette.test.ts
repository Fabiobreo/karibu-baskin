import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/colorUtils";
import {
  BRAND,
  HERO,
  HERO_TEXT,
  NEUTRAL,
  OUTCOME,
  ROLE_COLORS,
  TEAM,
  TEAM_LABEL,
} from "@/lib/palette";

// Le soglie di UX-29. Le distanze percettive (CIEDE2000, daltonismo) sono nel
// ticket: qui si tiene fermo il contrasto, che e' la parte che si rompe
// ritoccando un valore.
const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0;
const SURFACES_LIGHT = [NEUTRAL.light.paper, NEUTRAL.light.background];
const SURFACES_DARK = [NEUTRAL.dark.paper, NEUTRAL.dark.background, "#141414"];

describe("tinte squadra", () => {
  // L'etichetta scura e' nero all'87%: sul fondo si vede come il fondo al 13%.
  const label = (tint: keyof typeof TEAM) => {
    if (TEAM_LABEL[tint] === BRAND.white) return BRAND.white;
    const hex = TEAM[tint].slice(1);
    return (
      "#" +
      [0, 2, 4]
        .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.13))
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("")
    );
  };

  it.each(Object.keys(TEAM) as (keyof typeof TEAM)[])(
    "%s regge la sua etichetta e il 3:1 sulle superfici",
    (tint) => {
      const hex = TEAM[tint];
      expect(ratio(hex, label(tint))).toBeGreaterThanOrEqual(4.5);
      for (const s of SURFACES_DARK) expect(ratio(hex, s)).toBeGreaterThanOrEqual(3);
      // L'Oro sulle superfici chiare usa l'anello TEAM_RING.
      if (tint !== "gold") {
        for (const s of SURFACES_LIGHT) expect(ratio(hex, s)).toBeGreaterThanOrEqual(3);
      }
    }
  );
});

describe("ruoli", () => {
  it.each(Object.entries(ROLE_COLORS))("il ruolo %s regge il numero bianco", (_, hex) => {
    expect(ratio(hex, BRAND.white)).toBeGreaterThanOrEqual(4.5);
  });
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

describe("fascia delle intestazioni", () => {
  it("regge il testo degli hero, anche il piu' smorzato", () => {
    for (const bg of [HERO.bandFrom, HERO.bandTo]) {
      expect(ratio(HERO_TEXT.primary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(HERO_TEXT.muted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("resta un gradino sopra il nero dell'header", () => {
    // Tono B scelto dal committente (30/09): lo stacco e' leggero di proposito,
    // la fascia deve restare nera, non diventare grigia.
    expect(ratio(HERO.bandFrom, BRAND.dark)).toBeGreaterThan(1.05);
    expect(ratio(HERO.bandTo, BRAND.dark)).toBeGreaterThan(1.1);
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
