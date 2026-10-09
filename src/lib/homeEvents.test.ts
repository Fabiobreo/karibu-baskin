import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { pickHomeEvents, HOME_EVENTS_MAX } from "./homeEvents";

const now = new Date("2026-10-09T10:00:00Z");
const ev = (date: string, endDate: string | null = null) => ({
  date: new Date(date),
  endDate: endDate ? new Date(endDate) : null,
});

describe("pickHomeEvents()", () => {
  it("toglie gli eventi conclusi e tiene i primi", () => {
    const rows = [
      ev("2026-10-08T18:00:00Z", "2026-10-08T20:00:00Z"),
      ev("2026-10-12T18:00:00Z"),
      ev("2026-10-20T18:00:00Z"),
      ev("2026-10-30T18:00:00Z"),
    ];
    const picked = pickHomeEvents(rows, now);
    expect(picked).toHaveLength(HOME_EVENTS_MAX);
    expect(picked[0]).toBe(rows[1]);
  });

  it("un evento a giornata intera di oggi resta fino a sera", () => {
    // Mezzanotte a Roma del 9 ottobre (ora legale: UTC+2).
    const allDay = ev("2026-10-08T22:00:00Z");
    expect(pickHomeEvents([allDay], now)).toEqual([allDay]);
  });

  it("un evento di più giorni ancora in corso resta", () => {
    const tournament = ev("2026-10-07T08:00:00Z", "2026-10-10T18:00:00Z");
    expect(pickHomeEvents([tournament], now)).toEqual([tournament]);
  });
});
