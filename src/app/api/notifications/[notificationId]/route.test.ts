import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    appNotification: { findUnique: vi.fn() },
    appNotificationRead: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { PATCH } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  appNotification: { findUnique: Mock };
  appNotificationRead: { upsert: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

function makePATCH(notificationId: string): [NextRequest, { params: Promise<{ notificationId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/notifications/${notificationId}`, { method: "PATCH" }),
    { params: Promise.resolve({ notificationId }) },
  ];
}

describe("PATCH /api/notifications/[notificationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.appNotification.findUnique.mockResolvedValue({ targetUserId: null });
    p.appNotificationRead.upsert.mockResolvedValue({});
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const [req, ctx] = makePATCH("notif-1");
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
    expect(p.appNotification.findUnique).not.toHaveBeenCalled();
  });

  it("restituisce 404 se la notifica non esiste", async () => {
    p.appNotification.findUnique.mockResolvedValue(null);
    const [req, ctx] = makePATCH("notif-x");
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
    expect(p.appNotificationRead.upsert).not.toHaveBeenCalled();
  });

  it("restituisce 403 se la notifica è diretta ad un altro utente", async () => {
    p.appNotification.findUnique.mockResolvedValue({ targetUserId: "other-user" });
    const [req, ctx] = makePATCH("notif-1");
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(403);
    expect(p.appNotificationRead.upsert).not.toHaveBeenCalled();
  });

  it("segna come letta una notifica broadcast (targetUserId: null)", async () => {
    p.appNotification.findUnique.mockResolvedValue({ targetUserId: null });
    const [req, ctx] = makePATCH("notif-1");
    const res = await PATCH(req, ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(p.appNotificationRead.upsert).toHaveBeenCalledWith({
      where: { notificationId_userId: { notificationId: "notif-1", userId: "user-1" } },
      create: { notificationId: "notif-1", userId: "user-1" },
      update: {},
    });
  });

  it("segna come letta una notifica diretta all'utente corrente", async () => {
    p.appNotification.findUnique.mockResolvedValue({ targetUserId: "user-1" });
    const [req, ctx] = makePATCH("notif-1");
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(p.appNotificationRead.upsert).toHaveBeenCalled();
  });

  it("usa upsert (idempotente) per evitare duplicati di lettura", async () => {
    const [req, ctx] = makePATCH("notif-1");
    await PATCH(req, ctx);
    const call = p.appNotificationRead.upsert.mock.calls[0][0];
    expect(call).toHaveProperty("update", {});
    expect(call).toHaveProperty("where");
    expect(call).toHaveProperty("create");
  });
});
