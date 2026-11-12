import { describe, it, expect } from "vitest";
import { badgeAnchorId, badgeNotificationUrl, badgeSharePath, firstNameOf } from "./badgeShare";

describe("badgeShare", () => {
  it("solo il nome di battesimo", () => {
    expect(firstNameOf("Marco Rossi")).toBe("Marco");
    expect(firstNameOf("  Anna  ")).toBe("Anna");
    expect(firstNameOf(null)).toBe("");
  });

  it("per un minore il link è la home, mai il profilo", () => {
    expect(badgeSharePath({ minor: true, profileSlug: "marco-rossi" })).toBe("/");
    expect(badgeSharePath({ minor: false, profileSlug: null })).toBe("/");
    expect(badgeSharePath({ minor: false, profileSlug: "anna-bianchi" })).toBe(
      "/giocatori/anna-bianchi"
    );
  });

  it("l'avviso porta al traguardo nel profilo", () => {
    expect(badgeNotificationUrl("mese_pieno", "u1", true)).toBe("/profilo#traguardo-mese_pieno");
    expect(badgeNotificationUrl("mese_pieno", "c1", false)).toBe(
      "/profilo?tab=famiglia#traguardo-mese_pieno-c1"
    );
    expect(badgeAnchorId("x", "c1")).toBe("traguardo-x-c1");
  });
});
