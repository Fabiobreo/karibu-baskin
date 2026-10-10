import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { sessionAudience, type AudienceChild, type AudienceUser } from "./sessionAudience";

function user(id: string, over: Partial<AudienceUser> = {}): AudienceUser {
  return {
    id,
    appRole: "ATHLETE",
    sportRole: 3,
    inRestrictedTeam: false,
    hasAnyTeam: true,
    ...over,
  };
}

function child(parent: string, over: Partial<AudienceChild> = {}): AudienceChild {
  return { sportRole: 1, inRestrictedTeam: false, notifyUserIds: [parent], ...over };
}

const open = { allowedRoles: [], restrictTeamId: null, openRoles: [] };

describe("sessionAudience", () => {
  it("senza restrizioni restituisce null (tutti)", () => {
    expect(sessionAudience(open, [user("a")], [])).toBeNull();
  });

  it("ruoli ammessi: solo chi ha uno di quei ruoli", () => {
    const r = { ...open, allowedRoles: [1, 2] };
    const ids = sessionAudience(
      r,
      [
        user("r1", { sportRole: 1 }),
        user("r3", { sportRole: 3 }),
        user("none", { sportRole: null }),
      ],
      []
    );
    expect(ids).toEqual(["r1"]);
  });

  it("squadra: i membri, non chi gioca in un'altra squadra", () => {
    const r = { ...open, restrictTeamId: "t1" };
    const ids = sessionAudience(
      r,
      [user("in", { inRestrictedTeam: true }), user("other", { inRestrictedTeam: false })],
      []
    );
    expect(ids).toEqual(["in"]);
  });

  it("squadra + openRoles: entra anche chi ha un ruolo sempre aperto in un'altra squadra", () => {
    const r = { ...open, restrictTeamId: "t1", openRoles: [1] };
    const ids = sessionAudience(r, [user("r1-altra", { sportRole: 1 }), user("r3-altra")], []);
    expect(ids).toEqual(["r1-altra"]);
  });

  it("squadra + ruoli: servono tutte e due le condizioni", () => {
    const r = { ...open, restrictTeamId: "t1", allowedRoles: [5] };
    const ids = sessionAudience(
      r,
      [
        user("in-5", { sportRole: 5, inRestrictedTeam: true }),
        user("in-3", { sportRole: 3, inRestrictedTeam: true }),
        user("out-5", { sportRole: 5 }),
      ],
      []
    );
    expect(ids).toEqual(["in-5"]);
  });

  it("openRoles non esenta dai ruoli ammessi", () => {
    const r = { restrictTeamId: "t1", allowedRoles: [5], openRoles: [1] };
    expect(sessionAudience(r, [user("r1", { sportRole: 1 })], [])).toEqual([]);
  });

  it("utente senza nessuna squadra e GUEST passano la restrizione di squadra", () => {
    const r = { ...open, restrictTeamId: "t1" };
    const ids = sessionAudience(
      r,
      [user("noteam", { hasAnyTeam: false }), user("guest", { appRole: "GUEST", sportRole: null })],
      []
    );
    expect(ids).toEqual(["noteam", "guest"]);
  });

  it("lo staff riceve sempre l'avviso", () => {
    const r = { ...open, restrictTeamId: "t1", allowedRoles: [1] };
    const ids = sessionAudience(r, [user("coach", { appRole: "COACH", sportRole: null })], []);
    expect(ids).toEqual(["coach"]);
  });

  it("figli: avvisa i genitori se il figlio puo' iscriversi, senza il bypass 'nessuna squadra'", () => {
    const r = { ...open, restrictTeamId: "t1" };
    const ids = sessionAudience(
      r,
      [],
      [
        child("p-in", { inRestrictedTeam: true, notifyUserIds: ["p-in", "child-account"] }),
        child("p-out", { sportRole: 3 }),
      ]
    );
    expect(ids).toEqual(["p-in", "child-account"]);
  });

  it("account con una scheda figlio: l'avviso arriva anche ai suoi genitori", () => {
    const restrictions = { allowedRoles: [], restrictTeamId: "t1", openRoles: [] };
    const ids = sessionAudience(
      restrictions,
      [
        user("kid", { inRestrictedTeam: true, hasAnyTeam: true, guardianIds: ["mamma", "papà"] }),
        // In un'altra squadra: non lo riceve lui e nemmeno i suoi genitori.
        user("altro", { inRestrictedTeam: false, hasAnyTeam: true, guardianIds: ["zio"] }),
      ],
      []
    );
    expect(ids?.sort()).toEqual(["kid", "mamma", "papà"]);
  });

  it("un genitore con due figli ammessi compare una volta sola", () => {
    const r = { ...open, allowedRoles: [1] };
    const ids = sessionAudience(r, [], [child("p"), child("p")]);
    expect(ids).toEqual(["p"]);
  });
});
