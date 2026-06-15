import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    eventOption: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  event: { findUnique: Mock };
  eventOption: { findMany: Mock; deleteMany: Mock; update: Mock; create: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockStaff = isCoachOrAdmin as unknown as Mock;
const params = { params: Promise.resolve({ eventId: "evt-1" }) };

const makePut = (body: unknown) =>
  new Request("http://localhost/api/events/evt-1/options", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PUT /api/events/[eventId]/options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaff.mockResolvedValue(true);
    p.event.findUnique.mockResolvedValue({ id: "evt-1" });
    p.eventOption.findMany.mockResolvedValue([
      { id: "o1", label: "Sabato", kind: "SESSIONE", order: 0, startsAt: null },
    ]);
  });

  it("403 per utente non staff", async () => {
    mockStaff.mockResolvedValue(false);
    const res = await PUT(makePut({ options: [] }), params);
    expect(res.status).toBe(403);
  });

  it("400 con opzione senza etichetta", async () => {
    const res = await PUT(makePut({ options: [{ label: "" }] }), params);
    expect(res.status).toBe(400);
  });

  it("404 se l'evento non esiste", async () => {
    p.event.findUnique.mockResolvedValue(null);
    const res = await PUT(makePut({ options: [] }), params);
    expect(res.status).toBe(404);
  });

  it("riconcilia e restituisce le opzioni", async () => {
    const res = await PUT(makePut({ options: [{ label: "Sabato", kind: "SESSIONE" }] }), params);
    expect(res.status).toBe(200);
    expect(p.$transaction).toHaveBeenCalled();
    const json = await res.json();
    expect(json[0].label).toBe("Sabato");
  });
});
