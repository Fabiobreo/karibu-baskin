import { describe, expect, it } from "vitest";
import {
  CLUB_VENUE,
  CLUB_VENUE_LABEL,
  mapsSearchUrl,
  matchLocation,
  matchPlaceShort,
  trainingLocation,
} from "./clubVenue";

describe("matchLocation", () => {
  const opponent = { address: "Via Roma 1", city: "Bassano del Grappa" };
  it("in casa: il campo della partita, altrimenti la sede del club", () => {
    expect(matchLocation({ isHome: true, venue: "Palestra Ferrarin" })).toEqual({
      kind: "venue",
      label: "Palestra Ferrarin",
    });
    expect(matchLocation({ isHome: true, venue: null, opponent })).toEqual({
      kind: "club",
      label: CLUB_VENUE_LABEL,
    });
  });
  it("in trasferta: il campo, altrimenti indirizzo e città dell'avversaria", () => {
    expect(matchLocation({ isHome: false, venue: " PalaBassano ", opponent }).label).toBe(
      "PalaBassano"
    );
    expect(matchLocation({ isHome: false, opponent })).toEqual({
      kind: "opponent",
      label: "Via Roma 1, Bassano del Grappa",
    });
    // La città non si ripete se l'indirizzo la contiene già.
    expect(
      matchLocation({
        isHome: false,
        opponent: { address: "Via Roma 1, Bassano del Grappa", city: "Bassano del Grappa" },
      }).label
    ).toBe("Via Roma 1, Bassano del Grappa");
  });
  it("la città conta solo nell'ultimo segmento, a parole intere", () => {
    const label = (address: string, city: string) =>
      matchLocation({ isHome: false, opponent: { address, city } }).label;
    expect(label("Via Vicenza 3", "Vicenza")).toBe("Via Vicenza 3, Vicenza");
    expect(label("Via Roma 1, Roma", "Roma")).toBe("Via Roma 1, Roma");
    expect(label("Via Roma 1, 36100 Vicenza (VI)", "vicenza")).toBe(
      "Via Roma 1, 36100 Vicenza (VI)"
    );
    expect(label("Piazza Duomo 2, Cantù", "Cantu")).toBe("Piazza Duomo 2, Cantù");
    expect(label("Via Vicenza 3, Montecchio", "Vicenza")).toBe(
      "Via Vicenza 3, Montecchio, Vicenza"
    );
    expect(label("Via Po 1, Romano d'Ezzelino", "Roma")).toBe("Via Po 1, Romano d'Ezzelino, Roma");
  });
  it("amichevole interna: la sede del club", () => {
    expect(matchLocation({ isHome: false, internal: true }).kind).toBe("club");
  });
  it("trasferta con la sola città dell'avversaria: la città, senza indirizzo", () => {
    expect(matchLocation({ isHome: false, venue: "", opponent: { city: " Bassano " } })).toEqual({
      kind: "city",
      label: "Bassano",
    });
  });
  it("senza dati: luogo da confermare (label null)", () => {
    expect(matchLocation({ isHome: false, venue: "", opponent: { city: " " } })).toEqual({
      kind: "unknown",
      label: null,
    });
    expect(matchLocation({ isHome: false })).toEqual({ kind: "unknown", label: null });
  });
});

describe("matchPlaceShort", () => {
  const short = (m: Parameters<typeof matchLocation>[0]) => matchPlaceShort(m, matchLocation(m));
  it("la città della sede o dell'avversaria, il nome del campo", () => {
    expect(short({ isHome: true })).toBe(CLUB_VENUE.city);
    expect(
      short({ isHome: false, opponent: { address: "Via Roma 1", city: "Bassano del Grappa" } })
    ).toBe("Bassano del Grappa");
    expect(short({ isHome: false, opponent: { address: "Via Roma 1, Thiene" } })).toBe(
      "Via Roma 1"
    );
    expect(short({ isHome: false, venue: "PalaBassano, Via Ca' Baroncello 5" })).toBe(
      "PalaBassano"
    );
  });
  it("solo la città dell'avversaria: la città", () => {
    expect(short({ isHome: false, opponent: { city: "Nove" } })).toBe("Nove");
  });
  it("da confermare: null", () => {
    expect(short({ isHome: false })).toBeNull();
  });
});

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
