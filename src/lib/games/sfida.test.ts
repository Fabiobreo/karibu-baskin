import { describe, expect, it } from "vitest";
import { validateLineup } from "@/lib/rating/lineupRules";
import { mulberry32 } from "@/lib/seededRandom";
import {
  quarterPlan,
  quartersPlayed,
  randomLineup,
  rosterShortfall,
  splitMixed,
  swapOptions,
  type SfidaPlayer,
} from "@/lib/games/sfida";

let n = 0;
const P = (sportRole: number | null, gender: "MALE" | "FEMALE" = "MALE"): SfidaPlayer => ({
  key: `user-p${++n}`,
  sportRole,
  gender,
});

/** Una rosa da 11 come quella di una squadra vera. */
const roster = () => [
  P(1, "FEMALE"),
  P(2),
  P(3),
  P(3, "FEMALE"),
  P(4, "FEMALE"),
  P(4),
  P(4, "FEMALE"),
  P(5, "FEMALE"),
  P(5),
  P(5, "FEMALE"),
  P(5),
];

describe("randomLineup", () => {
  it("fa sempre formazioni valide", () => {
    const r = roster();
    for (let seed = 1; seed < 60; seed++) {
      const l = randomLineup(r, mulberry32(seed));
      expect(l).not.toBeNull();
      expect(validateLineup(l!).valid).toBe(true);
    }
  });
  it("lascia fuori chi non ha un ruolo", () => {
    const r = [...roster(), P(null)];
    for (let seed = 1; seed < 30; seed++) {
      expect(randomLineup(r, mulberry32(seed))!.every((p) => p.sportRole !== null)).toBe(true);
    }
  });
  it("null se mancano i ruoli 5", () => {
    expect(randomLineup([P(1), P(3), P(4), P(4, "FEMALE"), P(5), P(3)], mulberry32(1))).toBeNull();
  });
});

describe("quarterPlan", () => {
  it("4 tempi validi, tutti in campo almeno un tempo", () => {
    const r = roster();
    for (let seed = 1; seed < 40; seed++) {
      const plan = quarterPlan(r, mulberry32(seed));
      expect(plan).not.toBeNull();
      expect(plan!).toHaveLength(4);
      for (const l of plan!) expect(validateLineup(l).valid).toBe(true);
      const played = quartersPlayed(plan!);
      for (const p of r) {
        expect(played.get(p.key)).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it("senza massimo: un pivot solo gioca tutti e quattro i tempi", () => {
    const r = [
      P(1, "FEMALE"),
      P(3),
      P(3, "FEMALE"),
      P(4, "FEMALE"),
      P(4),
      P(5),
      P(5, "FEMALE"),
      P(5),
    ];
    const plan = quarterPlan(r, mulberry32(2));
    expect(plan).not.toBeNull();
    expect(quartersPlayed(plan!).get(r[0].key)).toBe(4);
  });
  it("in 6 giocano tutti sempre; in 5 non si fa", () => {
    const six = [P(1), P(3), P(4, "FEMALE"), P(5), P(5, "FEMALE"), P(4)];
    expect(quarterPlan(six, mulberry32(1))).not.toBeNull();
    expect(quarterPlan([P(1), P(3), P(4, "FEMALE"), P(5), P(4)], mulberry32(1))).toBeNull();
  });
});

describe("splitMixed", () => {
  it("divide tutti in due lati senza doppioni", () => {
    const all = [...roster(), ...roster()];
    const [a, b] = splitMixed(all, mulberry32(3));
    expect(a.length + b.length).toBe(all.length);
    expect(new Set([...a, ...b].map((p) => p.key)).size).toBe(all.length);
    expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(5);
    expect(randomLineup(a, mulberry32(1))).not.toBeNull();
    expect(randomLineup(b, mulberry32(1))).not.toBeNull();
  });
});

describe("swapOptions", () => {
  const pivot = P(1, "FEMALE");
  const three = P(3);
  const four = P(4, "FEMALE");
  const fourM = P(4);
  const fiveF = P(5, "FEMALE");
  const fiveM = P(5);
  const lineup = [pivot, three, four, fourM, fiveF, fiveM];

  it("dalla panchina entra solo chi lascia valida la formazione", () => {
    const pivot2 = P(2);
    const three2 = P(3, "FEMALE");
    const { options, blockedBy } = swapOptions({
      lineup,
      out: four,
      bench: [pivot2, three2],
    });
    expect(options.map((o) => o.player)).toEqual([three2]);
    expect(blockedBy).toBe("pivot");
  });
  it("propone gli scambi con l'altra squadra", () => {
    const other = [P(2), P(3), P(4, "FEMALE"), P(4), P(5, "FEMALE"), P(5)];
    const { options } = swapOptions({ lineup, out: four, bench: [], other });
    expect(options.some((o) => o.from === "other" && o.player === other[2])).toBe(true);
    expect(options.some((o) => o.player === other[0])).toBe(false);
  });
  it("posto vuoto: controlla solo quello che non si recupera", () => {
    const { options } = swapOptions({ lineup: [pivot], out: null, bench: [P(2), P(5)] });
    expect(options.map((o) => o.player.sportRole)).toEqual([5]);
  });
  it("partita intera: chi gioca un tempo solo non esce, gli altri si cambiano", () => {
    const extra = P(4, "FEMALE");
    const played = new Map(lineup.map((p) => [p.key, 4]));
    played.set(four.key, 1);
    expect(swapOptions({ lineup, out: four, bench: [extra], played }).blockedBy).toBe(
      "lastQuarter"
    );
    played.set(four.key, 2);
    played.set(extra.key, 4);
    const r = swapOptions({ lineup, out: four, bench: [extra], played });
    expect(r.options.map((o) => o.player)).toEqual([extra]);
  });
});

describe("rosterShortfall", () => {
  it("dice cosa manca a una rosa", () => {
    const ok = [P(1), P(3), P(4, "FEMALE"), P(5), P(5, "FEMALE"), P(4)];
    expect(rosterShortfall(ok)).toBeNull();
    expect(rosterShortfall([P(3), P(3), P(4, "FEMALE"), P(5), P(5, "FEMALE"), P(4)])).toBe("pivot");
    expect(rosterShortfall([P(1), P(4), P(4, "FEMALE"), P(5), P(5, "FEMALE"), P(4)])).toBe("three");
    expect(rosterShortfall([P(1), P(3), P(4, "FEMALE"), P(5), P(4), P(4)])).toBe("fives");
    expect(rosterShortfall([P(1), P(3), P(4), P(5), P(5), P(4)])).toBe("gender");
    expect(rosterShortfall([P(1), P(3), P(5, "FEMALE"), P(5)])).toBe("players");
  });
});
