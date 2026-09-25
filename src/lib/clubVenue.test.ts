import { describe, expect, it } from "vitest";
import { CLUB_VENUE_LABEL, mapsSearchUrl, trainingLocation } from "./clubVenue";

describe("trainingLocation", () => {
  it("usa il luogo dell'allenamento quando c'e'", () => {
    expect(trainingLocation("Palestra Ferrarin")).toBe("Palestra Ferrarin");
  });
  it("ricade sulla sede del club se manca o e' vuoto", () => {
    expect(trainingLocation(null)).toBe(CLUB_VENUE_LABEL);
    expect(trainingLocation("   ")).toBe(CLUB_VENUE_LABEL);
  });
});

describe("mapsSearchUrl", () => {
  it("codifica il luogo nella query", () => {
    expect(mapsSearchUrl("Via del Vigo, 11")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Via%20del%20Vigo%2C%2011"
    );
  });
});
