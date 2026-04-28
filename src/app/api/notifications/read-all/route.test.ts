import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    appNotification: { findMany: vi.fn() },
    appNotificationRead: { createMany: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { PATCH } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  appNotification: { findMany: Mock };
  appNotificationRead: { createMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

describe("PATCH /api/notifications/read-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.appNotification.findMany.mockResolvedValue([]);
    p.appNotificationRead.createMany.mockResolvedValue({ count: 0 });
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH();
    expect(res.status).toBe(401);
    expect(p.appNotification.findMany).not.toHaveBeenCalled();
  });

  it("restituisce marked:0 se non ci sono notifiche non lette", async () => {
    p.appNotification.findMany.mockResolvedValue([]);
    const res = await PATCH();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.marked).toBe(0);
    expect(p.appNotificationRead.createMany).not.toHaveBeenCalled();
  });

  it("crea AppNotificationRead per tutte le notifiche non lette", async () => {
    p.appNotification.findMany.mockResolvedValue([
      { id: "notif-1" },
      { id: "notif-2" },
      { id: "notif-3" },
    ]);
    const res = await PATCH();
    const body = await res.json();
    expect(body.marked).toBe(3);
    expect(p.appNotificationRead.createMany).toHaveBeenCalledWith({
      data: [
        { notificationId: "notif-1", userId: "user-1" },
        { notificationId: "notif-2", userId: "user-1" },
        { notificationId: "notif-3", userId: "user-1" },
      ],
      skipDuplicates: true,
    });
  });

  it("cerca solo notifiche non lette broadcast o dirette all'utente", async () => {
    p.appNotification.findMany.mockResolvedValue([{ id: "notif-1" }]);
    await PATCH();
    expect(p.appNotification.findMany).toHaveBeenCalledWith({
      where: {
        reads: { none: { userId: "user-1" } },
        OR: [{ targetUserId: null }, { targetUserId: "user-1" }],
      },
      select: { id: true },
    });
  });
});
