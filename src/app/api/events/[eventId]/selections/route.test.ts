import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    child: { findFirst: vi.fn() },
    eventOptionSelection: { deleteMany: vi.fn(), createMany: vi.fn() },
    eventAttendance: { upsert: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  event: { findUnique: Mock };
  child: { findFirst: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as unknown as Mock;
const params = { params: Promise.resolve({ eventId: "evt-1" }) };

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);
const makePut = (body: unknown) =>
  new Request("http://localhost/api/events/evt-1/selections", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PUT /api/events/[eventId]/selections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    p.event.findUnique.mockResolvedValue({
      id: "evt-1",
      date: future,
      endDate: null,
      options: [{ id: "o1" }, { id: "o2" }],
    });
  });

  it("401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makePut({ optionIds: ["o1"] }), params);
    expect(res.status).toBe(401);
  });

  it("404 se evento mancante", async () => {
    p.event.findUnique.mockResolvedValue(null);
    const res = await PUT(makePut({ optionIds: [] }), params);
    expect(res.status).toBe(404);
  });

  it("400 se evento concluso", async () => {
    p.event.findUnique.mockResolvedValue({ id: "evt-1", date: past, endDate: null, options: [] });
    const res = await PUT(makePut({ optionIds: [] }), params);
    expect(res.status).toBe(400);
  });

  it("400 con opzione non appartenente all'evento", async () => {
    const res = await PUT(makePut({ optionIds: ["o-altro"] }), params);
    expect(res.status).toBe(400);
  });

  it("403 se il figlio non è dell'utente", async () => {
    p.child.findFirst.mockResolvedValue(null);
    const res = await PUT(makePut({ optionIds: ["o1"], childId: "c-x" }), params);
    expect(res.status).toBe(403);
  });

  it("salva le selezioni valide", async () => {
    const res = await PUT(makePut({ optionIds: ["o1", "o2"], note: "vegano" }), params);
    expect(res.status).toBe(200);
    expect(p.$transaction).toHaveBeenCalled();
  });
});
