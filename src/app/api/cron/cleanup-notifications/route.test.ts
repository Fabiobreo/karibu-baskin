import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    appNotification: { deleteMany: vi.fn() },
    linkRequest: { deleteMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

type PrismaMock = {
  appNotification: { deleteMany: Mock };
  linkRequest: { deleteMany: Mock };
};
const p = prisma as unknown as PrismaMock;

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new Request("http://localhost/api/cron/cleanup-notifications", { headers });
}

describe("GET /api/cron/cleanup-notifications", () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    p.appNotification.deleteMany.mockResolvedValue({ count: 0 });
    p.linkRequest.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  it("rifiuta senza header Authorization (401)", async () => {
    const res = await GET(makeRequest() as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Non autorizzato");
  });

  it("rifiuta con token errato (401)", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret") as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it("esegue la pulizia con token corretto", async () => {
    p.appNotification.deleteMany.mockResolvedValue({ count: 5 });
    p.linkRequest.deleteMany.mockResolvedValue({ count: 2 });

    const res = await GET(makeRequest("Bearer test-cron-secret") as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deletedNotifications).toBe(5);
    expect(json.deletedExpiredLinks).toBe(2);
  });

  it("elimina solo notifiche con almeno una lettura", async () => {
    await GET(makeRequest("Bearer test-cron-secret") as Parameters<typeof GET>[0]);
    expect(p.appNotification.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reads: { some: {} },
        }),
      })
    );
  });

  it("elimina solo link-request PENDING scadute", async () => {
    await GET(makeRequest("Bearer test-cron-secret") as Parameters<typeof GET>[0]);
    expect(p.linkRequest.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
        }),
      })
    );
  });

  it("usa una cutoff di 90 giorni fa", async () => {
    const before = Date.now();
    await GET(makeRequest("Bearer test-cron-secret") as Parameters<typeof GET>[0]);
    const after = Date.now();

    const call = p.appNotification.deleteMany.mock.calls[0][0];
    const cutoff: Date = call.where.createdAt.lt;
    const msIn90Days = 90 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - msIn90Days - 100);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - msIn90Days + 100);
  });

  it("restituisce 0 se non c'è nulla da eliminare", async () => {
    const res = await GET(makeRequest("Bearer test-cron-secret") as Parameters<typeof GET>[0]);
    const json = await res.json();
    expect(json.deletedNotifications).toBe(0);
    expect(json.deletedExpiredLinks).toBe(0);
  });
});
