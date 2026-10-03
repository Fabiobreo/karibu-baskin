import { describe, expect, it } from "vitest";
import { showsAvailabilities } from "./availabilityAudience";

describe("showsAvailabilities", () => {
  it("mai senza ruolo, né all'ospite senza figli", () => {
    expect(showsAvailabilities("GUEST", 3, 0)).toBe(false);
    expect(showsAvailabilities("GUEST", null, 0)).toBe(false);
    expect(showsAvailabilities(null, null, 0)).toBe(false);
    expect(showsAvailabilities(null, null, 2)).toBe(false);
  });

  it("all'ospite con figli collegati (il promemoria lo manda lì)", () => {
    expect(showsAvailabilities("GUEST", null, 1)).toBe(true);
    expect(showsAvailabilities("GUEST", 3, 2)).toBe(true);
  });

  it("sempre ad atleti e genitori", () => {
    expect(showsAvailabilities("ATHLETE", null, 0)).toBe(true);
    expect(showsAvailabilities("PARENT", null, 0)).toBe(true);
  });

  it("allo staff solo se gioca o ha figli", () => {
    expect(showsAvailabilities("COACH", null, 0)).toBe(false);
    expect(showsAvailabilities("ADMIN", null, 0)).toBe(false);
    expect(showsAvailabilities("COACH", 2, 0)).toBe(true);
    expect(showsAvailabilities("ADMIN", null, 1)).toBe(true);
  });
});
