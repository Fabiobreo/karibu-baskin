import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/sessionNotify", () => ({
  notifySessionOpen: vi.fn(),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { notifySessionOpen } from "@/lib/notifications/sessionNotify";
import { Prisma } from "@prisma/client";

type PrismaMock = { trainingSession: { update: Mock } };
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

const FUTURE = new Date(Date.now() + 6 * 60 * 60 * 1000);
const FUTURE_END = new Date(Date.now() + 8 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);
const PAST_END = new Date(Date.now() - 22 * 60 * 60 * 1000);

function basePayload(date: Date, endTime: Date) {
  return {
    id: "sess-1",
    title: "Allenamento",
    date,
    endTime,
    dateSlug: "20250605",
    allowedRoles: [],
    restrictTeamId: null,
    openRoles: [],
    registrationOpen: false,
    _count: { registrations: 0 },
    restrictTeam: null,
  };
}

function makeReq() {
  return new NextRequest("http://localhost/api/sessions/sess-1/close-registrations", {
    method: "POST",
  });
}
const params = Promise.resolve({ sessionId: "sess-1" });

describe("POST /api/sessions/[sessionId]/close-registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
  });

  it("restituisce 401 se non staff", async () => {
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(401);
    expect(p.trainingSession.update).not.toHaveBeenCalled();
  });

  it("chiude e notifica se l'allenamento è ancora futuro", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.trainingSession.update.mockResolvedValueOnce(basePayload(FUTURE, FUTURE_END));
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(200);
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.registrationOpen).toBe(false);
    expect(notifySessionOpen).toHaveBeenCalledOnce();
    expect(notifySessionOpen).toHaveBeenCalledWith(expect.anything(), "closed");
  });

  it("chiude senza notifica se l'allenamento è già passato", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.trainingSession.update.mockResolvedValueOnce(basePayload(PAST, PAST_END));
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(200);
    expect(notifySessionOpen).not.toHaveBeenCalled();
  });

  it("restituisce 404 se non trovato", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.trainingSession.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "5.0.0",
      })
    );
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(404);
  });
});
