import { describe, it, expect } from "vitest";
import {
  buildScoutingProfile,
  cleanInitials,
  cleanJerseyNumber,
  hasOpponentSheet,
  isMatchNoteDue,
  matchNoteHeading,
  playerNoteLabel,
  playerNotesError,
  muFromStrength,
  strengthFromMu,
} from "./opponentSheet";

describe("forza complessiva", () => {
  it("andata e ritorno fra forza e livello stimato", () => {
    for (const s of ["WEAK", "MEDIUM", "STRONG"] as const) {
      expect(strengthFromMu(muFromStrength(s))).toBe(s);
    }
  });

  it("non impostata resta non impostata", () => {
    expect(strengthFromMu(null)).toBeNull();
    expect(strengthFromMu(undefined)).toBeNull();
    expect(muFromStrength(null)).toBeNull();
  });

  it("un livello qualunque va sulla forza più vicina", () => {
    expect(strengthFromMu(10)).toBe("WEAK");
    expect(strengthFromMu(26)).toBe("MEDIUM");
    expect(strengthFromMu(40)).toBe("STRONG");
  });
});

describe("buildScoutingProfile", () => {
  const five = { "5": { strength: "STRONG", physicality: "HIGH" } } as const;

  it("senza ruoli né nota la scheda è vuota", () => {
    expect(buildScoutingProfile({}, "   ")).toBeNull();
  });

  it("una nota da sola si salva", () => {
    expect(buildScoutingProfile({}, "  Pressano a tutto campo  ")).toEqual({
      categories: {},
      notes: "Pressano a tutto campo",
    });
  });

  it("senza nota non resta una chiave vuota", () => {
    expect(buildScoutingProfile({ ...five }, "")).toEqual({ categories: five });
  });
});

describe("hasOpponentSheet", () => {
  it("niente di compilato", () => {
    expect(hasOpponentSheet(null)).toBe(false);
    expect(hasOpponentSheet({ ratingMu: null, scoutingProfile: null })).toBe(false);
    expect(hasOpponentSheet({ ratingMu: null, scoutingProfile: { categories: {} } })).toBe(false);
  });

  it("basta la forza complessiva, un ruolo o una nota", () => {
    expect(hasOpponentSheet({ ratingMu: 25, scoutingProfile: null })).toBe(true);
    expect(
      hasOpponentSheet({
        ratingMu: null,
        scoutingProfile: { categories: { "3": { strength: "WEAK", physicality: "LOW" } } },
      })
    ).toBe(true);
    expect(
      hasOpponentSheet({ ratingMu: null, scoutingProfile: { categories: {}, notes: "Veloci" } })
    ).toBe(true);
  });
});

describe("giocatori da segnalare", () => {
  const four = (players: { number?: string; initials?: string; note: string }[]) => ({
    "4": { strength: "STRONG" as const, physicality: "HIGH" as const, players },
  });

  it("le iniziali non lasciano scrivere un nome", () => {
    expect(cleanInitials("tizio caio")).toBe("TIZI");
    expect(cleanInitials("t.c.")).toBe("T.C.");
    expect(cleanInitials("T C 14")).toBe("TC");
    expect(cleanJerseyNumber("n. 14a")).toBe("14");
    expect(cleanJerseyNumber("12345")).toBe("123");
  });

  it("si leggono per numero e iniziali", () => {
    expect(playerNoteLabel({ number: "14", initials: "T.C." })).toBe("n. 14 · T.C.");
    expect(playerNoteLabel({ number: "14" })).toBe("n. 14");
    expect(playerNoteLabel({ initials: "TC" })).toBe("TC");
  });

  it("una riga cominciata va finita", () => {
    expect(playerNotesError(four([{ note: "Cerca il contatto" }]))).toContain("Ruolo 4");
    expect(playerNotesError(four([{ number: "14", note: "  " }]))).toContain("n. 14");
    expect(playerNotesError(four([{ number: "14", note: "Cerca il contatto" }]))).toBeNull();
    // Una riga aggiunta e lasciata vuota non blocca il salvataggio.
    expect(playerNotesError(four([{ number: "", initials: "", note: "" }]))).toBeNull();
  });

  it("al salvataggio spariscono righe e campi vuoti", () => {
    const profile = buildScoutingProfile(
      four([
        { number: "14", initials: "tc", note: "  Cerca il contatto  " },
        { number: "", initials: "", note: "" },
        { number: "", initials: "M.R.", note: "Tira da fuori" },
      ]),
      ""
    );
    expect(profile?.categories["4"]?.players).toEqual([
      { number: "14", initials: "TC", note: "Cerca il contatto" },
      { initials: "M.R.", note: "Tira da fuori" },
    ]);
  });

  it("senza giocatori non resta una lista vuota", () => {
    expect(buildScoutingProfile(four([{ note: "" }]), "")?.categories["4"]).toEqual({
      strength: "STRONG",
      physicality: "HIGH",
    });
  });
});

describe("note di partita", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date("2026-10-11T12:00:00Z").getTime();
  const played = (daysAgo: number) => ({
    date: new Date(now - daysAgo * DAY),
    hasResult: true,
    hasOpponent: true,
    hasNote: false,
  });

  it("l'intestazione dice di quale partita si parla", () => {
    expect(
      matchNoteHeading({ teamName: "Kapuleti", ourScore: 92, theirScore: 79 }, "19 ott 2025")
    ).toBe("19 ott 2025 · Kapuleti 92 – 79");
    expect(
      matchNoteHeading({ teamName: "Kapuleti", ourScore: null, theirScore: null }, "19 ott 2025")
    ).toBe("19 ott 2025 · Kapuleti");
  });

  it("la nota si propone per due settimane dopo la partita", () => {
    expect(isMatchNoteDue(played(1), now)).toBe(true);
    expect(isMatchNoteDue(played(14), now)).toBe(true);
    expect(isMatchNoteDue(played(15), now)).toBe(false);
    expect(isMatchNoteDue(played(-1), now)).toBe(false);
  });

  it("non si propone senza risultato, senza avversaria in anagrafica o se c'è già", () => {
    expect(isMatchNoteDue({ ...played(1), hasResult: false }, now)).toBe(false);
    expect(isMatchNoteDue({ ...played(1), hasOpponent: false }, now)).toBe(false);
    expect(isMatchNoteDue({ ...played(1), hasNote: true }, now)).toBe(false);
  });
});
