import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    teamMembership: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { createAppNotification } from "@/lib/appNotifications";

type PrismaMock = { teamMembership: { create: Mock } };
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;
const mockAuth = auth as Mock;
const mockNotify = createAppNotification as Mock;

const authedSession = { user: { id: "admin-1" } };

function makeReq(body: unknown) {
  return new Request("http://localhost/api/competitive-teams/t-1/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ teamId: "t-1" });

const baseMembership = {
  id: "m-1",
  teamId: "t-1",
  userId: "u-1",
  childId: null,
  isCaptain: false,
  user: { id: "u-1", name: "Mario", image: null, sportRole: 2, sportRoleVariant: null },
  child: null,
  team: { name: "Karibu A" },
};

describe("POST /api/competitive-teams/[teamId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(true);
    mockAuth.mockResolvedValue(authedSession);
    p.teamMembership.create.mockResolvedValue(baseMembership);
  });

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(makeReq({ userId: "u-1" }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/competitive-teams/t-1/members", {
      method: "POST",
      body: "NOT_JSON",
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when neither userId nor childId provided", async () => {
    const res = await POST(makeReq({}), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when both userId and childId are provided", async () => {
    const res = await POST(makeReq({ userId: "u-1", childId: "c-1" }), { params });
    expect(res.status).toBe(400);
  });

  it("creates membership with userId and returns 201", async () => {
    const res = await POST(makeReq({ userId: "u-1" }), { params });
    expect(res.status).toBe(201);
    expect(p.teamMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: "t-1", userId: "u-1", childId: null, isCaptain: false }),
      })
    );
  });

  it("creates membership with childId and returns 201", async () => {
    const childMembership = { ...baseMembership, userId: null, childId: "c-1", user: null };
    p.teamMembership.create.mockResolvedValue(childMembership);
    const res = await POST(makeReq({ childId: "c-1" }), { params });
    expect(res.status).toBe(201);
    expect(p.teamMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ childId: "c-1", userId: null }),
      })
    );
  });

  it("sends app notification to the added user", async () => {
    await POST(makeReq({ userId: "u-1" }), { params });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ targetUserId: "u-1" })
    );
  });

  it("does not send notification when childId (no user account)", async () => {
    const childMembership = { ...baseMembership, userId: null, childId: "c-1", user: null };
    p.teamMembership.create.mockResolvedValue(childMembership);
    await POST(makeReq({ childId: "c-1" }), { params });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("sets isCaptain when provided", async () => {
    await POST(makeReq({ userId: "u-1", isCaptain: true }), { params });
    expect(p.teamMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isCaptain: true }),
      })
    );
  });
});
