import { describe, it, expect } from "vitest";
import {
  toLocalDateString,
  toLocalTimeString,
  sessionEndDate,
  formatRomeDayLabel,
  formatRomeTime,
  formatRome,
  isSameRomeDay,
  romeCalendarDaysBetween,
} from "./dateUtils";

describe("toLocalDateString()", () => {
  it("formatta una data come YYYY-MM-DD", () => {
    expect(toLocalDateString(new Date(2025, 5, 9))).toBe("2025-06-09");
  });

  it("aggiunge zero iniziale a mese e giorno singoli", () => {
    expect(toLocalDateString(new Date(2025, 0, 1))).toBe("2025-01-01");
    expect(toLocalDateString(new Date(2025, 8, 5))).toBe("2025-09-05");
  });

  it("gestisce l'ultimo giorno dell'anno", () => {
    expect(toLocalDateString(new Date(2025, 11, 31))).toBe("2025-12-31");
  });

  it("usa l'ora locale (non UTC)", () => {
    const d = new Date(2025, 2, 15, 14, 30, 0);
    expect(toLocalDateString(d)).toBe("2025-03-15");
  });
});

describe("toLocalTimeString()", () => {
  it("formatta l'orario come HH:mm", () => {
    expect(toLocalTimeString(new Date(2025, 0, 1, 9, 5))).toBe("09:05");
  });

  it("aggiunge zero iniziale a ore e minuti singoli", () => {
    expect(toLocalTimeString(new Date(2025, 0, 1, 0, 0))).toBe("00:00");
    expect(toLocalTimeString(new Date(2025, 0, 1, 7, 8))).toBe("07:08");
  });

  it("gestisce orario di fine giornata", () => {
    expect(toLocalTimeString(new Date(2025, 0, 1, 23, 59))).toBe("23:59");
  });
});

describe("sessionEndDate()", () => {
  const start = new Date(2025, 5, 9, 18, 0, 0);

  it("usa endTime quando fornito", () => {
    const end = new Date(2025, 5, 9, 20, 30, 0);
    expect(sessionEndDate(start, end)).toBe(end);
  });

  it("usa start + 2 ore quando endTime è null", () => {
    const result = sessionEndDate(start, null);
    expect(result.getTime()).toBe(start.getTime() + 2 * 60 * 60 * 1000);
  });

  it("usa start + 2 ore quando endTime è undefined", () => {
    const result = sessionEndDate(start);
    expect(result.getTime()).toBe(start.getTime() + 2 * 60 * 60 * 1000);
  });

  it("il fallback a 2 ore produce l'orario corretto", () => {
    const result = sessionEndDate(new Date(2025, 5, 9, 19, 0, 0));
    expect(result.getHours()).toBe(21);
    expect(result.getMinutes()).toBe(0);
  });
});

describe("formatRomeTime / formatRomeDayLabel", () => {
  it("usa l'ora legale di Roma (UTC+2) a prescindere dal fuso del processo", () => {
    const d = new Date("2026-09-22T16:30:00Z");
    expect(formatRomeTime(d)).toBe("18:30");
    expect(formatRomeDayLabel(d)).toBe("martedì 22 settembre");
  });

  it("usa l'ora solare di Roma (UTC+1) d'inverno", () => {
    expect(formatRomeTime(new Date("2026-12-01T17:00:00Z"))).toBe("18:00");
  });

  it("sposta il giorno quando in UTC è ancora il giorno prima", () => {
    const d = new Date("2026-09-21T22:30:00Z");
    expect(formatRomeTime(d)).toBe("00:30");
    expect(formatRomeDayLabel(d)).toBe("martedì 22 settembre");
  });
});

describe("formatRome()", () => {
  it("formatta nel fuso di Roma con l'ora legale", () => {
    expect(formatRome(new Date("2026-10-05T16:00:00Z"), "yyyy-MM-dd HH:mm")).toBe(
      "2026-10-05 18:00"
    );
  });

  it("formatta nel fuso di Roma con l'ora solare", () => {
    expect(formatRome(new Date("2026-12-05T17:00:00Z"), "HH:mm")).toBe("18:00");
  });

  it("la mezzanotte di Roma resta nello stesso giorno", () => {
    // Evento a giornata intera creato dal calendario: 00:00 a Roma = 22:00Z del giorno prima.
    expect(formatRome(new Date("2026-10-04T22:00:00Z"), "d MMM yyyy HH:mm")).toBe(
      "5 Oct 2026 00:00"
    );
  });
});

describe("isSameRomeDay()", () => {
  it("confronta i giorni di calendario di Roma, non UTC", () => {
    const start = new Date("2026-10-04T22:00:00Z"); // 5 ottobre, 00:00 a Roma
    const end = new Date("2026-10-05T20:00:00Z"); // 5 ottobre, 22:00 a Roma
    expect(isSameRomeDay(start, end)).toBe(true);
    expect(isSameRomeDay(start, new Date("2026-10-05T22:00:00Z"))).toBe(false);
  });
});

describe("romeCalendarDaysBetween()", () => {
  it("conta i giorni secondo il calendario di Roma", () => {
    const now = new Date("2026-10-04T21:30:00Z"); // 4 ottobre, 23:30 a Roma
    expect(romeCalendarDaysBetween(now, new Date("2026-10-04T21:45:00Z"))).toBe(0);
    // 00:15 del 5 ottobre a Roma, ma ancora il 4 in UTC
    expect(romeCalendarDaysBetween(now, new Date("2026-10-04T22:15:00Z"))).toBe(1);
  });
});
