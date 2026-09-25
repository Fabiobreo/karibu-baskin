import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/matches/myAvailabilities", () => ({ countPendingAvailabilities: vi.fn() }));

import { pickNextAction, type OpenSession, type Subject, showsNextAction } from "./nextAction";

const base = {
  href: "/allenamento/x",
  title: "Allenamento",
  date: new Date("2026-10-01T16:00:00Z"),
  endTime: null,
  location: null,
};
const open = (over: Partial<OpenSession> = {}): OpenSession => ({
  ...base,
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
  registeredIds: [],
  ...over,
});
const me: Subject = { kind: "self", id: "u1", name: "Marco", sportRole: 3, teamIds: [] };
const giulia: Subject = { kind: "child", id: "c1", name: "Giulia", sportRole: 2, teamIds: [] };

describe("pickNextAction", () => {
  it("le disponibilita' da dare vengono prima di tutto", () => {
    const a = pickNextAction({
      appRole: "ATHLETE",
      pendingAvailabilities: 2,
      subjects: [me],
      openSessions: [open()],
      registered: null,
    });
    expect(a).toEqual({ kind: "availability", count: 2 });
  });

  it("propone l'iscrizione a un allenamento aperto", () => {
    const a = pickNextAction({
      appRole: "ATHLETE",
      pendingAvailabilities: 0,
      subjects: [me],
      openSessions: [open()],
      registered: null,
    });
    expect(a).toMatchObject({
      kind: "register",
      childName: null,
      session: { title: "Allenamento" },
    });
  });

  it("per un genitore dice per chi e' l'iscrizione", () => {
    const a = pickNextAction({
      appRole: "PARENT",
      pendingAvailabilities: 0,
      subjects: [giulia],
      openSessions: [open()],
      registered: null,
    });
    expect(a).toMatchObject({ kind: "register", childName: "Giulia" });
  });

  it("salta chi e' gia' iscritto e chi non e' ammesso", () => {
    const a = pickNextAction({
      appRole: "ATHLETE",
      pendingAvailabilities: 0,
      subjects: [me, giulia],
      openSessions: [open({ registeredIds: ["u1"], allowedRoles: [3] })],
      registered: null,
    });
    // Giulia (ruolo 2) non e' ammessa a un allenamento solo per il ruolo 3.
    expect(a).toEqual({ kind: "allSet" });
  });

  it("rispetta la restrizione di squadra", () => {
    const a = pickNextAction({
      appRole: "ATHLETE",
      pendingAvailabilities: 0,
      subjects: [me],
      openSessions: [open({ restrictTeamId: "t1" })],
      registered: null,
    });
    expect(a.kind).toBe("allSet");
  });

  it("senza nulla da fare mostra il prossimo allenamento a cui si e' iscritti", () => {
    const a = pickNextAction({
      appRole: "ATHLETE",
      pendingAvailabilities: 0,
      subjects: [me],
      openSessions: [],
      registered: { session: base, names: [], self: true },
    });
    expect(a).toMatchObject({ kind: "registered", self: true });
  });

  it("altrimenti: sei a posto", () => {
    expect(
      pickNextAction({
        appRole: "ATHLETE",
        pendingAvailabilities: 0,
        subjects: [me],
        openSessions: [],
        registered: null,
      })
    ).toEqual({ kind: "allSet" });
  });
});

describe("showsNextAction", () => {
  it("atleti e genitori la vedono sempre", () => {
    expect(showsNextAction("ATHLETE", null)).toBe(true);
    expect(showsNextAction("PARENT", null)).toBe(true);
  });
  it("lo staff solo se gioca", () => {
    expect(showsNextAction("COACH", 3)).toBe(true);
    expect(showsNextAction("ADMIN", 5)).toBe(true);
    expect(showsNextAction("COACH", null)).toBe(false);
  });
  it("mai ai GUEST e agli anonimi", () => {
    expect(showsNextAction("GUEST", 3)).toBe(false);
    expect(showsNextAction(null, null)).toBe(false);
  });
});
