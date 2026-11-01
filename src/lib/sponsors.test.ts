import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SPONSORS } from "./sponsors";
import it_ from "@/i18n/messages/it.json";
import en from "@/i18n/messages/en.json";

describe("SPONSORS", () => {
  it("ha id unici", () => {
    const ids = SPONSORS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    ["it", it_],
    ["en", en],
  ])("ha categoria e descrizione in %s per ogni sponsor", (_, messages) => {
    const data = messages.pages.sponsor.sponsorsData as Record<
      string,
      { category?: string; description?: string }
    >;
    for (const s of SPONSORS) {
      expect(data[s.id]?.category, s.id).toBeTruthy();
      expect(data[s.id]?.description, s.id).toBeTruthy();
    }
    expect(Object.keys(data).sort()).toEqual(SPONSORS.map((s) => s.id).sort());
  });

  it("ha i file dei loghi in public", () => {
    for (const s of SPONSORS) {
      for (const src of [s.logo, s.squareLogo].filter(Boolean) as string[]) {
        expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
      }
    }
  });
});
