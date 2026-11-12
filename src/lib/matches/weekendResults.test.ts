import { describe, expect, it } from "vitest";
import { weekendResultsWindow } from "./weekendResults";

// Novembre 2026: venerdì 13, sabato 14, domenica 15, lunedì 16, martedì 17,
// mercoledì 18. Ora solare: Roma = UTC+1.
const FRI = new Date("2026-11-12T23:00:00.000Z"); // venerdì 13 alle 00:00 a Roma
const MON = new Date("2026-11-15T23:00:00.000Z"); // lunedì 16 alle 00:00 a Roma

describe("weekendResultsWindow", () => {
  it("dal venerdì al martedì: finestra venerdì 00:00 – lunedì 00:00 a Roma", () => {
    for (const iso of [
      "2026-11-13T08:00:00.000Z", // venerdì
      "2026-11-14T15:00:00.000Z", // sabato
      "2026-11-15T22:30:00.000Z", // domenica 23:30 a Roma
      "2026-11-16T12:00:00.000Z", // lunedì
      "2026-11-17T22:59:59.000Z", // martedì 23:59:59 a Roma
    ]) {
      expect(weekendResultsWindow(new Date(iso))).toEqual({ from: FRI, to: MON });
    }
  });

  it("martedì dopo le 23:59 (mercoledì a Roma) la home torna com'era", () => {
    expect(weekendResultsWindow(new Date("2026-11-17T23:00:00.000Z"))).toBeNull();
  });

  it("mercoledì e giovedì niente finestra", () => {
    expect(weekendResultsWindow(new Date("2026-11-18T12:00:00.000Z"))).toBeNull();
    expect(weekendResultsWindow(new Date("2026-11-19T12:00:00.000Z"))).toBeNull();
  });

  it("giovedì sera alle 23:30 UTC è già venerdì a Roma", () => {
    expect(weekendResultsWindow(new Date("2026-11-12T23:30:00.000Z"))).toEqual({
      from: FRI,
      to: MON,
    });
  });

  it("cambio dell'ora a fine ottobre: lunedì resta a mezzanotte di Roma", () => {
    // Domenica 25 ottobre 2026 finisce l'ora legale.
    expect(weekendResultsWindow(new Date("2026-10-26T10:00:00.000Z"))).toEqual({
      from: new Date("2026-10-22T22:00:00.000Z"), // venerdì 23, ora legale
      to: new Date("2026-10-25T23:00:00.000Z"), // lunedì 26, ora solare
    });
  });
});
