import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => {
  const prisma = {
    teamMembership: {
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    pastTeamMembership: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return { prisma };
});

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { createAppNotification } from "@/lib/notifications/appNotifications";

type PrismaMock = {
  teamMembership: { update: Mock; findUnique: Mock; delete: Mock };
  pastTeamMembership: { create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;
const mockAuth = auth as Mock;
const mockNotify = createAppNotification as Mock;

const authedSession = { user: { id: "admin-1" } };
const membershipParams = Promise.resolve({ teamId: "t-1", membershipId: "m-1" });

function makeReq(body: unknown) {
  return new Request("http://localhost/api/competitive-teams/t-1/members/m-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/competitive-teams/[teamId]/members/[membershipId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(true);
    mockAuth.mockResolvedValue(authedSession);
    p.teamMembership.update.mockResolvedValue({ id: "m-1", isCaptain: true });
  });

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await PATCH(makeReq({ isCaptain: true }), { params: membershipParams });
    expect(res.status).toBe(403);
  });

  it("sets isCaptain to true", async () => {
    const res = await PATCH(makeReq({ isCaptain: true }), { params: membershipParams });
    expect(res.status).toBe(200);
    expect(p.teamMembership.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: { isCaptain: true },
    });
  });

  it("sets isCaptain to false when not provided (defaults false)", async () => {
    p.teamMembership.update.mockResolvedValue({ id: "m-1", isCaptain: false });
    const res = await PATCH(makeReq({}), { params: membershipParams });
    expect(res.status).toBe(200);
    expect(p.teamMembership.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: { isCaptain: false },
    });
  });
});

describe("DELETE /api/competitive-teams/[teamId]/members/[membershipId]", () => {
  const existingMembership = {
    teamId: "t-1",
    userId: "u-1",
    childId: null,
    createdAt: new Date("2026-09-27T20:05:00Z"),
    team: { name: "Karibu A" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(true);
    mockAuth.mockResolvedValue(authedSession);
    p.teamMembership.findUnique.mockResolvedValue(existingMembership);
    p.teamMembership.delete.mockResolvedValue({});
  });

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const req = new Request("http://localhost/api/competitive-teams/t-1/members/m-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: membershipParams });
    expect(res.status).toBe(403);
  });

  it("deletes the membership and returns 204", async () => {
    const req = new Request("http://localhost/api/competitive-teams/t-1/members/m-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: membershipParams });
    expect(res.status).toBe(204);
    expect(p.teamMembership.delete).toHaveBeenCalledWith({ where: { id: "m-1" } });
  });

  it("tiene nello storico il periodo nella squadra lasciata", async () => {
    const req = new Request("http://localhost/api/competitive-teams/t-1/members/m-1", {
      method: "DELETE",
    });
    await DELETE(req, { params: membershipParams });
    expect(p.pastTeamMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        teamId: "t-1",
        userId: "u-1",
        childId: null,
        startedAt: new Date("2026-09-27T20:05:00Z"),
        endedAt: expect.any(Date),
      }),
    });
  });

  it("404 se la riga non c'è più", async () => {
    p.teamMembership.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost/api/competitive-teams/t-1/members/m-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: membershipParams });
    expect(res.status).toBe(404);
    expect(p.teamMembership.delete).not.toHaveBeenCalled();
  });

  it("sends removal notification to the removed user", async () => {
    const req = new Request("http://localhost/api/competitive-teams/t-1/members/m-1", {
      method: "DELETE",
    });
    await DELETE(req, { params: membershipParams });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserId: "u-1",
        title: "Rimosso da una squadra",
      })
    );
  });

  it("does not send notification when childId member", async () => {
    p.teamMembership.findUnique.mockResolvedValue({
      ...existingMembership,
      userId: null,
      childId: "c-1",
    });
    const req = new Request("http://localhost/api/competitive-teams/t-1/members/m-1", {
      method: "DELETE",
    });
    await DELETE(req, { params: membershipParams });
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
