import { describe, it, expect } from "vitest";
import {
  LEVEL_GAP,
  ROTATION_GAP,
  roleHints,
  roleSummary,
  type HintCandidate,
} from "./opponentBriefing";
import type { OpponentProfile, OpponentStrength } from "@/lib/schemas/match";

const profile = (role: number, strength: OpponentStrength): OpponentProfile => ({
  categories: { [String(role)]: { strength, physicality: "MEDIUM" } },
});

const player = (over: Partial<HintCandidate>): HintCandidate => ({
  sportRole: 5,
  ratingMu: 25,
  seasonCallups: 0,
  availability: true,
  selected: false,
  ...over,
});

describe("loro forti: c'è di meglio fra i disponibili", () => {
  const called = player({ selected: true, ratingMu: 22 });

  it("un disponibile nettamente più alto di un convocato", () => {
    const hints = roleHints(profile(5, "STRONG"), [called, player({ ratingMu: 22 + LEVEL_GAP })]);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({
      role: 5,
      kind: "stronger",
      action: "Vedi i 5",
      unconfirmed: false,
    });
    expect(hints[0]!.text).toContain("I loro 5 sono forti");
  });

  it("una differenza piccola sta dentro l'incertezza: niente", () => {
    expect(
      roleHints(profile(5, "STRONG"), [called, player({ ratingMu: 22 + LEVEL_GAP - 0.1 })])
    ).toEqual([]);
  });

  it("chi ha detto di no o non è ancora valutato non si suggerisce", () => {
    for (const bench of [
      player({ ratingMu: 40, availability: false }),
      player({ ratingMu: null }),
      player({ ratingMu: null, availability: null }),
    ]) {
      expect(roleHints(profile(5, "STRONG"), [called, bench])).toEqual([]);
    }
  });

  it("chi non ha risposto si suggerisce, ma il testo lo dice", () => {
    const hints = roleHints(profile(5, "STRONG"), [
      called,
      player({ ratingMu: 40, availability: null }),
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0]!.unconfirmed).toBe(true);
    expect(hints[0]!.text).toContain("non ha ancora risposto");
    expect(hints[0]!.text).not.toContain("Fra i disponibili");
  });

  it("se basta chi ha detto che c'è, di chi non ha risposto non si parla", () => {
    const hints = roleHints(profile(5, "STRONG"), [
      called,
      player({ ratingMu: 40, availability: null }),
      player({ ratingMu: 30 }),
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0]!.unconfirmed).toBe(false);
    expect(hints[0]!.text).toContain("Fra i disponibili");
  });

  it("guarda solo il ruolo valutato", () => {
    expect(
      roleHints(profile(5, "STRONG"), [called, player({ sportRole: 4, ratingMu: 40 })])
    ).toEqual([]);
  });

  it("senza convocati in quel ruolo non c'è un confronto da fare", () => {
    expect(roleHints(profile(5, "STRONG"), [player({ ratingMu: 40 })])).toEqual([]);
  });
});

describe("loro deboli: spazio a chi ha giocato meno", () => {
  it("un disponibile con meno convocazioni di un convocato", () => {
    const hints = roleHints(profile(3, "WEAK"), [
      player({ sportRole: 3, selected: true, seasonCallups: ROTATION_GAP }),
      player({ sportRole: 3, seasonCallups: 0 }),
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({ role: 3, kind: "rotation" });
    expect(hints[0]!.text).toContain("chi ha giocato meno");
    expect(hints[0]!.text).not.toContain("non ha ancora risposto");
  });

  it("se chi ha giocato meno non ha risposto, lo dice", () => {
    const hints = roleHints(profile(3, "WEAK"), [
      player({ sportRole: 3, selected: true, seasonCallups: 4 }),
      player({ sportRole: 3, seasonCallups: 3 }),
      player({ sportRole: 3, seasonCallups: 0, availability: null }),
    ]);
    expect(hints).toHaveLength(1);
    expect(hints[0]!.unconfirmed).toBe(true);
    expect(hints[0]!.text).toContain("non ha ancora risposto");
  });

  it("non guarda il livello, e una convocazione di differenza non basta", () => {
    expect(
      roleHints(profile(3, "WEAK"), [
        player({ sportRole: 3, selected: true, seasonCallups: 1, ratingMu: 10 }),
        player({ sportRole: 3, seasonCallups: 0, ratingMu: 40 }),
      ])
    ).toEqual([]);
  });
});

describe("roleHints", () => {
  it("senza scheda o con un ruolo nella media non dice nulla", () => {
    const players = [player({ selected: true, ratingMu: 10 }), player({ ratingMu: 40 })];
    expect(roleHints(null, players)).toEqual([]);
    expect(roleHints(profile(5, "MEDIUM"), players)).toEqual([]);
  });

  it("al massimo uno per ruolo, in ordine di ruolo", () => {
    const both: OpponentProfile = {
      categories: {
        "5": { strength: "STRONG", physicality: "HIGH" },
        "3": { strength: "WEAK", physicality: "LOW" },
      },
    };
    const hints = roleHints(both, [
      player({ selected: true, ratingMu: 10 }),
      player({ ratingMu: 40 }),
      player({ ratingMu: 38 }),
      player({ sportRole: 3, selected: true, seasonCallups: 6 }),
      player({ sportRole: 3, seasonCallups: 0 }),
    ]);
    expect(hints.map((h) => [h.role, h.kind])).toEqual([
      [3, "rotation"],
      [5, "stronger"],
    ]);
  });
});

describe("roleSummary", () => {
  it("dice solo quello che esce dalla media", () => {
    expect(roleSummary({ strength: "STRONG", physicality: "HIGH" })).toBe("forti, fisicità alta");
    expect(roleSummary({ strength: "WEAK", physicality: "MEDIUM" })).toBe("deboli");
    expect(roleSummary({ strength: "MEDIUM", physicality: "LOW" })).toBe("fisicità bassa");
    expect(roleSummary({ strength: "MEDIUM", physicality: "MEDIUM" })).toBeNull();
  });

  it("un ruolo nella media con un giocatore segnalato si legge lo stesso", () => {
    expect(
      roleSummary({
        strength: "MEDIUM",
        physicality: "MEDIUM",
        players: [{ number: "14", note: "Tira da fuori" }],
      })
    ).toBe("nella media");
  });
});
