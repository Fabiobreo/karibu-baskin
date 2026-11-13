import { describe, expect, it } from "vitest";
import { validateLineup } from "@/lib/rating/lineupRules";
import { mulberry32 } from "@/lib/seededRandom";
import {
  buildSfida,
  cleanSideName,
  parseSfidaLink,
  sfidaSearchParams,
  type SfidaContext,
  type SfidaPlayerView,
} from "@/lib/games/sfidaState";

let n = 0;
const P = (
  sportRole: number | null,
  gender: "MALE" | "FEMALE",
  teamIds: string[]
): SfidaPlayerView => ({ key: `user-p${++n}`, name: `P${n}`, sportRole, gender, teamIds });

const team = (id: string) => [
  P(1, "FEMALE", [id]),
  P(2, "MALE", [id]),
  P(3, "MALE", [id]),
  P(3, "FEMALE", [id]),
  P(4, "FEMALE", [id]),
  P(4, "MALE", [id]),
  P(4, "FEMALE", [id]),
  P(5, "FEMALE", [id]),
  P(5, "MALE", [id]),
  P(5, "FEMALE", [id]),
  P(5, "MALE", [id]),
];

const ctx = (teams: string[]): SfidaContext => ({
  players: teams.flatMap(team),
  teams: teams.map((id) => ({ id, name: id, fill: { bg: "x", fg: "y" } })),
  names: ["Canestri Volanti", "Triple Matte", "Assist d'Oro"],
});

const byKey = (c: SfidaContext) => new Map(c.players.map((p) => [p.key, p]));

describe("buildSfida", () => {
  it("con due squadre vere fa le squadre della stagione", () => {
    const c = ctx(["kap", "mon"]);
    const s = buildSfida(c, { mode: "six", grouping: "season" }, mulberry32(1))!;
    expect(s.grouping).toBe("season");
    expect(s.sides.map((x) => x.teamId).sort()).toEqual(["kap", "mon"]);
    const map = byKey(c);
    for (const side of s.sides) {
      expect(validateLineup(side.lineup.map((k) => map.get(k)!)).valid).toBe(true);
      expect(side.color?.kind).toBe("team");
    }
  });

  it("con una squadra sola mescola, con i nomi casuali e le casacche", () => {
    const c = { ...ctx(["kap"]), players: [...team("kap"), ...team("kap")] };
    const s = buildSfida(c, { mode: "six", grouping: "season" }, mulberry32(2))!;
    expect(s.grouping).toBe("mixed");
    expect(c.names).toContain(s.sides[0].name);
    expect(s.sides[0].color).toEqual({ kind: "bib", bib: "orange" });
    const all = [...s.sides[0].lineup, ...s.sides[1].lineup];
    expect(new Set(all).size).toBe(12);
  });

  it("partita intera: 4 tempi per lato", () => {
    const c = ctx(["kap", "mon"]);
    const s = buildSfida(c, { mode: "full", grouping: "season" }, mulberry32(3))!;
    for (const side of s.sides) expect(side.quarters).toHaveLength(4);
  });

  it("null se non ci sono abbastanza giocatori", () => {
    const c: SfidaContext = { players: [P(1, "MALE", [])], teams: [], names: ["A", "B"] };
    expect(buildSfida(c, { mode: "six", grouping: "mixed" }, mulberry32(1))).toBeNull();
  });
});

describe("link condiviso", () => {
  it("andata e ritorno con le stesse formazioni e gli stessi nomi", () => {
    const c = ctx(["kap", "mon"]);
    for (const mode of ["six", "full"] as const) {
      const s = buildSfida(c, { mode, grouping: "season" }, mulberry32(4), 7)!;
      s.sides[0].name = "Kapuleti del sabato";
      const params = Object.fromEntries(sfidaSearchParams(s));
      const back = parseSfidaLink(params, c)!;
      expect(back.mode).toBe(mode);
      expect(back.nonce).toBe(7);
      expect(back.sides[0].name).toBe("Kapuleti del sabato");
      expect(back.sides[0].lineup).toEqual(s.sides[0].lineup);
      expect(back.sides[1].quarters).toEqual(s.sides[1].quarters);
    }
  });

  it("un link con chi non è della stagione non vale", () => {
    const c = ctx(["kap", "mon"]);
    expect(parseSfidaLink({ m: "six", g: "mixed", a: "user-nessuno", b: "user-p1" }, c)).toBeNull();
    expect(parseSfidaLink({}, c)).toBeNull();
  });
});

describe("cleanSideName", () => {
  it("toglie a capo e spazi, tiene 20 caratteri", () => {
    expect(cleanSideName("  I   Rimbalzi\nFelici  ")).toBe("I Rimbalzi Felici");
    expect(cleanSideName("x".repeat(40))).toHaveLength(20);
  });
});
