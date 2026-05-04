import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    registration: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
}));

import { PATCH } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  registration: { findUnique: Mock; update: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

function makePATCH(regId: string, body: object): [NextRequest, { params: Promise<{ regId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/registrations/${regId}/attendance`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ regId }) },
  ];
}

describe("PATCH /api/registrations/[regId]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(true);
  });

  it("restituisce 403 se non staff", async () => {
    mockIsCoach.mockResolvedValue(false);
    const [req, ctx] = makePATCH("r1", { attended: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(403);
  });

  it("restituisce 400 se il body non è valido", async () => {
    p.registration.findUnique.mockResolvedValue({ id: "r1" });
    const [req, ctx] = makePATCH("r1", { attended: "yes" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it("restituisce 404 se l'iscrizione non esiste", async () => {
    p.registration.findUnique.mockResolvedValue(null);
    const [req, ctx] = makePATCH("r-missing", { attended: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it("imposta attended = true", async () => {
    p.registration.findUnique.mockResolvedValue({ id: "r1" });
    p.registration.update.mockResolvedValue({ id: "r1", attended: true });
    const [req, ctx] = makePATCH("r1", { attended: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attended).toBe(true);
    expect(p.registration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attended: true } })
    );
  });

  it("imposta attended = false (assente)", async () => {
    p.registration.findUnique.mockResolvedValue({ id: "r1" });
    p.registration.update.mockResolvedValue({ id: "r1", attended: false });
    const [req, ctx] = makePATCH("r1", { attended: false });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attended).toBe(false);
  });

  it("imposta attended = null (resetta)", async () => {
    p.registration.findUnique.mockResolvedValue({ id: "r1" });
    p.registration.update.mockResolvedValue({ id: "r1", attended: null });
    const [req, ctx] = makePATCH("r1", { attended: null });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.attended).toBeNull();
  });
});
