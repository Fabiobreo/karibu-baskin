import { describe, it, expect } from "vitest";
import { buildHomeCallupStatus } from "./homeCallupStatus";

const family = [
  { id: "c-own", name: "Fabio Brea", userId: "me" },
  { id: "c-marco", name: "Marco Brea", userId: null },
  { id: "c-anna", name: "Anna Brea", userId: "u-anna" },
];

describe("buildHomeCallupStatus", () => {
  it("convocato con l'account o con la propria scheda", () => {
    const s = buildHomeCallupStatus(
      "me",
      ["m1", "m2"],
      family,
      [
        { matchId: "m1", userId: "me", childId: null },
        { matchId: "m2", userId: null, childId: "c-own" },
      ],
      new Set()
    );
    expect(s.m1).toEqual({ calledSelf: true, calledOthers: [], pending: false });
    expect(s.m2.calledSelf).toBe(true);
  });

  it("figli convocati sulla scheda o sull'account, per nome", () => {
    const s = buildHomeCallupStatus(
      "me",
      ["m1"],
      family,
      [
        { matchId: "m1", userId: null, childId: "c-marco" },
        { matchId: "m1", userId: "u-anna", childId: null },
      ],
      new Set(["m1"])
    );
    expect(s.m1).toEqual({ calledSelf: false, calledOthers: ["Marco", "Anna"], pending: false });
  });

  it("manca la risposta solo se nessuno di famiglia è convocato", () => {
    const s = buildHomeCallupStatus(
      "me",
      ["m1", "m2"],
      family,
      [{ matchId: "m2", userId: "other", childId: null }],
      new Set(["m1", "m2"])
    );
    expect(s.m1.pending).toBe(true);
    expect(s.m2).toEqual({ calledSelf: false, calledOthers: [], pending: true });
  });
});
