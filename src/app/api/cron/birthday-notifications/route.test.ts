import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));
vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToUsers: vi.fn().mockResolvedValue({ sent: 0, removed: 0 }),
}));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createTargetedAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";

const findMany = (prisma as unknown as { user: { findMany: Mock } }).user.findMany;

function cronRequest() {
  return new Request("http://localhost/api/cron/birthday-notifications", {
    headers: { authorization: "Bearer test-cron-secret", "x-vercel-cron": "1" },
  }) as Parameters<typeof GET>[0];
}

describe("GET /api/cron/birthday-notifications", () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  it("rifiuta senza il secret del cron", async () => {
    const res = await GET(new Request("http://localhost") as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it("manda gli auguri solo ai tesserati, mai a tutti i dispositivi", async () => {
    const today = new Date();
    findMany
      // festeggiati
      .mockResolvedValueOnce([{ id: "u1", name: "Giulia Rossi", birthDate: today }])
      // tesserati destinatari
      .mockResolvedValueOnce([{ id: "m1" }, { id: "m2" }]);

    const res = await GET(cronRequest());
    expect(res.status).toBe(200);

    const recipientsQuery = findMany.mock.calls[1][0];
    expect(recipientsQuery.where.appRole.in).not.toContain("GUEST");
    expect(sendPushToUsers).toHaveBeenCalledWith(["m1", "m2"], expect.any(Object));
    expect(createTargetedAppNotifications).toHaveBeenCalledWith(
      ["m1", "m2"],
      expect.objectContaining({ type: "BIRTHDAY" })
    );
  });

  it("senza festeggiati non notifica nessuno", async () => {
    findMany.mockResolvedValueOnce([]);
    const res = await GET(cronRequest());
    expect(await res.json()).toEqual({ sent: 0 });
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });
});
