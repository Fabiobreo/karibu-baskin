import { describe, it, expect } from "vitest";
import { eventEnd, eventStatus, isAllDay, isEventPast, splitEventsByTime } from "./events";

const at = (iso: string) => new Date(iso);
// 10 ottobre 2026 a giornata intera, come lo crea il calendario (00:00 a Roma).
const allDay = { date: at("2026-10-09T22:00:00Z"), endDate: null };
// 10 ottobre 2026, 18:00–20:00 a Roma.
const evening = { date: at("2026-10-10T16:00:00Z"), endDate: at("2026-10-10T18:00:00Z") };

describe("isAllDay()", () => {
  it("riconosce la mezzanotte di Roma, non quella UTC", () => {
    expect(isAllDay(at("2026-10-09T22:00:00Z"))).toBe(true);
    expect(isAllDay(at("2026-10-10T00:00:00Z"))).toBe(false);
  });
});

describe("eventEnd()", () => {
  it("senza fine, l'evento dura fino a fine giornata a Roma", () => {
    expect(eventEnd(allDay).toISOString()).toBe("2026-10-10T21:59:59.999Z");
  });

  it("una fine a mezzanotte vale tutto quel giorno", () => {
    const tournament = { date: at("2026-07-10T22:00:00Z"), endDate: at("2026-07-12T22:00:00Z") };
    expect(eventEnd(tournament).toISOString()).toBe("2026-07-13T21:59:59.999Z");
  });

  it("una fine con orario resta quella", () => {
    expect(eventEnd(evening).toISOString()).toBe("2026-10-10T18:00:00.000Z");
  });
});

describe("isEventPast()", () => {
  it("un evento a giornata intera non è concluso durante il suo giorno", () => {
    expect(isEventPast(allDay, at("2026-10-10T08:00:00Z").getTime())).toBe(false);
    expect(isEventPast(allDay, at("2026-10-10T22:00:00Z").getTime())).toBe(true);
  });
});

describe("splitEventsByTime()", () => {
  it("tiene fra i prossimi l'evento a giornata intera di oggi", () => {
    const { upcoming, past } = splitEventsByTime([allDay], at("2026-10-10T10:00:00Z").getTime());
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });
});

describe("eventStatus()", () => {
  it("in corso fra inizio e fine", () => {
    expect(eventStatus(evening, at("2026-10-10T17:00:00Z"))).toEqual({ kind: "live" });
  });

  it("concluso dopo la fine", () => {
    expect(eventStatus(evening, at("2026-10-10T19:00:00Z"))).toEqual({ kind: "ended" });
  });

  it("oggi, prima dell'inizio", () => {
    expect(eventStatus(evening, at("2026-10-10T08:00:00Z"))).toEqual({ kind: "today" });
  });

  it("oggi, non in corso, per un evento a giornata intera", () => {
    expect(eventStatus(allDay, at("2026-10-10T08:00:00Z"))).toEqual({ kind: "today" });
  });

  it("domani e fra N giorni contati sul calendario di Roma", () => {
    // 9 ottobre, 23:30 a Roma: l'evento a giornata intera del 10 è domani.
    expect(eventStatus(allDay, at("2026-10-09T21:30:00Z"))).toEqual({ kind: "tomorrow" });
    expect(eventStatus(allDay, at("2026-10-05T10:00:00Z"))).toEqual({ kind: "daysAway", days: 5 });
  });
});
