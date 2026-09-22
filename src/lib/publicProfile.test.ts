import { describe, it, expect } from "vitest";
import { userHasPublicProfile } from "./publicProfile";

describe("userHasPublicProfile()", () => {
  it("esclude sempre i GUEST", () => {
    expect(userHasPublicProfile({ appRole: "GUEST", sportRole: 3, matchesPlayed: 5 })).toBe(false);
  });

  it("ammette atleti e staff anche senza partite giocate", () => {
    expect(userHasPublicProfile({ appRole: "ATHLETE", sportRole: null, matchesPlayed: 0 })).toBe(
      true
    );
    expect(userHasPublicProfile({ appRole: "COACH", sportRole: null, matchesPlayed: 0 })).toBe(
      true
    );
  });

  it("esclude il genitore che non gioca", () => {
    expect(userHasPublicProfile({ appRole: "PARENT", sportRole: null, matchesPlayed: 0 })).toBe(
      false
    );
  });

  it("esclude il genitore con ruolo ma senza partite", () => {
    expect(userHasPublicProfile({ appRole: "PARENT", sportRole: 2, matchesPlayed: 0 })).toBe(false);
  });

  it("esclude il genitore con partite ma senza ruolo", () => {
    expect(userHasPublicProfile({ appRole: "PARENT", sportRole: null, matchesPlayed: 3 })).toBe(
      false
    );
  });

  it("ammette il genitore con ruolo e almeno una partita", () => {
    expect(userHasPublicProfile({ appRole: "PARENT", sportRole: 2, matchesPlayed: 1 })).toBe(true);
  });
});
