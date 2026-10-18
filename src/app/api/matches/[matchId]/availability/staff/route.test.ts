import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findUnique: vi.fn() },
    child: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    teamMembership: { findFirst: vi.fn() },
    matchAvailability: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notifications/matchNotify", () => ({
  notifyStaffAvailability: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/matches/availability", async (orig) => ({
  ...(await orig<typeof import("@/lib/matches/availability")>()),
  saveAvailability: vi.fn().mockResolvedValue(undefined),
}));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { saveAvailability } from "@/lib/matches/availability";
import { notifyStaffAvailability } from "@/lib/notifications/matchNotify";

type PrismaMock = {
  match: { findUnique: Mock };
  child: { findUnique: Mock; findMany: Mock };
  teamMembership: { findFirst: Mock };
  matchAvailability: { findMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const DAY = 24 * 60 * 60 * 1000;

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/matches/m1/availability/staff", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ matchId: "m1" }) }
  );

describe("PUT /api/matches/[matchId]/availability/staff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: "coach" } });
    (isCoachOrAdmin as Mock).mockResolvedValue(true);
    p.match.findUnique.mockResolvedValue({
      date: new Date(Date.now() + 3 * DAY),
      team: { season: "2026-27" },
      opponentTeam: null,
    });
    p.teamMembership.findFirst.mockResolvedValue({ id: "tm1" });
    p.matchAvailability.findMany.mockResolvedValue([
      { userId: "u1", childId: null, available: false, setByStaff: false },
    ]);
  });

  it("403 per chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    const res = await put({ kind: "user", id: "u1", available: true });
    expect(res.status).toBe(403);
    expect(saveAvailability).not.toHaveBeenCalled();
  });

  it("400 a partita iniziata", async () => {
    p.match.findUnique.mockResolvedValue({
      date: new Date(Date.now() - DAY),
      team: { season: "2026-27" },
      opponentTeam: null,
    });
    const res = await put({ kind: "user", id: "u1", available: true });
    expect(res.status).toBe(400);
  });

  it("400 per chi non è della stagione", async () => {
    p.teamMembership.findFirst.mockResolvedValue(null);
    const res = await put({ kind: "user", id: "u1", available: true });
    expect(res.status).toBe(400);
    expect(saveAvailability).not.toHaveBeenCalled();
  });

  it("salva come risposta dello staff, registra e avvisa la famiglia", async () => {
    const res = await put({ kind: "user", id: "u1", available: true });
    expect(res.status).toBe(200);
    expect(saveAvailability).toHaveBeenCalledWith({
      matchId: "m1",
      person: { kind: "user", id: "u1" },
      available: true,
      setByStaff: true,
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SET_AVAILABILITY", actorId: "coach", targetId: "m1" })
    );
    expect(notifyStaffAvailability).toHaveBeenCalledWith("m1", { userId: "u1" }, true);
  });

  it("stessa risposta di prima: niente avviso né registro", async () => {
    p.matchAvailability.findMany.mockResolvedValue([
      { userId: "u1", childId: null, available: true, setByStaff: false },
    ]);
    const res = await put({ kind: "user", id: "u1", available: true });
    expect(res.status).toBe(200);
    expect(logAudit).not.toHaveBeenCalled();
    expect(notifyStaffAvailability).not.toHaveBeenCalled();
  });

  it("scheda figlio con account: vale anche la squadra dell'account", async () => {
    p.child.findUnique.mockResolvedValue({ userId: "u-luca" });
    await put({ kind: "child", id: "c-luca", available: true });
    expect(p.teamMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ childId: "c-luca" }, { userId: "u-luca" }],
        }),
      })
    );
  });
});
