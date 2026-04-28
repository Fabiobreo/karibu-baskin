import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    appNotification: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/notifPrefs", () => ({
  mergePrefs: vi.fn().mockReturnValue({
    push: { NEW_TRAINING: true, TEAMS_READY: true, MATCH_RESULT: true },
    inApp: { NEW_TRAINING: true, TEAMS_READY: true, MATCH_RESULT: true },
  }),
  CONTROLLABLE_TYPES: ["NEW_TRAINING", "TEAMS_READY", "MATCH_RESULT"],
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { mergePrefs } from "@/lib/notifPrefs";

type PrismaMock = {
  user: { findUnique: Mock };
  appNotification: { findMany: Mock; count: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockMergePrefs = mergePrefs as Mock;

const baseNotification = {
  id: "notif-1",
  type: "NEW_TRAINING",
  title: "Nuovo allenamento",
  body: "Martedì 18:00",
  url: "/allenamento/abc",
  createdAt: new Date("2026-01-10T10:00:00Z"),
  reads: [],
};

function makeGET(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/notifications");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.user.findUnique.mockResolvedValue({ notifPrefs: null });
    p.appNotification.findMany.mockResolvedValue([baseNotification]);
    p.appNotification.count.mockResolvedValue(1);
    mockMergePrefs.mockReturnValue({
      push: { NEW_TRAINING: true, TEAMS_READY: true, MATCH_RESULT: true },
      inApp: { NEW_TRAINING: true, TEAMS_READY: true, MATCH_RESULT: true },
    });
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeGET());
    expect(res.status).toBe(401);
    expect(p.appNotification.findMany).not.toHaveBeenCalled();
  });

  it("restituisce la lista paginata con isRead derivato da reads", async () => {
    p.appNotification.findMany.mockResolvedValue([
      { ...baseNotification, reads: [] },
      { ...baseNotification, id: "notif-2", reads: [{ readAt: new Date() }] },
    ]);
    p.appNotification.count.mockResolvedValue(2);
    const res = await GET(makeGET());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.notifications).toHaveLength(2);
    expect(body.notifications[0].isRead).toBe(false);
    expect(body.notifications[1].isRead).toBe(true);
    expect(body.total).toBe(2);
  });

  it("calcola skip correttamente per page=2 limit=10", async () => {
    p.appNotification.count.mockResolvedValue(25);
    await GET(makeGET({ page: "2", limit: "10" }));
    expect(p.appNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it("clamp limit a 50 anche se richiesto di più", async () => {
    await GET(makeGET({ limit: "200" }));
    expect(p.appNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });

  it("clamp page a 1 se <= 0", async () => {
    await GET(makeGET({ page: "0" }));
    expect(p.appNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });

  it("hasMore è true quando ci sono più risultati oltre la pagina corrente", async () => {
    p.appNotification.count.mockResolvedValue(25);
    const res = await GET(makeGET({ page: "1", limit: "10" }));
    const body = await res.json();
    expect(body.hasMore).toBe(true);
  });

  it("hasMore è false quando siamo all'ultima pagina", async () => {
    p.appNotification.count.mockResolvedValue(10);
    const res = await GET(makeGET({ page: "1", limit: "10" }));
    const body = await res.json();
    expect(body.hasMore).toBe(false);
  });

  it("esclude i tipi disabilitati dalle preferenze utente", async () => {
    mockMergePrefs.mockReturnValue({
      push: { NEW_TRAINING: true, TEAMS_READY: true, MATCH_RESULT: true },
      inApp: { NEW_TRAINING: false, TEAMS_READY: true, MATCH_RESULT: true },
    });
    await GET(makeGET());
    const call = p.appNotification.findMany.mock.calls[0][0];
    expect(call.where).toHaveProperty("NOT");
    expect(call.where.NOT).toMatchObject({ type: { in: ["NEW_TRAINING"] } });
  });

  it("non aggiunge il filtro NOT se tutti i tipi sono abilitati", async () => {
    await GET(makeGET());
    const call = p.appNotification.findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("NOT");
  });

  it("filtra le notifiche per visibilità (broadcast o dirette all'utente)", async () => {
    await GET(makeGET());
    const call = p.appNotification.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({
      OR: [{ targetUserId: null }, { targetUserId: "user-1" }],
    });
  });

  it("mappa le notifiche omettendo il campo reads interno", async () => {
    const res = await GET(makeGET());
    const body = await res.json();
    expect(body.notifications[0]).not.toHaveProperty("reads");
    expect(body.notifications[0]).toHaveProperty("isRead");
    expect(body.notifications[0]).toHaveProperty("id");
    expect(body.notifications[0]).toHaveProperty("type");
    expect(body.notifications[0]).toHaveProperty("title");
    expect(body.notifications[0]).toHaveProperty("body");
    expect(body.notifications[0]).toHaveProperty("url");
    expect(body.notifications[0]).toHaveProperty("createdAt");
  });
});
