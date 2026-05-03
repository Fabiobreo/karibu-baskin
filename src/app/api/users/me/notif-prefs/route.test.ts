import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn(),
}));

import { GET, PATCH } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { DEFAULT_PREFS } from "@/lib/notifPrefs";
import { NextRequest } from "next/server";

type PrismaMock = { user: { findUnique: Mock; update: Mock } };
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const authedSession = { user: { id: "u-1" } };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/users/me/notif-prefs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/users/me/notif-prefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authedSession);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns default prefs when user has no stored prefs", async () => {
    p.user.findUnique.mockResolvedValue({ notifPrefs: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(DEFAULT_PREFS);
  });

  it("merges stored prefs with defaults", async () => {
    p.user.findUnique.mockResolvedValue({
      notifPrefs: { push: { NEW_TRAINING: false }, inApp: {} },
    });
    const res = await GET();
    const data = await res.json();
    expect(data.push.NEW_TRAINING).toBe(false);
    expect(data.push.TEAMS_READY).toBe(true);
    expect(data.inApp.NEW_TRAINING).toBe(true);
  });

  it("queries DB with current user id", async () => {
    p.user.findUnique.mockResolvedValue({ notifPrefs: null });
    await GET();
    expect(p.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u-1" },
      select: { notifPrefs: true },
    });
  });
});

describe("PATCH /api/users/me/notif-prefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authedSession);
    p.user.findUnique.mockResolvedValue({ notifPrefs: null });
    p.user.update.mockResolvedValue({});
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/users/me/notif-prefs", {
      method: "PATCH",
      body: "NOT_JSON",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("updates push.NEW_TRAINING to false", async () => {
    const res = await PATCH(makeReq({ push: { NEW_TRAINING: false } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.push.NEW_TRAINING).toBe(false);
    expect(data.push.TEAMS_READY).toBe(true);
  });

  it("updates inApp.MATCH_RESULT to false", async () => {
    const res = await PATCH(makeReq({ inApp: { MATCH_RESULT: false } }));
    const data = await res.json();
    expect(data.inApp.MATCH_RESULT).toBe(false);
    expect(data.inApp.NEW_TRAINING).toBe(true);
  });

  it("ignores unknown keys in push and inApp", async () => {
    const res = await PATCH(makeReq({ push: { UNKNOWN_KEY: false, NEW_TRAINING: false } }));
    const data = await res.json();
    expect(data.push.NEW_TRAINING).toBe(false);
    expect((data.push as Record<string, unknown>).UNKNOWN_KEY).toBeUndefined();
  });

  it("coerces truthy/falsy values to boolean", async () => {
    const res = await PATCH(makeReq({ push: { NEW_TRAINING: 0, TEAMS_READY: 1 } }));
    const data = await res.json();
    expect(data.push.NEW_TRAINING).toBe(false);
    expect(data.push.TEAMS_READY).toBe(true);
  });

  it("persists updated prefs via prisma.user.update", async () => {
    await PATCH(makeReq({ push: { NEW_TRAINING: false } }));
    expect(p.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { notifPrefs: expect.objectContaining({ push: expect.objectContaining({ NEW_TRAINING: false }) }) },
    });
  });

  it("merges patch over current stored prefs", async () => {
    p.user.findUnique.mockResolvedValue({
      notifPrefs: { push: { NEW_TRAINING: false, TEAMS_READY: false, MATCH_RESULT: false }, inApp: {} },
    });
    const res = await PATCH(makeReq({ push: { NEW_TRAINING: true } }));
    const data = await res.json();
    expect(data.push.NEW_TRAINING).toBe(true);
    expect(data.push.TEAMS_READY).toBe(false);
  });
});
