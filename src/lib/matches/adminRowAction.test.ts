import { describe, it, expect } from "vitest";
import { matchMenuActions, matchPrimaryAction, type MatchRowState } from "./adminRowAction";

const base: MatchRowState = {
  upcoming: true,
  hasResult: false,
  hasStats: false,
  callups: 0,
  isInternal: false,
  hasOpponent: true,
  hasProfile: false,
  isAdmin: true,
};
const state = (over: Partial<MatchRowState>): MatchRowState => ({ ...base, ...over });
const keys = (s: MatchRowState) => matchMenuActions(s).map((a) => a.key);

describe("matchPrimaryAction", () => {
  it("partita futura senza convocati: Convoca, in evidenza", () => {
    expect(matchPrimaryAction(base)).toEqual({
      key: "callups",
      label: "Convoca",
      emphasis: "outlined",
    });
  });

  it("partita futura con convocati: il numero, senza evidenza", () => {
    expect(matchPrimaryAction(state({ callups: 12 }))).toEqual({
      key: "callups",
      label: "Convocati (12)",
      emphasis: "text",
    });
  });

  it("amichevole interna: niente numero, sommerebbe le due squadre", () => {
    expect(matchPrimaryAction(state({ callups: 24, isInternal: true })).label).toBe("Convocati");
  });

  it("giocata senza risultato: Inserisci risultato", () => {
    expect(matchPrimaryAction(state({ upcoming: false, callups: 12 }))).toEqual({
      key: "result",
      label: "Inserisci risultato",
      emphasis: "outlined",
    });
  });

  it("risultato senza statistiche: Inserisci statistiche", () => {
    expect(matchPrimaryAction(state({ upcoming: false, hasResult: true }))).toEqual({
      key: "stats",
      label: "Inserisci statistiche",
      emphasis: "outlined",
    });
  });

  it("completa: Statistiche, senza evidenza", () => {
    expect(matchPrimaryAction(state({ upcoming: false, hasResult: true, hasStats: true }))).toEqual(
      { key: "stats", label: "Statistiche", emphasis: "text" }
    );
  });

  it("all'allenatore resta sempre la convocazione, l'unica cosa che può salvare", () => {
    const coach = state({ isAdmin: false, upcoming: false, callups: 9 });
    expect(matchPrimaryAction(coach).key).toBe("callups");
    expect(matchPrimaryAction({ ...coach, hasResult: true }).key).toBe("callups");
    expect(matchPrimaryAction(state({ isAdmin: false, upcoming: false })).label).toBe("Convocati");
  });
});

describe("matchMenuActions", () => {
  it("non ripete l'azione che è già in riga", () => {
    expect(keys(base)).not.toContain("callups");
    expect(keys(state({ upcoming: false }))).not.toContain("result");
    expect(keys(state({ upcoming: false, hasResult: true }))).not.toContain("stats");
  });

  it("partita futura: niente risultato né statistiche", () => {
    expect(keys(base)).toEqual(["edit", "public", "delete"]);
  });

  it("partita completa: tutto, con Elimina per ultima", () => {
    const full = state({ upcoming: false, hasResult: true, hasStats: true, callups: 12 });
    expect(keys(full)).toEqual(["callups", "result", "profile", "edit", "public", "delete"]);
    expect(matchMenuActions(full).find((a) => a.key === "result")?.label).toBe(
      "Modifica risultato"
    );
  });

  it("la scheda avversario c'è solo con un risultato e un'avversaria in anagrafica", () => {
    expect(keys(state({ upcoming: false, hasResult: true, hasOpponent: false }))).not.toContain(
      "profile"
    );
    expect(keys(state({ upcoming: false }))).not.toContain("profile");
  });

  it("l'allenatore vede solo ciò che può fare", () => {
    expect(
      keys(state({ isAdmin: false, upcoming: false, hasResult: true, hasStats: true }))
    ).toEqual(["public"]);
  });
});

describe("sola lettura (dirigente)", () => {
  it("in riga c'è solo la pagina pubblica, e nessun menu", () => {
    for (const s of [
      state({ readOnly: true, isAdmin: false }),
      state({ readOnly: true, isAdmin: false, upcoming: false, hasResult: true, hasStats: true }),
    ]) {
      expect(matchPrimaryAction(s)).toEqual({
        key: "public",
        label: "Pagina pubblica",
        emphasis: "text",
      });
      expect(matchMenuActions(s)).toEqual([]);
    }
  });
});
