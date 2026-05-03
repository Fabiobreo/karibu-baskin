import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    season: {
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  $transaction: Mock;
  season: { updateMany: Mock; upsert: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/competitive-teams/seasons/current", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/competitive-teams/seasons/current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.$transaction.mockResolvedValue([{ count: 1 }, {}]);
  });

  it("rifiuta utenti non autorizzati (401)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(false);
    const res = await PUT(makeRequest({ label: "2025-26" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Non autorizzato");
  });

  it("rifiuta richiesta senza label (400)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await PUT(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("rifiuta label vuota (400)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await PUT(makeRequest({ label: "  " }));
    expect(res.status).toBe(400);
  });

  it("aggiorna la stagione corrente con successo (200)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await PUT(makeRequest({ label: "2025-26" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("esegue la transazione per impostare la stagione corrente", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await PUT(makeRequest({ label: "2025-26" }));
    expect(p.$transaction).toHaveBeenCalledTimes(1);
    const ops = p.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(2);
  });

  it("deindicizza tutte le stagioni prima di impostare quella corrente", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    p.season.updateMany.mockReturnValue({ count: 3 });
    p.season.upsert.mockReturnValue({ id: "s-1", label: "2025-26", isCurrent: true });

    await PUT(makeRequest({ label: "2025-26" }));

    expect(p.season.updateMany).toHaveBeenCalledWith({ data: { isCurrent: false } });
    expect(p.season.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { label: "2025-26" },
        create: { label: "2025-26", isCurrent: true },
        update: { isCurrent: true },
      })
    );
  });
});
