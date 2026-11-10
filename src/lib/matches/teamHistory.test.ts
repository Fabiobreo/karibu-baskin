import { describe, expect, it } from "vitest";
import { teamPeriods, wasMemberAt } from "./teamHistory";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const season = { season: "2026-27" };

describe("teamPeriods + wasMemberAt", () => {
  it("chi non ha mai cambiato squadra ci è da sempre", () => {
    const p = teamPeriods([{ teamId: "t1", createdAt: d("2026-09-27"), team: season }], []);
    expect(wasMemberAt(p, "t1", d("2026-09-20"))).toBe(true);
    expect(wasMemberAt(p, "t2", d("2026-09-20"))).toBe(false);
  });

  it("dopo un cambio: la vecchia fino al cambio, la nuova da lì", () => {
    const p = teamPeriods(
      [{ teamId: "t2", createdAt: d("2026-11-01"), team: season }],
      [{ teamId: "t1", startedAt: d("2026-09-27"), endedAt: d("2026-11-01"), team: season }]
    );
    expect(wasMemberAt(p, "t1", d("2026-10-28"))).toBe(true);
    expect(wasMemberAt(p, "t2", d("2026-10-28"))).toBe(false);
    expect(wasMemberAt(p, "t1", d("2026-11-05"))).toBe(false);
    expect(wasMemberAt(p, "t2", d("2026-11-05"))).toBe(true);
  });

  it("inizio sconosciuto della squadra lasciata: vale da sempre", () => {
    const p = teamPeriods(
      [],
      [{ teamId: "t1", startedAt: null, endedAt: d("2026-11-01"), team: season }]
    );
    expect(wasMemberAt(p, "t1", d("2026-09-01"))).toBe(true);
  });

  it("una squadra lasciata la stagione prima non sposta l'inizio di quella di adesso", () => {
    const p = teamPeriods(
      [{ teamId: "t2", createdAt: d("2026-09-27"), team: season }],
      [{ teamId: "t0", startedAt: null, endedAt: d("2026-05-28"), team: { season: "2025-26" } }]
    );
    expect(wasMemberAt(p, "t2", d("2026-09-20"))).toBe(true);
  });
});
