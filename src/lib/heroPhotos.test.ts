import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { HERO_PHOTOS, heroPhotoForDay } from "./heroPhotos";

describe("heroPhotoForDay()", () => {
  it("resta la stessa per tutto il giorno a Roma e cambia a mezzanotte", () => {
    // 9 ottobre a Roma (UTC+2): dalle 22:00 UTC dell'8 alle 21:59 UTC del 9.
    const morning = heroPhotoForDay(new Date("2026-10-08T22:00:00Z"));
    const night = heroPhotoForDay(new Date("2026-10-09T21:59:00Z"));
    const nextDay = heroPhotoForDay(new Date("2026-10-09T22:00:00Z"));
    expect(night).toBe(morning);
    expect(nextDay).not.toBe(morning);
  });

  it("in tanti giorni quante sono le foto le mostra tutte", () => {
    const seen = new Set(
      HERO_PHOTOS.map((_, i) => heroPhotoForDay(new Date(Date.UTC(2026, 9, 10 + i, 12))).key)
    );
    expect(seen.size).toBe(HERO_PHOTOS.length);
  });

  it("regge anche le date prima dell'inizio del conto", () => {
    expect(HERO_PHOTOS).toContain(heroPhotoForDay(new Date("2025-03-02T12:00:00Z")));
  });
});

describe("HERO_PHOTOS", () => {
  it("ogni file esiste in public/", () => {
    for (const photo of HERO_PHOTOS) {
      for (const image of [photo.wide, photo.tall]) {
        expect(existsSync(join(process.cwd(), "public", image.src)), image.src).toBe(true);
      }
    }
  });
});
