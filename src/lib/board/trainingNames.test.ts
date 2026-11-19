import { describe, expect, it } from "vitest";
import type { TeamsData } from "@/lib/schemas/session";
import { PICK_AND_SHOOT } from "./fixtures";
import { opponentKey, trainingPieceNames, trainingTeamKeys } from "./trainingNames";

const teams: TeamsData = {
  teamA: [
    { id: "r1", name: "Marco Rossi", role: 3 },
    { id: "r2", name: "Luca Bianchi", role: 4 },
  ],
  teamB: [{ id: "r3", name: "Paolo Verdi", role: 4 }],
  teamC: [{ id: "r4", name: "Anna Neri", role: 4 }],
  numTeams: 3,
  generated: true,
};

describe("trainingNames", () => {
  it("chi difende e' la squadra dopo, in giro", () => {
    expect(trainingTeamKeys(teams)).toEqual(["teamA", "teamB", "teamC"]);
    expect(opponentKey(teams, "teamA")).toBe("teamB");
    expect(opponentKey(teams, "teamC")).toBe("teamA");
    expect(opponentKey({ ...teams, teamB: [], teamC: undefined }, "teamA")).toBeNull();
  });

  it("nome di battesimo, Tu per chi guarda e famiglia per un figlio", () => {
    const names = trainingPieceNames(PICK_AND_SHOOT, {
      teams,
      attack: "teamA",
      assignments: null,
      seed: "s1:d1",
      marks: { r1: "self", r3: "family" },
    });
    expect(names.a3).toEqual({ athleteId: "r1", name: "Marco", me: true, family: false });
    expect(names.a4.name).toBe("Luca");
    expect(names.d4).toEqual({ athleteId: "r3", name: "Paolo", me: false, family: true });
  });

  it("senza squadre o senza squadra scelta, nessun nome", () => {
    const base = { assignments: null, seed: "x" };
    expect(trainingPieceNames(PICK_AND_SHOOT, { ...base, teams: null, attack: "teamA" })).toEqual(
      {}
    );
    expect(trainingPieceNames(PICK_AND_SHOOT, { ...base, teams, attack: null })).toEqual({});
  });
});
