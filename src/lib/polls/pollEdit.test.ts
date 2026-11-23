import { describe, expect, it } from "vitest";
import {
  answerLossConflict,
  answerLossMessage,
  lostAnswers,
  planPollOptions,
  readAnswerLoss,
} from "./pollEdit";

const saved = [
  { id: "a", text: "Sì" },
  { id: "b", text: "No" },
];

describe("planPollOptions", () => {
  it("un refuso corretto tiene l'opzione, quindi i suoi voti", () => {
    const plan = planPollOptions(saved, [
      { id: "a", text: "Sì, ci sono", order: 0 },
      { id: "b", text: "No", order: 1 },
    ]);
    expect(plan.removeIds).toEqual([]);
    expect(plan.create).toEqual([]);
    expect(plan.update.map((o) => o.id)).toEqual(["a", "b"]);
  });

  it("una pagina vecchia senza id si abbina per testo", () => {
    const plan = planPollOptions(saved, [
      { text: "No", order: 0 },
      { text: "Sì", order: 1 },
    ]);
    expect(plan.removeIds).toEqual([]);
    expect(plan.update).toEqual([
      { id: "b", text: "No", order: 0 },
      { id: "a", text: "Sì", order: 1 },
    ]);
  });

  it("aggiunge le nuove e segnala solo quelle tolte", () => {
    const plan = planPollOptions(saved, [
      { id: "a", text: "Sì", order: 0 },
      { text: "Forse", order: 1 },
    ]);
    expect(plan.create).toEqual([{ text: "Forse", order: 1 }]);
    expect(plan.removeIds).toEqual(["b"]);
  });

  it("non accetta un id di un altro sondaggio né lo stesso id due volte", () => {
    const plan = planPollOptions(saved, [
      { id: "a", text: "Uno", order: 0 },
      { id: "a", text: "Due", order: 1 },
      { id: "altro", text: "Tre", order: 2 },
    ]);
    expect(plan.update.map((o) => o.id)).toEqual(["a"]);
    expect(plan.create.map((o) => o.text)).toEqual(["Due", "Tre"]);
    expect(plan.removeIds).toEqual(["b"]);
  });
});

describe("conferma prima di cancellare", () => {
  it("conta solo le opzioni tolte che hanno risposte", () => {
    const lost = lostAnswers(
      [
        { id: "a", label: "Sì" },
        { id: "b", label: "No" },
      ],
      new Map([["a", 3]])
    );
    expect(lost).toEqual([{ label: "Sì", count: 3 }]);
    expect(answerLossMessage(lost)).toContain('"Sì" (3 risposte)');
  });

  it("riconosce il 409 di conferma e lascia leggibile la risposta", async () => {
    const res = Response.json(answerLossConflict([{ label: "Sì", count: 1 }]), { status: 409 });
    expect(await readAnswerLoss(res)).toEqual([{ label: "Sì", count: 1 }]);
    expect(res.bodyUsed).toBe(false);
  });

  it("ignora gli altri errori", async () => {
    const other = Response.json({ error: "Altro" }, { status: 409 });
    const html = new Response("<html>", { status: 409 });
    expect(await readAnswerLoss(other)).toBeNull();
    expect(await readAnswerLoss(html)).toBeNull();
  });
});
