import { describe, it, expect } from "vitest";
import { summarizePoll } from "./pollResults";

const base = {
  question: "Chi viene alla cena?",
  multiSelect: true,
  closesAt: null,
  options: [
    { id: "b", text: "No", order: 1 },
    { id: "a", text: "Sì", order: 0 },
  ],
};

describe("summarizePoll", () => {
  it("conta i voti per opzione e mette i nomi in ordine alfabetico", () => {
    const r = summarizePoll({
      ...base,
      votes: [
        { optionId: "a", userId: "u2", user: { name: "Sara" } },
        { optionId: "a", userId: "u1", user: { name: "Luca" } },
        { optionId: "b", userId: "u3", user: { name: "Anna" } },
      ],
    });
    expect(r.options.map((o) => o.text)).toEqual(["Sì", "No"]);
    expect(r.options[0].count).toBe(2);
    expect(r.options[0].voters.map((v) => v.name)).toEqual(["Luca", "Sara"]);
    expect(r.voterCount).toBe(3);
  });

  it("con la scelta multipla una persona conta una volta sola fra i votanti", () => {
    const r = summarizePoll({
      ...base,
      votes: [
        { optionId: "a", userId: "u1", user: { name: "Luca" } },
        { optionId: "b", userId: "u1", user: { name: "Luca" } },
      ],
    });
    expect(r.voterCount).toBe(1);
    expect(r.options.every((o) => o.count === 1)).toBe(true);
  });

  it("un account senza nome si legge comunque, e un'opzione senza voti resta a zero", () => {
    const r = summarizePoll({
      ...base,
      votes: [{ optionId: "a", userId: "u1", user: { name: null } }],
    });
    expect(r.options[0].voters[0].name).toBe("Senza nome");
    expect(r.options[1]).toMatchObject({ count: 0, voters: [] });
  });
});
