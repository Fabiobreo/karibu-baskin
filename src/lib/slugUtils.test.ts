import { describe, it, expect } from "vitest";
import { slugify, sessionDateSlug } from "./slugUtils";

describe("slugify()", () => {
  it("minuscolo e trattino per spazi", () => {
    expect(slugify("Mario Rossi")).toBe("mario-rossi");
  });

  it("rimuove accenti latini", () => {
    expect(slugify("Élodie Müller")).toBe("elodie-muller");
    expect(slugify("José García")).toBe("jose-garcia");
    expect(slugify("François Côté")).toBe("francois-cote");
  });

  it("rimuove caratteri speciali non URL-safe", () => {
    expect(slugify("O'Connor")).toBe("oconnor");
    expect(slugify("A & B")).toBe("a-b");
    expect(slugify("hello@world!")).toBe("helloworld");
  });

  it("converte underscore in trattino", () => {
    expect(slugify("mario_rossi")).toBe("mario-rossi");
  });

  it("collassa spazi/trattini multipli", () => {
    expect(slugify("mario  rossi")).toBe("mario-rossi");
    expect(slugify("mario--rossi")).toBe("mario-rossi");
    expect(slugify("a   b")).toBe("a-b");
  });

  it("elimina spazi iniziali e finali", () => {
    expect(slugify("  Mario Rossi  ")).toBe("mario-rossi");
  });

  it("conserva le cifre", () => {
    expect(slugify("Team 2025")).toBe("team-2025");
    expect(slugify("Route 66")).toBe("route-66");
  });

  it("input già in forma slug rimane invariato", () => {
    expect(slugify("mario-rossi")).toBe("mario-rossi");
  });

  it("stringa vuota restituisce stringa vuota", () => {
    expect(slugify("")).toBe("");
  });

  it("stringa con solo caratteri speciali restituisce stringa vuota", () => {
    expect(slugify("!!! ---")).toBe("");
  });

  it("caratteri italiani comuni", () => {
    expect(slugify("Città Nuova")).toBe("citta-nuova");
    expect(slugify("Perché sì")).toBe("perche-si");
  });
});

describe("sessionDateSlug()", () => {
  it("concatena date e time con T", () => {
    expect(sessionDateSlug("2025-03-15", "18:00")).toBe("2025-03-15T18:00");
  });

  it("funziona con orari diversi", () => {
    expect(sessionDateSlug("2025-12-31", "09:30")).toBe("2025-12-31T09:30");
  });

  it("non modifica i valori passati", () => {
    const d = "2025-01-01";
    const t = "20:00";
    expect(sessionDateSlug(d, t)).toBe("2025-01-01T20:00");
  });
});
