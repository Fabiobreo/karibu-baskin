import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: { findUnique: vi.fn() },
    trainingDrill: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    drill: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/board/drillAdmin", () => ({ auditDrill: vi.fn() }));
vi.mock("@/lib/board/trainingDrills", () => ({
  loadTrainingDrills: vi.fn().mockResolvedValue([]),
}));

import { GET, PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { auditDrill } from "@/lib/board/drillAdmin";
import { loadTrainingDrills } from "@/lib/board/trainingDrills";

const p = prisma as unknown as {
  trainingSession: { findUnique: Mock };
  trainingDrill: { findMany: Mock; deleteMany: Mock; createMany: Mock };
  drill: { findMany: Mock };
  $transaction: Mock;
};
const ctx = { params: Promise.resolve({ sessionId: "s1" }) };
const url = "http://localhost/api/sessions/s1/drills";
const put = (body: unknown) =>
  PUT(
    new NextRequest(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx
  );
const as = (appRole: string) => (auth as Mock).mockResolvedValue({ user: { id: "u1", appRole } });

describe("GET /api/sessions/[sessionId]/drills", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ospite: 403; atleta: senza bozze; staff: con le bozze", async () => {
    as("GUEST");
    expect((await GET(new NextRequest(url), ctx)).status).toBe(403);
    as("ATHLETE");
    await GET(new NextRequest(url), ctx);
    expect(loadTrainingDrills).toHaveBeenLastCalledWith("s1", false);
    as("COACH");
    await GET(new NextRequest(url), ctx);
    expect(loadTrainingDrills).toHaveBeenLastCalledWith("s1", true);
  });
});

describe("PUT /api/sessions/[sessionId]/drills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    as("COACH");
    p.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    p.trainingDrill.findMany.mockResolvedValue([]);
    p.drill.findMany.mockResolvedValue([
      { id: "d1", title: "Pick", status: "PUBLISHED", archivedAt: null },
      { id: "d2", title: "Bozza", status: "DRAFT", archivedAt: null },
    ]);
  });

  it("atleta e dirigente non scrivono", async () => {
    as("ATHLETE");
    expect((await put([])).status).toBe(403);
    as("DIRECTOR");
    expect((await put([])).status).toBe(403);
  });

  it("salva in ordine con note e scambi, e lo registra", async () => {
    const res = await put([
      { drillId: "d1", note: "10 minuti", assignments: { teamA: { p1: "r1" } } },
    ]);
    expect(res.status).toBe(200);
    expect(p.trainingDrill.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: "s1",
          drillId: "d1",
          position: 0,
          note: "10 minuti",
          assignments: { teamA: { p1: "r1" } },
        },
      ],
    });
    expect(auditDrill).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SET_TRAINING_DRILLS", targetType: "TrainingSession" })
    );
  });

  it("una bozza non entra, ma se c'era gia' resta", async () => {
    expect((await put([{ drillId: "d2" }])).status).toBe(409);
    p.trainingDrill.findMany.mockResolvedValue([{ drillId: "d2" }]);
    expect((await put([{ drillId: "d2" }])).status).toBe(200);
  });

  it("allenamento o schema che non esistono", async () => {
    expect((await put([{ drillId: "zz" }])).status).toBe(400);
    p.trainingSession.findUnique.mockResolvedValue(null);
    expect((await put([])).status).toBe(404);
  });
});
