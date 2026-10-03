import { describe, expect, it } from "vitest";
import { eventDeleteMessage, newsMenuEntries, teamMenuEntries } from "./adminRowActions";

describe("eventDeleteMessage", () => {
  it("nomina l'evento e dice quante risposte si perdono", () => {
    const msg = eventDeleteMessage("Torneo di Natale", 18);
    expect(msg).toContain('"Torneo di Natale"');
    expect(msg).toContain("18 risposte");
  });

  it("al singolare con una risposta, e senza numeri quando nessuno ha risposto", () => {
    expect(eventDeleteMessage("Cena", 1)).toContain("l'unica risposta");
    expect(eventDeleteMessage("Cena", 0)).toContain("Nessuno ha ancora risposto");
  });
});

describe("newsMenuEntries", () => {
  it("una bozza si pubblica (avvisando tutti) e non ha pagina pubblica", () => {
    const keys = newsMenuEntries(false).map((e) => e.key);
    expect(keys).toEqual(["publish"]);
    expect(newsMenuEntries(false)[0].label).toMatch(/avvisa tutti/);
  });

  it("una news pubblicata si rimette in bozza e ha la pagina pubblica", () => {
    expect(newsMenuEntries(true).map((e) => e.key)).toEqual(["unpublish", "public"]);
  });
});

describe("teamMenuEntries", () => {
  it("all'allenatore niente di ciò che l'API gli rifiuta (modifica, eliminazione)", () => {
    const coach = teamMenuEntries(false);
    expect(coach.keys).not.toContain("edit");
    expect(coach.canDelete).toBe(false);
  });

  it("l'allenatore ha un sottoinsieme delle voci dell'admin, e la pagina pubblica resta a tutti", () => {
    const admin = teamMenuEntries(true);
    const coach = teamMenuEntries(false);
    expect(coach.keys.every((k) => admin.keys.includes(k))).toBe(true);
    expect(admin.keys).toContain("public");
    expect(coach.keys).toContain("public");
    expect(admin.canDelete).toBe(true);
  });
});
