import { describe, it, expect } from "vitest";
import { mergedFields, replaceRegistrationInTeams } from "./registrationMerge";

const reg = (id: string, attended: boolean | null = null, note: string | null = null) => ({
  id,
  attended,
  note,
});

describe("mergedFields", () => {
  it("porta la presenza dell'anonima se sull'account non è segnata", () => {
    expect(mergedFields(reg("k"), reg("a", true))).toEqual({ attended: true });
    expect(mergedFields(reg("k"), reg("a", false))).toEqual({ attended: false });
  });

  it("non tocca una presenza già segnata sull'account", () => {
    expect(mergedFields(reg("k", false), reg("a", true))).toEqual({});
  });

  it("porta la nota solo se all'account manca", () => {
    expect(mergedFields(reg("k"), reg("a", null, "Esco prima"))).toEqual({ note: "Esco prima" });
    expect(mergedFields(reg("k", null, "Mia"), reg("a", null, "Altra"))).toEqual({});
  });

  it("niente da portare se l'anonima non sa niente in più", () => {
    expect(mergedFields(reg("k"), reg("a"))).toEqual({});
  });
});

describe("replaceRegistrationInTeams", () => {
  const teams = {
    teamA: [
      { id: "anon", name: "Barbara", role: 3 },
      { id: "x", name: "Luca", role: 2 },
    ],
    teamB: [{ id: "y", name: "Anna", role: 1 }],
    coaches: [{ id: "c", name: "Coach" }],
    numTeams: 2,
    generated: true,
  };

  it("passa all'iscrizione che resta il posto dell'anonima", () => {
    const out = replaceRegistrationInTeams(teams, "anon", "kept");
    expect(out.changed).toBe(true);
    const t = out.teams as typeof teams;
    expect(t.teamA.map((a) => a.id)).toEqual(["kept", "x"]);
    expect(t.teamA[0].name).toBe("Barbara");
    expect(t.numTeams).toBe(2);
    expect(t.generated).toBe(true);
  });

  it("toglie l'anonima se l'iscrizione che resta è già in squadra", () => {
    const both = { ...teams, teamB: [...teams.teamB, { id: "kept", name: "Barbara", role: 3 }] };
    const t = replaceRegistrationInTeams(both, "anon", "kept").teams as typeof teams;
    expect(t.teamA.map((a) => a.id)).toEqual(["x"]);
    expect(t.teamB.map((a) => a.id)).toEqual(["y", "kept"]);
  });

  it("vale anche per gli allenatori", () => {
    const t = replaceRegistrationInTeams(teams, "c", "kept").teams as typeof teams;
    expect(t.coaches).toEqual([{ id: "kept", name: "Coach" }]);
  });

  it("non cambia niente se le squadre non nominano l'anonima", () => {
    const out = replaceRegistrationInTeams(teams, "altro", "kept");
    expect(out.changed).toBe(false);
    expect(out.teams).toBe(teams);
  });

  it("regge squadre assenti o malformate", () => {
    expect(replaceRegistrationInTeams(null, "a", "b").changed).toBe(false);
    expect(replaceRegistrationInTeams([], "a", "b").changed).toBe(false);
    expect(replaceRegistrationInTeams({ teamA: "x" }, "a", "b").changed).toBe(false);
  });
});
