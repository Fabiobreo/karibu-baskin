import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { summarizeResponses, type AttendanceInput } from "./eventResponses";

const lunch = { id: "lunch", label: "Pranzo" };

const person = (name: string, sportRole: number | null = null) => ({
  name,
  sportRole,
  sportRoleVariant: null,
});
const childCard = (
  name: string,
  userId: string | null,
  sportRole: number | null = null,
  accountRole: number | null = null
) => ({
  name,
  userId,
  sportRole,
  sportRoleVariant: null,
  user: userId ? { sportRole: accountRole, sportRoleVariant: null } : null,
});

function row(p: Partial<AttendanceInput> & { id: string }): AttendanceInput {
  return {
    status: "GOING",
    note: null,
    userId: null,
    childId: null,
    guestId: null,
    respondedById: null,
    user: null,
    child: null,
    guest: null,
    respondedBy: null,
    ...p,
  };
}

// Famiglia Provini: Paola risponde per sé e per Marco, Giulia (scheda figlio +
// account) porta l'esterna Chiara solo al pranzo.
const paola = row({ id: "a1", userId: "paola", respondedById: "paola", user: person("Paola") });
const marco = row({
  id: "a2",
  userId: "marco",
  status: "NOT_GOING",
  respondedById: "paola",
  user: person("Marco", 2),
  respondedBy: { name: "Paola" },
});
const giulia = row({
  id: "a3",
  childId: "c-giulia",
  respondedById: "giulia",
  child: childCard("Giulia", "giulia", null, 4),
  note: "vegetariana",
});
const chiara = row({
  id: "a4",
  guestId: "g1",
  status: "NOT_GOING",
  respondedById: "giulia",
  guest: { name: "Chiara", addedById: "giulia", addedBy: { name: "Giulia" } },
});

describe("summarizeResponses()", () => {
  const selections = [
    { optionId: "lunch", userId: "paola", childId: null, guestId: null },
    { optionId: "lunch", userId: null, childId: "c-giulia", guestId: null },
    { optionId: "lunch", userId: null, childId: null, guestId: "g1" },
  ];
  const result = summarizeResponses([lunch], [chiara, marco, giulia, paola], selections);

  it("conta gli stati (esterni compresi) e gli extra con quanti esterni", () => {
    expect(result.totals).toEqual({ GOING: 2, MAYBE: 0, NOT_GOING: 2, guests: 1 });
    expect(result.options).toEqual([{ id: "lunch", label: "Pranzo", count: 3, guestCount: 1 }]);
  });

  it("ordina per stato e nome, con l'esterno subito sotto chi l'ha portato", () => {
    expect(result.rows.map((r) => r.name)).toEqual(["Giulia", "Chiara", "Paola", "Marco"]);
    expect(result.rows[1]).toMatchObject({ kind: "guest", guestOf: "Giulia" });
  });

  it("chi ha scheda figlio e account e' un tesserato, non un figlio", () => {
    const kid = row({ id: "k", childId: "c-kid", child: childCard("Anna", null, 1) });
    const r = summarizeResponses([], [giulia, kid], []);
    expect(Object.fromEntries(r.rows.map((x) => [x.name, x.kind]))).toEqual({
      Anna: "child",
      Giulia: "user",
    });
  });

  it("'risposto da' solo quando ha risposto un altro", () => {
    const by = Object.fromEntries(result.rows.map((r) => [r.name, r.respondedBy]));
    expect(by).toEqual({ Giulia: null, Chiara: null, Paola: null, Marco: "Paola" });
  });

  it("chi ha scheda figlio e account conta una volta sola (vale la scheda)", () => {
    const legacy = row({ id: "old", userId: "giulia", user: person("Giulia", 4) });
    const r = summarizeResponses([lunch], [giulia, legacy], []);
    expect(r.rows.map((x) => x.id)).toEqual(["a3"]);
  });

  it("segnala gli esterni con lo stesso nome o con il nome di un partecipante", () => {
    const nonna = (id: string, by: string) =>
      row({
        id,
        guestId: `g-${id}`,
        guest: { name: " Nonna  Pina", addedById: by, addedBy: { name: by } },
      });
    const omonimo = row({
      id: "g-paola",
      guestId: "g-paola",
      guest: { name: "paola", addedById: "x", addedBy: { name: "X" } },
    });
    const solo = row({
      id: "g-solo",
      guestId: "g-solo",
      guest: { name: null, addedById: "x", addedBy: { name: "X" } },
    });
    const r = summarizeResponses(
      [],
      [paola, nonna("n1", "paola"), nonna("n2", "marco"), omonimo, solo],
      []
    );
    const dup = Object.fromEntries(r.rows.map((x) => [x.id, x.possibleDuplicate]));
    expect(dup).toEqual({ a1: false, n1: true, n2: true, "g-paola": true, "g-solo": false });
  });

  it("chi gioca: chi ha un ruolo Baskin, dalla scheda o dall'account; mai gli esterni", () => {
    const roles = Object.fromEntries(result.rows.map((r) => [r.name, r.sportRole]));
    expect(roles).toEqual({ Giulia: 4, Chiara: null, Paola: null, Marco: 2 });
  });

  it("conta i giocatori: Ci sarò per ruolo, Forse a parte, No escluso", () => {
    const maybe = row({ id: "m", userId: "m", status: "MAYBE", user: person("Luca", 3) });
    const r = summarizeResponses([], [paola, marco, giulia, maybe], []);
    // Paola non ha ruolo, Marco ha detto No: gioca solo Giulia, Luca forse.
    expect(r.players).toEqual({ going: 1, maybe: 1, goingByRole: { 4: 1 } });
  });
});
