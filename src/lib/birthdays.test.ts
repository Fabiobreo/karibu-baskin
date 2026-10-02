import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { isBirthdayToday, pickCelebrants } from "./birthdays";

function user(over: Partial<Parameters<typeof pickCelebrants>[0][number]> = {}) {
  return {
    id: "u1",
    name: "Giulia Rossi",
    slug: "giulia-rossi",
    birthDate: new Date("1990-10-02"),
    sportRole: 3,
    appRole: "ATHLETE" as const,
    _count: { matchStats: 0 },
    ...over,
  };
}

function child(over: Partial<Parameters<typeof pickCelebrants>[1][number]> = {}) {
  return {
    id: "c1",
    name: "Luca Bianchi",
    slug: "luca-bianchi",
    birthDate: new Date("2014-10-02"),
    userId: null,
    ...over,
  };
}

// 2 ottobre a mezzogiorno, ora di Roma.
const NOON = new Date("2026-10-02T10:00:00Z");

describe("isBirthdayToday", () => {
  it("confronta giorno e mese, non l'anno", () => {
    expect(isBirthdayToday(new Date("1990-10-02"), NOON)).toBe(true);
    expect(isBirthdayToday(new Date("1990-10-03"), NOON)).toBe(false);
  });

  it("dopo mezzanotte a Roma è già il giorno nuovo, anche se in UTC è ancora ieri", () => {
    // 00:30 del 3 ottobre a Roma = 22:30 UTC del 2.
    const afterMidnight = new Date("2026-10-02T22:30:00Z");
    expect(isBirthdayToday(new Date("1990-10-03"), afterMidnight)).toBe(true);
    expect(isBirthdayToday(new Date("1990-10-02"), afterMidnight)).toBe(false);
  });

  it("legge bene anche una data salvata alla mezzanotte italiana", () => {
    // 2 ottobre 1990, 00:00 a Roma (ora solare, UTC+1).
    expect(isBirthdayToday(new Date("1990-10-01T23:00:00Z"), NOON)).toBe(true);
  });
});

describe("pickCelebrants", () => {
  it("mette insieme account e figli senza account", () => {
    expect(pickCelebrants([user()], [child()], NOON)).toEqual([
      { key: "u:u1", name: "Giulia Rossi", slug: "giulia-rossi" },
      { key: "c:c1", name: "Luca Bianchi", slug: "luca-bianchi" },
    ]);
  });

  it("chi non ha lo slug resta: l'account linka con l'id, il figlio pure", () => {
    expect(pickCelebrants([user({ slug: null })], [child({ slug: null })], NOON)).toEqual([
      { key: "u:u1", name: "Giulia Rossi", slug: "u1" },
      { key: "c:c1", name: "Luca Bianchi", slug: "c1" },
    ]);
  });

  it("un genitore che non gioca riceve gli auguri senza link", () => {
    const parent = user({ appRole: "PARENT", sportRole: null });
    expect(pickCelebrants([parent], [], NOON)[0].slug).toBeNull();
  });

  it("scheda figlio e account della stessa persona: una volta sola", () => {
    const result = pickCelebrants([user()], [child({ userId: "u1" })], NOON);
    expect(result.map((c) => c.key)).toEqual(["u:u1"]);
  });

  it("se l'account collegato non festeggia (senza data), resta la scheda figlio", () => {
    const result = pickCelebrants([], [child({ userId: "u1" })], NOON);
    expect(result.map((c) => c.key)).toEqual(["c:c1"]);
  });

  it("scarta chi compie gli anni un altro giorno", () => {
    const other = new Date("2010-03-15");
    expect(
      pickCelebrants([user({ birthDate: other })], [child({ birthDate: other })], NOON)
    ).toEqual([]);
  });
});
