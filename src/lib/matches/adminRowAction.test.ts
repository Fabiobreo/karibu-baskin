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

  it("finito il resto, propone la nota sull'avversaria finché la partita è recente", () => {
    const done = state({ upcoming: false, hasResult: true, hasStats: true, noteDue: true });
    expect(matchPrimaryAction(done)).toEqual({
      key: "profile",
      label: "Nota sull'avversaria",
      emphasis: "outlined",
    });
    // Le statistiche restano raggiungibili dal menu, la scheda non si ripete.
    expect(keys(done)).toEqual(["callups", "result", "stats", "edit", "public", "delete"]);
    // Prima vengono risultato e statistiche.
    expect(matchPrimaryAction({ ...done, hasStats: false }).key).toBe("stats");
    expect(matchPrimaryAction({ ...done, hasResult: false, hasStats: false }).key).toBe("result");
    // Un'amichevole interna non ha un'avversaria con una scheda.
    expect(matchPrimaryAction({ ...done, hasOpponent: false }).key).toBe("stats");
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
    expect(keys(base)).toEqual(["profile", "edit", "public", "delete"]);
  });

  it("partita completa: tutto, con Elimina per ultima", () => {
    const full = state({ upcoming: false, hasResult: true, hasStats: true, callups: 12 });
    expect(keys(full)).toEqual(["callups", "result", "profile", "edit", "public", "delete"]);
    expect(matchMenuActions(full).find((a) => a.key === "result")?.label).toBe(
      "Modifica risultato"
    );
  });

  it("la scheda avversario c'è con un'avversaria in anagrafica, anche prima di giocare", () => {
    expect(keys(base)).toContain("profile");
    expect(keys(state({ upcoming: false }))).toContain("profile");
    expect(keys(state({ upcoming: false, hasResult: true }))).toContain("profile");
    expect(keys(state({ hasOpponent: false }))).not.toContain("profile");
    expect(keys(state({ isInternal: true, hasOpponent: false }))).not.toContain("profile");
  });

  it("la voce dice se la scheda è già compilata", () => {
    const label = (s: MatchRowState) => matchMenuActions(s).find((a) => a.key === "profile")?.label;
    expect(label(base)).toBe("Scheda avversario");
    expect(label(state({ hasProfile: true }))).toBe("Modifica scheda avversario");
  });

  it("l'allenatore vede solo ciò che può fare", () => {
    expect(
      keys(state({ isAdmin: false, upcoming: false, hasResult: true, hasStats: true }))
    ).toEqual(["profile", "public"]);
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
