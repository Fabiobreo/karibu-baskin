import { describe, expect, it } from "vitest";
import { MATCHES_SECTIONS, matchesSectionHref } from "./sectionNav";

describe("matchesSectionHref", () => {
  it("senza stagione scelta restituisce l'indirizzo pulito", () => {
    expect(MATCHES_SECTIONS.map((s) => matchesSectionHref(s.key))).toEqual([
      "/partite",
      "/risultati",
      "/classifiche",
      "/marcatori",
    ]);
    expect(matchesSectionHref("results", null)).toBe("/risultati");
  });

  it("porta la stagione scelta sulle pagine che hanno il selettore", () => {
    expect(matchesSectionHref("results", "2024-25")).toBe("/risultati?season=2024-25");
    expect(matchesSectionHref("standings", "2024-25")).toBe("/classifiche?season=2024-25");
    expect(matchesSectionHref("scorers", "2024-25")).toBe("/marcatori?season=2024-25");
  });

  it("le prossime partite non hanno stagione", () => {
    expect(matchesSectionHref("upcoming", "2024-25")).toBe("/partite");
  });

  it("codifica il valore della stagione", () => {
    expect(matchesSectionHref("results", "2024 25&x=1")).toBe(
      "/risultati?season=2024%2025%26x%3D1"
    );
  });
});
