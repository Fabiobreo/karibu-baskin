import { describe, expect, it } from "vitest";
import { badgesUnlockedByMatch } from "./badgesOfMatch";
import type { MatchStat, StatsInput } from "./badges";

const stat = (day: number, points = 0): MatchStat => ({
  points,
  twoPointers: points / 2,
  threePointers: 0,
  freeThrows: 0,
  shotsAttempted: points / 2,
  fouls: 0,
  illegalFouls: 0,
  isLoan: false,
  won: false,
  date: new Date(Date.UTC(2026, 9, day)),
  season: "2026-27",
});

const input = (stats: MatchStat[]): StatsInput => ({
  matchStats: stats,
  mvpCount: 0,
  topScorerCount: 0,
  sportRole: 3,
});

const ids = (badges: { id: string }[]) => badges.map((b) => b.id).sort();

describe("badgesUnlockedByMatch", () => {
  it("la prima partita con punti dà Esordiente e Primo canestro", () => {
    const s = [stat(1, 4)];
    expect(ids(badgesUnlockedByMatch(input(s), [], s[0].date))).toEqual(
      ["esordiente", "primo_canestro"].sort()
    );
  });

  it("la quinta partita dà 5 partite, le partite dopo non contano", () => {
    const s = [1, 2, 3, 4, 5, 6, 7].map((d) => stat(d));
    const unlocked = ids(badgesUnlockedByMatch(input(s), [], s[4].date));
    expect(unlocked).toContain("cinque_partite");
    expect(unlocked).not.toContain("esordiente");
    // La sesta partita non sblocca niente di nuovo legato al numero di partite.
    expect(ids(badgesUnlockedByMatch(input(s), [], s[5].date))).not.toContain("cinque_partite");
  });

  it("l'MVP di questa partita conta, quelli dopo no", () => {
    const s = [stat(1), stat(2)];
    const mvpDates = [s[1].date];
    expect(ids(badgesUnlockedByMatch(input(s), mvpDates, s[1].date))).toContain("mvp");
    expect(ids(badgesUnlockedByMatch(input(s), mvpDates, s[0].date))).not.toContain("mvp");
  });

  it("niente traguardi nuovi: lista vuota", () => {
    const s = [stat(1), stat(2)];
    expect(badgesUnlockedByMatch(input(s), [], s[1].date)).toEqual([]);
  });
});
