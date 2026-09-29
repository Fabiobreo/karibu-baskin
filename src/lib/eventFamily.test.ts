import { describe, it, expect } from "vitest";
import { buildFamilyMembers } from "./eventFamily";

// Fabio ha un account e una scheda figlio con Giovanna e Pierantonio come genitori.
const users = [
  { id: "fabio", name: "Fabio" },
  { id: "giovanna", name: "Giovanna" },
  { id: "pierantonio", name: "Pierantonio" },
];
const fabioChild = {
  id: "c-fabio",
  name: "Fabio",
  userId: "fabio",
  guardians: [{ userId: "giovanna" }, { userId: "pierantonio" }],
};

describe("buildFamilyMembers()", () => {
  it("chi ha scheda figlio e account compare una volta sola, con la scheda", () => {
    const members = buildFamilyMembers("fabio", users, [fabioChild]);
    expect(members.map((m) => m.key)).toEqual(["c:c-fabio", "u:giovanna", "u:pierantonio"]);
    expect(members[0]).toMatchObject({ childId: "c-fabio", userId: "fabio", isSelf: true });
  });

  it("dal lato del genitore: io per primo, poi gli altri in ordine alfabetico", () => {
    const members = buildFamilyMembers("pierantonio", users, [fabioChild]);
    expect(members.map((m) => m.name)).toEqual(["Pierantonio", "Fabio", "Giovanna"]);
    expect(members[0].isSelf).toBe(true);
    expect(members.find((m) => m.name === "Fabio")?.isSelf).toBe(false);
  });

  it("un figlio senza account e' un membro con la sola scheda", () => {
    const kid = { id: "c-kid", name: "Anna", userId: null, guardians: [{ userId: "giovanna" }] };
    const members = buildFamilyMembers("giovanna", [users[1]], [kid]);
    expect(members).toEqual([
      expect.objectContaining({ key: "u:giovanna", isSelf: true }),
      expect.objectContaining({ key: "c:c-kid", childId: "c-kid", userId: null }),
    ]);
  });

  it("senza famiglia resto solo io", () => {
    expect(buildFamilyMembers("solo", [{ id: "solo", name: "Solo" }], [])).toEqual([
      expect.objectContaining({ key: "u:solo", isSelf: true }),
    ]);
  });
});
