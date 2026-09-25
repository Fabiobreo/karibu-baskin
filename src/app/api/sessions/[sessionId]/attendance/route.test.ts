import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    registration: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  registration: { findMany: Mock; update: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

function makePUT(body: unknown): [NextRequest, { params: Promise<{ sessionId: string }> }] {
  return [
    new NextRequest("http://localhost/api/sessions/s1/attendance", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ sessionId: "s1" }) },
  ];
}

describe("PUT /api/sessions/[sessionId]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.registration.update.mockImplementation((args: unknown) => args);
    p.$transaction.mockResolvedValue([]);
  });

  it("rifiuta chi non e' staff", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(false);
    const res = await PUT(...makePUT({ attendance: [{ regId: "r1", attended: true }] }));
    expect(res.status).toBe(403);
    expect(p.$transaction).not.toHaveBeenCalled();
  });

  it("rifiuta un corpo non valido", async () => {
    const res = await PUT(...makePUT({ attendance: [{ regId: "r1", attended: "si" }] }));
    expect(res.status).toBe(400);
  });

  it("rifiuta un elenco vuoto", async () => {
    const res = await PUT(...makePUT({ attendance: [] }));
    expect(res.status).toBe(400);
  });

  it("rifiuta iscrizioni di un altro allenamento", async () => {
    p.registration.findMany.mockResolvedValue([{ id: "r1" }]);
    const res = await PUT(
      ...makePUT({
        attendance: [
          { regId: "r1", attended: true },
          { regId: "r-altro", attended: false },
        ],
      })
    );
    expect(res.status).toBe(400);
    expect(p.registration.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["r1", "r-altro"] }, sessionId: "s1" },
      select: { id: true },
    });
    expect(p.$transaction).not.toHaveBeenCalled();
  });

  it("salva presenti, assenti e non segnati in una transazione", async () => {
    p.registration.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }, { id: "r3" }]);
    const res = await PUT(
      ...makePUT({
        attendance: [
          { regId: "r1", attended: true },
          { regId: "r2", attended: false },
          { regId: "r3", attended: null },
        ],
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 3 });
    expect(p.$transaction).toHaveBeenCalledTimes(1);
    expect(p.registration.update).toHaveBeenCalledWith({
      where: { id: "r2" },
      data: { attended: false },
    });
    expect(p.registration.update).toHaveBeenCalledWith({
      where: { id: "r3" },
      data: { attended: null },
    });
  });
});
