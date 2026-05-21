import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: {
      update: vi.fn(),
      findUnique: vi.fn(),
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

vi.mock("@/lib/sessionNotify", () => ({
  notifySessionOpen: vi.fn(),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { notifySessionOpen } from "@/lib/sessionNotify";
import { Prisma } from "@prisma/client";

type PrismaMock = { trainingSession: { update: Mock; findUnique: Mock } };
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

const sessionPayload = {
  id: "sess-1",
  title: "Allenamento",
  date: new Date("2025-06-05T18:00:00Z"),
  endTime: null,
  dateSlug: "20250605",
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
  registrationOpen: true,
  _count: { registrations: 0 },
  restrictTeam: null,
};

function makeReq() {
  return new NextRequest("http://localhost/api/sessions/sess-1/open-registrations", {
    method: "POST",
  });
}
const params = Promise.resolve({ sessionId: "sess-1" });

describe("POST /api/sessions/[sessionId]/open-registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
  });

  it("restituisce 401 se l'utente non è coach/admin", async () => {
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(401);
    expect(p.trainingSession.update).not.toHaveBeenCalled();
  });

  it("apre le iscrizioni e invia notifica", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.trainingSession.findUnique.mockResolvedValueOnce({ registrationOpenedAt: null });
    p.trainingSession.update.mockResolvedValueOnce(sessionPayload);
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(200);
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.registrationOpen).toBe(true);
    expect(data.registrationOpenedAt).toBeInstanceOf(Date);
    expect(data.openReminderSentAt).toBeNull();
    expect(notifySessionOpen).toHaveBeenCalledOnce();
  });

  it("preserva registrationOpenedAt se l'allenamento era già stato aperto", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const firstOpenedAt = new Date("2025-01-01T00:00:00Z");
    p.trainingSession.findUnique.mockResolvedValueOnce({ registrationOpenedAt: firstOpenedAt });
    p.trainingSession.update.mockResolvedValueOnce(sessionPayload);
    await POST(makeReq(), { params });
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.registrationOpenedAt).toBe(firstOpenedAt);
  });

  it("restituisce 404 se l'allenamento non esiste", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.trainingSession.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "5.0.0",
      })
    );
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(404);
    expect(notifySessionOpen).not.toHaveBeenCalled();
  });
});
