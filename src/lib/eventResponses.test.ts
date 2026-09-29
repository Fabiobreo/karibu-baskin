import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { summarizeResponses, type AttendanceInput } from "./eventResponses";

const lunch = { id: "lunch", label: "Pranzo" };

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
const paola = row({ id: "a1", userId: "paola", respondedById: "paola", user: { name: "Paola" } });
const marco = row({
  id: "a2",
  userId: "marco",
  status: "NOT_GOING",
  respondedById: "paola",
  user: { name: "Marco" },
  respondedBy: { name: "Paola" },
});
const giulia = row({
  id: "a3",
  childId: "c-giulia",
  respondedById: "giulia",
  child: { name: "Giulia", userId: "giulia" },
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
    const kid = row({ id: "k", childId: "c-kid", child: { name: "Anna", userId: null } });
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
    const legacy = row({ id: "old", userId: "giulia", user: { name: "Giulia" } });
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
});
