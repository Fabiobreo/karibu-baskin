import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    pushSubscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { checkRateLimit } from "@/lib/rateLimit";

type PushMock = { pushSubscription: { findUnique: Mock; upsert: Mock; deleteMany: Mock } };
const p = prisma as unknown as PushMock;
const mockAuth = auth as Mock;
const mockRateLimit = checkRateLimit as Mock;

const validSub = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "fake-p256dh", auth: "fake-auth-key" },
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/push/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockRateLimit.mockReturnValue({ allowed: true });
    p.pushSubscription.findUnique.mockResolvedValue(null);
    p.pushSubscription.upsert.mockResolvedValue({});
  });

  it("restituisce 429 quando il rate limit è superato", async () => {
    mockRateLimit.mockReturnValue({ allowed: false });
    const res = await POST(makePost(validSub));
    expect(res.status).toBe(429);
    expect(p.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("restituisce 400 senza endpoint", async () => {
    const res = await POST(makePost({ keys: validSub.keys }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 senza keys.p256dh", async () => {
    const res = await POST(makePost({ endpoint: validSub.endpoint, keys: { auth: "x" } }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 senza keys.auth", async () => {
    const res = await POST(makePost({ endpoint: validSub.endpoint, keys: { p256dh: "x" } }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se il body non è JSON valido", async () => {
    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 409 se l'endpoint è già registrato da un altro utente", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    p.pushSubscription.findUnique.mockResolvedValue({ userId: "u-2" });
    const res = await POST(makePost(validSub));
    expect(res.status).toBe(409);
    expect(p.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("salva la subscription per utente autenticato", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    const res = await POST(makePost(validSub));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(p.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: validSub.endpoint },
        create: expect.objectContaining({ userId: "u-1" }),
        update: expect.objectContaining({ userId: "u-1" }),
      })
    );
  });

  it("salva la subscription per utente anonimo (userId null)", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost(validSub));
    expect(res.status).toBe(200);
    expect(p.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: null }),
      })
    );
  });

  it("aggiorna subscription esistente dello stesso utente senza 409", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    p.pushSubscription.findUnique.mockResolvedValue({ userId: "u-1" });
    const res = await POST(makePost(validSub));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/push/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    p.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("restituisce 400 senza endpoint", async () => {
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
    expect(p.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it("restituisce 400 se il body non è JSON valido", async () => {
    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "DELETE",
      body: "not-json",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("elimina subscription anonima (userId null)", async () => {
    const res = await DELETE(makeDelete({ endpoint: validSub.endpoint }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(p.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: validSub.endpoint, userId: null },
    });
  });

  it("elimina subscription dell'utente autenticato", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    const res = await DELETE(makeDelete({ endpoint: validSub.endpoint }));
    expect(res.status).toBe(200);
    expect(p.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: validSub.endpoint, userId: "u-1" },
    });
  });
});
