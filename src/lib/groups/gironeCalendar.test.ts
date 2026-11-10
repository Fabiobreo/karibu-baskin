import { describe, expect, it } from "vitest";
import { buildCalendar, type GironeOtherMatch, type GironeOurMatch } from "./gironeCalendar";

const our = (id: string, matchday: number | null, date: string): GironeOurMatch => ({
  id,
  slug: null,
  date,
  isHome: true,
  matchday,
  ourScore: null,
  theirScore: null,
  result: null,
  teamId: "kap",
  opponent: null,
  _count: { playerStats: 0 },
});

const other = (id: string, matchday: number | null, date: string | null): GironeOtherMatch => ({
  id,
  matchday,
  date,
  homeTeamId: "a",
  awayTeamId: "b",
  homeScore: null,
  awayScore: null,
  homeTeam: { id: "a", name: "A", slug: null },
  awayTeam: { id: "b", name: "B", slug: null },
});

describe("buildCalendar", () => {
  it("mette nostre e altre partite nella stessa giornata, in ordine di data", () => {
    const days = buildCalendar(
      [our("o1", 1, "2025-10-19T13:00:00Z"), our("o2", 2, "2025-11-16T09:00:00Z")],
      [other("x1", 1, "2025-10-05T08:00:00Z"), other("x2", null, null)]
    );
    expect(days.map((d) => d.matchday)).toEqual([1, 2, null]);
    expect(days[0].entries.map((e) => e.match.id)).toEqual(["x1", "o1"]);
    expect(days[0].entries.map((e) => e.kind)).toEqual(["other", "ours"]);
  });
});
