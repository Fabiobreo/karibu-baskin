import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    appNotification: { count: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  appNotification: { count: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.appNotification.count.mockResolvedValue(3);
  });

  it("restituisce count:0 senza query DB se non autenticato (no 401)", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.count).toBe(0);
    expect(p.appNotification.count).not.toHaveBeenCalled();
  });

  it("restituisce il conteggio delle notifiche non lette", async () => {
    p.appNotification.count.mockResolvedValue(5);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.count).toBe(5);
  });

  it("restituisce count:0 se non ci sono notifiche non lette", async () => {
    p.appNotification.count.mockResolvedValue(0);
    const res = await GET();
    const body = await res.json();
    expect(body.count).toBe(0);
  });

  it("conta solo notifiche non lette dall'utente corrente o broadcast", async () => {
    await GET();
    expect(p.appNotification.count).toHaveBeenCalledWith({
      where: {
        reads: { none: { userId: "user-1" } },
        OR: [{ targetUserId: null }, { targetUserId: "user-1" }],
      },
    });
  });
});
