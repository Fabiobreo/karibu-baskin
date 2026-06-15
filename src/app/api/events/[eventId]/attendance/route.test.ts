import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    child: { findFirst: vi.fn() },
    eventAttendance: { upsert: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn().mockResolvedValue(false) }));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  event: { findUnique: Mock };
  child: { findFirst: Mock };
  eventAttendance: { upsert: Mock; findMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as unknown as Mock;

const params = { params: Promise.resolve({ eventId: "evt-1" }) };
const future = new Date(Date.now() + 86_400_000);
const pastDate = new Date(Date.now() - 86_400_000);

function makePut(body: unknown) {
  return new Request("http://localhost/api/events/evt-1/attendance", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/events/[eventId]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    p.event.findUnique.mockResolvedValue({ id: "evt-1", date: future, endDate: null });
    p.eventAttendance.upsert.mockResolvedValue({ id: "att-1", status: "GOING" });
  });

  it("401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makePut({ status: "GOING" }), params);
    expect(res.status).toBe(401);
  });

  it("400 con stato non valido", async () => {
    const res = await PUT(makePut({ status: "PERHAPS" }), params);
    expect(res.status).toBe(400);
  });

  it("404 se l'evento non esiste", async () => {
    p.event.findUnique.mockResolvedValue(null);
    const res = await PUT(makePut({ status: "GOING" }), params);
    expect(res.status).toBe(404);
  });

  it("400 se l'evento è già concluso", async () => {
    p.event.findUnique.mockResolvedValue({ id: "evt-1", date: pastDate, endDate: null });
    const res = await PUT(makePut({ status: "GOING" }), params);
    expect(res.status).toBe(400);
  });

  it("upsert della propria presenza", async () => {
    const res = await PUT(makePut({ status: "GOING" }), params);
    expect(res.status).toBe(200);
    expect(p.eventAttendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId_userId: { eventId: "evt-1", userId: "u1" } } })
    );
  });

  it("403 se il figlio non appartiene all'utente", async () => {
    p.child.findFirst.mockResolvedValue(null);
    const res = await PUT(makePut({ status: "MAYBE", childId: "c-altrui" }), params);
    expect(res.status).toBe(403);
  });

  it("upsert per un figlio valido", async () => {
    p.child.findFirst.mockResolvedValue({ id: "c1" });
    const res = await PUT(makePut({ status: "MAYBE", childId: "c1" }), params);
    expect(res.status).toBe(200);
    expect(p.eventAttendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId_childId: { eventId: "evt-1", childId: "c1" } } })
    );
  });
});
