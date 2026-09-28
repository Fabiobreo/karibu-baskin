import { describe, expect, it } from "vitest";
import {
  groupByMonth,
  groupUpcoming,
  isSeasonLabel,
  matchupTeams,
  seasonsBetween,
  trainingSeasonOf,
  trainingSeasonRange,
} from "./trainingList";

describe("trainingSeasonOf", () => {
  it("assegna agosto alla stagione che comincia", () => {
    expect(trainingSeasonOf(new Date(2026, 7, 1))).toBe("2026-27");
    expect(trainingSeasonOf(new Date(2026, 6, 31))).toBe("2025-26");
    expect(trainingSeasonOf(new Date(2027, 0, 10))).toBe("2026-27");
  });
});

describe("isSeasonLabel", () => {
  it("accetta solo anni consecutivi", () => {
    expect(isSeasonLabel("2025-26")).toBe(true);
    expect(isSeasonLabel("2099-00")).toBe(true);
    expect(isSeasonLabel("2025-27")).toBe(false);
    expect(isSeasonLabel("2025")).toBe(false);
    expect(isSeasonLabel(undefined)).toBe(false);
  });
});

describe("trainingSeasonRange", () => {
  it("va dal 1° agosto al 1° agosto successivo", () => {
    const { start, end } = trainingSeasonRange("2025-26");
    expect(start).toEqual(new Date(2025, 7, 1));
    expect(end).toEqual(new Date(2026, 7, 1));
  });
});

describe("seasonsBetween", () => {
  it("elenca dalla piu' recente", () => {
    expect(seasonsBetween("2023-24", "2025-26")).toEqual(["2025-26", "2024-25", "2023-24"]);
    expect(seasonsBetween("2025-26", "2025-26")).toEqual(["2025-26"]);
  });
});

describe("groupUpcoming", () => {
  // Mercoledi' 30 settembre 2026: la settimana va da lunedi' 28 a domenica 4.
  const now = new Date(2026, 8, 30, 12);
  const at = (m: number, d: number, y = 2026) => ({ date: new Date(y, m, d, 18) });

  it("separa questa settimana, la prossima e i mesi", () => {
    const groups = groupUpcoming(
      [at(9, 1), at(9, 4), at(9, 5), at(9, 11), at(9, 12), at(9, 26), at(10, 2), at(0, 8, 2027)],
      now
    );
    expect(groups.map((g) => g.group.kind)).toEqual([
      "thisWeek",
      "nextWeek",
      "month",
      "month",
      "month",
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 2, 2, 1, 1]);
    const last = groups[4].group;
    expect(last.kind === "month" && last.showYear).toBe(true);
    const october = groups[2].group;
    expect(october.kind === "month" && october.showYear).toBe(false);
  });

  it("restituisce un elenco vuoto senza allenamenti", () => {
    expect(groupUpcoming([], now)).toEqual([]);
  });
});

describe("groupByMonth", () => {
  it("mantiene l'ordine ricevuto", () => {
    const items = [
      { date: new Date(2026, 8, 22) },
      { date: new Date(2026, 8, 15) },
      { date: new Date(2026, 7, 30) },
    ];
    const groups = groupByMonth(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].month.getMonth()).toBe(7);
  });
});

describe("matchupTeams", () => {
  it("legge le coppie e il caso storico senza matchup", () => {
    expect(matchupTeams("BC")).toEqual(["teamB", "teamC"]);
    expect(matchupTeams(null)).toEqual(["teamA", "teamB"]);
    expect(matchupTeams("ZZ")).toBeNull();
  });
});
