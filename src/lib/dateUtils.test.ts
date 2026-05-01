import { describe, it, expect } from "vitest";
import { toLocalDateString, toLocalTimeString } from "./dateUtils";

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
