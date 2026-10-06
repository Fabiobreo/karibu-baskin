import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    linkRequest: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    appNotification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  linkRequest: { findMany: Mock; findFirst: Mock; count: Mock; create: Mock };
  user: { findUnique: Mock };
  appNotification: { create: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const baseLinkRequest = {
  id: "req-1",
  parentId: "user-parent",
  targetUserId: "user-1",
  status: "PENDING",
  expiresAt: null,
  createdAt: new Date("2025-03-01"),
  child: {
    id: "child-1",
    name: "Luca",
    sportRole: 2,
    sportRoleVariant: null,
    gender: "MALE",
    birthDate: null,
  },
  parent: { id: "user-parent", name: "Anna Rossi", image: null, email: "anna@example.com" },
};

describe("GET /api/link-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.linkRequest.findMany.mockResolvedValue([baseLinkRequest]);
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("autenticato");
  });

  it("restituisce array vuoto se nessuna richiesta", async () => {
    p.linkRequest.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("restituisce le richieste PENDING per l'utente loggato", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("req-1");
    expect(json[0].child.name).toBe("Luca");
    expect(json[0].parent.name).toBe("Anna Rossi");
  });

  it("filtra per targetUserId dell'utente in sessione", async () => {
    await GET();
    const call = p.linkRequest.findMany.mock.calls[0][0];
    expect(call.where.targetUserId).toBe("user-1");
    expect(call.where.status).toBe("PENDING");
  });

  it("ordina per data di creazione decrescente", async () => {
    await GET();
    const call = p.linkRequest.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });
});

describe("POST /api/link-requests", () => {
  const makeReq = (body: unknown) =>
    new NextRequest("http://localhost/api/link-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const body = { targetUserId: "user-child", parentalConsent: true };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-parent", appRole: "PARENT" } });
    p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "user-child"
          ? { id: "user-child", name: "Giulia Rossi", childAccount: null }
          : { name: "Anna Rossi" }
      )
    );
    p.linkRequest.findFirst.mockResolvedValue(null);
    p.linkRequest.count.mockResolvedValue(0);
    p.linkRequest.create.mockResolvedValue({ id: "req-new" });
    p.appNotification.create.mockResolvedValue({});
    p.$transaction.mockImplementation((fn: (tx: PrismaMock) => Promise<unknown>) => fn(p));
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(makeReq(body))).status).toBe(401);
  });

  it("restituisce 403 a chi non è genitore", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-parent", appRole: "ATHLETE" } });
    expect((await POST(makeReq(body))).status).toBe(403);
    expect(p.linkRequest.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 senza consenso", async () => {
    expect((await POST(makeReq({ targetUserId: "user-child" }))).status).toBe(400);
  });

  it("restituisce 400 se il genitore indica sé stesso", async () => {
    const res = await POST(makeReq({ ...body, targetUserId: "user-parent" }));
    expect(res.status).toBe(400);
  });

  it("crea la richiesta senza scheda figlio e avvisa il figlio", async () => {
    const res = await POST(makeReq(body));
    expect(res.status).toBe(201);
    expect((await res.json()).requestId).toBe("req-new");
    const data = p.linkRequest.create.mock.calls[0][0].data;
    expect(data.parentId).toBe("user-parent");
    expect(data.targetUserId).toBe("user-child");
    expect(data.childId).toBeUndefined();
    expect(p.appNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "LINK_REQUEST", targetUserId: "user-child" }),
      })
    );
  });

  it("restituisce 409 se l'account ha già una scheda figlio", async () => {
    p.user.findUnique.mockResolvedValue({
      id: "user-child",
      name: "Giulia Rossi",
      childAccount: { guardians: [] },
    });
    const res = await POST(makeReq(body));
    expect(res.status).toBe(409);
    expect(p.linkRequest.create).not.toHaveBeenCalled();
  });

  it("non duplica una richiesta già in attesa", async () => {
    p.linkRequest.findFirst.mockResolvedValue({ id: "req-old" });
    const res = await POST(makeReq(body));
    expect(res.status).toBe(200);
    expect((await res.json()).requestId).toBe("req-old");
    expect(p.linkRequest.create).not.toHaveBeenCalled();
  });

  it("restituisce 429 con troppe richieste in attesa", async () => {
    p.linkRequest.count.mockResolvedValue(5);
    expect((await POST(makeReq(body))).status).toBe(429);
  });
});

describe("POST /api/link-requests, richieste scadute", () => {
  it("una richiesta in attesa ma scaduta non blocca un nuovo invio", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-parent", appRole: "PARENT" } });
    p.user.findUnique.mockResolvedValue({ id: "user-child", name: "Giulia", childAccount: null });
    p.linkRequest.findFirst.mockResolvedValue(null);
    p.linkRequest.count.mockResolvedValue(0);
    p.linkRequest.create.mockResolvedValue({ id: "req-new" });
    p.appNotification.create.mockResolvedValue({});
    p.$transaction.mockImplementation((fn: (tx: PrismaMock) => Promise<unknown>) => fn(p));

    await POST(
      new NextRequest("http://localhost/api/link-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: "user-child", parentalConsent: true }),
      })
    );
    // Sia la ricerca del doppione sia il tetto delle richieste guardano solo
    // quelle non scadute.
    const notExpired = { OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] };
    expect(p.linkRequest.findFirst.mock.calls[0][0].where).toMatchObject(notExpired);
    expect(p.linkRequest.count.mock.calls[0][0].where).toMatchObject(notExpired);
  });
});
