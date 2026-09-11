import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    competitiveTeam: { findFirst: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
  },
}));

import {
  appendMixedTeamIds,
  ensureClubTeam,
  expandRosterTeamIds,
  isMatchTypeAllowedForMixed,
  mixedMatchError,
} from "./mixedTeam";
import { prisma } from "@/lib/db";

const db = prisma as unknown as {
  competitiveTeam: { findFirst: Mock; upsert: Mock };
};

describe("ensureClubTeam", () => {
  beforeEach(() => vi.clearAllMocks());

  it("se la Karibu della stagione esiste già la restituisce, senza crearne un'altra", async () => {
    db.competitiveTeam.findFirst.mockResolvedValue({ id: "vecchia-karibu" });
    expect(await ensureClubTeam("2025-26")).toBe("vecchia-karibu");
    expect(db.competitiveTeam.upsert).not.toHaveBeenCalled();
  });

  it("altrimenti la crea con id fisso per stagione, nome Karibu, nascosta", async () => {
    db.competitiveTeam.findFirst.mockResolvedValue(null);
    db.competitiveTeam.upsert.mockResolvedValue({});
    expect(await ensureClubTeam("2025-26")).toBe("karibu-2025-26");
    const args = db.competitiveTeam.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ id: "karibu-2025-26" });
    expect(args.create).toMatchObject({ name: "Karibu", season: "2025-26", isMixed: true });
    // Due richieste in contemporanea non creano un doppione: l'upsert non tocca
    // la riga se l'altra l'ha già inserita.
    expect(args.update).toEqual({});
  });
});

const S1 = { id: "s1", season: "2026-27", isMixed: false };
const S2 = { id: "s2", season: "2026-27", isMixed: false };
const MIX = { id: "mix", season: "2026-27", isMixed: true };
const OLD = { id: "old", season: "2025-26", isMixed: false };
const SEASON_TEAMS = [S1, S2, OLD];

describe("expandRosterTeamIds", () => {
  it("una squadra normale legge solo la propria rosa", () => {
    expect(expandRosterTeamIds([S1], SEASON_TEAMS)).toEqual(["s1"]);
  });

  it("una mista legge le rose di tutte le squadre non miste della sua stagione", () => {
    expect(expandRosterTeamIds([MIX], SEASON_TEAMS).sort()).toEqual(["s1", "s2"]);
  });

  it("non pesca dalle stagioni diverse", () => {
    expect(expandRosterTeamIds([MIX], SEASON_TEAMS)).not.toContain("old");
  });

  it("Squadra 1 vs Mista: nessun doppione", () => {
    expect(expandRosterTeamIds([S1, MIX], SEASON_TEAMS).sort()).toEqual(["s1", "s2"]);
  });

  it("ignora le miste tra le squadre della stagione", () => {
    expect(expandRosterTeamIds([MIX], [...SEASON_TEAMS, MIX]).sort()).toEqual(["s1", "s2"]);
  });
});

describe("appendMixedTeamIds", () => {
  it("aggiunge la mista della stessa stagione, dopo le squadre proprie", () => {
    expect(appendMixedTeamIds([S1], [MIX])).toEqual(["s1", "mix"]);
  });

  it("non aggiunge le miste di altre stagioni", () => {
    expect(appendMixedTeamIds([OLD], [MIX])).toEqual(["old"]);
  });

  it("chi non è in nessuna squadra non gioca nella mista", () => {
    expect(appendMixedTeamIds([], [MIX])).toEqual([]);
  });
});

describe("mixedMatchError", () => {
  it("amichevoli e tornei sono ammessi", () => {
    expect(isMatchTypeAllowedForMixed("FRIENDLY")).toBe(true);
    expect(isMatchTypeAllowedForMixed("TOURNAMENT")).toBe(true);
    expect(mixedMatchError({ involvesMixed: true, matchType: "TOURNAMENT", groupId: null })).toBe(
      null
    );
  });

  it("il campionato no", () => {
    expect(mixedMatchError({ involvesMixed: true, matchType: "LEAGUE", groupId: null })).toMatch(
      /amichevoli e tornei/
    );
  });

  it("niente gironi", () => {
    expect(mixedMatchError({ involvesMixed: true, matchType: "FRIENDLY", groupId: "g1" })).toMatch(
      /girone/
    );
  });

  it("senza mista non si applica nessuna regola", () => {
    expect(mixedMatchError({ involvesMixed: false, matchType: "LEAGUE", groupId: "g1" })).toBe(
      null
    );
  });
});
