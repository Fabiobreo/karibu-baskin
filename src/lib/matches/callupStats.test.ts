import { describe, expect, it } from "vitest";
import { teamPeriods } from "./teamHistory";
import {
  computeCandidateStats,
  type CandidateInput,
  type RegistrationLookup,
  type SessionEligibilityInput,
} from "./callupStats";

const now = new Date("2026-11-10T12:00:00Z");

function candidate(teamIds: string[]): CandidateInput {
  return {
    kind: "user",
    id: "u1",
    name: "Giulia",
    image: null,
    sportRole: 3,
    sportRoleVariant: null,
    isCaptain: false,
    teamIds,
    ratingMu: null,
    gender: "FEMALE",
    height: null,
  };
}

function session(
  id: string,
  restrictTeamId: string | null,
  date = "2026-11-01T18:00:00Z"
): SessionEligibilityInput {
  return {
    id,
    date: new Date(date),
    managedAt: new Date("2026-11-01T20:00:00Z"),
    allowedRoles: [],
    restrictTeamId,
    openRoles: [],
  };
}

function reg(sessionId: string, attended: boolean | null): RegistrationLookup {
  return { sessionId, userId: "u1", childId: null, attended };
}

function stats(sessions: SessionEligibilityInput[], regs: RegistrationLookup[]) {
  return computeCandidateStats({
    candidates: [candidate(["team2"])],
    windowSessions: sessions,
    registrations: regs,
    callups: [],
    referenceDate: now,
  })[0];
}

describe("computeCandidateStats, cambio di squadra", () => {
  it("conta gli allenamenti fatti con la squadra di prima", () => {
    const s = stats(
      [session("a", "team1"), session("b", "team1"), session("c", "team2"), session("d", "team2")],
      [reg("a", true), reg("b", true), reg("c", true), reg("d", true)]
    );
    expect(s.presences).toBe(4);
    expect(s.eligibleSessions).toBe(4);
    expect(s.absences).toBe(0);
  });

  it("un'iscrizione con la squadra di prima senza presenza è un'assenza", () => {
    const s = stats([session("a", "team1"), session("c", "team2")], [reg("a", false)]);
    expect(s.presences).toBe(0);
    expect(s.eligibleSessions).toBe(2);
    expect(s.absences).toBe(2);
  });

  it("gli allenamenti di un'altra squadra senza iscrizione non contano", () => {
    const s = stats([session("a", "team1"), session("c", "team2")], [reg("c", true)]);
    expect(s.presences).toBe(1);
    expect(s.eligibleSessions).toBe(1);
  });
});

describe("computeCandidateStats, con lo storico delle squadre", () => {
  const season = { season: "2026-27" };
  const periods = new Map([
    [
      "user-u1",
      teamPeriods(
        [{ teamId: "team2", createdAt: new Date("2026-11-01T00:00:00Z"), team: season }],
        [
          {
            teamId: "team1",
            startedAt: new Date("2026-09-27T00:00:00Z"),
            endedAt: new Date("2026-11-01T00:00:00Z"),
            team: season,
          },
        ]
      ),
    ],
  ]);
  const sessions = [
    session("old1", "team1", "2026-10-28T18:00:00Z"),
    session("old2", "team2", "2026-10-29T18:00:00Z"),
    session("new1", "team2", "2026-11-04T18:00:00Z"),
    session("new2", "team1", "2026-11-05T18:00:00Z"),
  ];

  it("conta le assenze con la squadra di prima e non quelle della nuova prima del cambio", () => {
    const s = computeCandidateStats({
      candidates: [candidate(["team2"])],
      windowSessions: sessions,
      registrations: [reg("new1", true)],
      callups: [],
      referenceDate: now,
      teamPeriods: periods,
    })[0];
    // old1 (team1 quando c'era) + new1 (team2 dopo il cambio)
    expect(s.eligibleSessions).toBe(2);
    expect(s.presences).toBe(1);
    expect(s.absences).toBe(1);
  });
});
