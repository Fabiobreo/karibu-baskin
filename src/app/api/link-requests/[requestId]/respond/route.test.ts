import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    linkRequest: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    child: { findUnique: vi.fn() },
    appNotification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/webpush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { sendPushToUser } from "@/lib/webpush";

type PrismaMock = {
  linkRequest: { findUnique: Mock };
  user: { findUnique: Mock };
  child: { findUnique: Mock };
  appNotification: { create: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockSendPush = sendPushToUser as Mock;

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 1000);

const baseLinkRequest = {
  id: "req-1",
  childId: "child-1",
  parentId: "parent-1",
  targetUserId: "target-1",
  status: "PENDING",
  expiresAt: FUTURE,
  child: { id: "child-1", name: "Luca", sportRole: 3, sportRoleVariant: null, userId: null },
  parent: { id: "parent-1", name: "Mario Rossi" },
};

function makePOST(
  requestId: string,
  body: object
): [NextRequest, { params: Promise<{ requestId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/link-requests/${requestId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ requestId }) },
  ];
}

describe("POST /api/link-requests/[requestId]/respond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "target-1" } });
    p.linkRequest.findUnique.mockResolvedValue({ ...baseLinkRequest });
    p.user.findUnique.mockResolvedValue({ id: "target-1", name: "Giovane", appRole: "ATHLETE", sportRole: null });
    p.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        linkRequest: { update: vi.fn().mockResolvedValue(undefined) },
        child: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue(undefined) },
        user: { findUnique: vi.fn().mockResolvedValue({ appRole: "ATHLETE", sportRole: null }), update: vi.fn().mockResolvedValue(undefined) },
        appNotification: { create: vi.fn().mockResolvedValue(undefined) },
      })
    );
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const [req, ctx] = makePOST("req-1", { accept: true });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("restituisce 404 se la richiesta non esiste", async () => {
    p.linkRequest.findUnique.mockResolvedValue(null);
    const [req, ctx] = makePOST("req-x", { accept: true });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("restituisce 403 se l'utente non è il destinatario", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other-user" } });
    const [req, ctx] = makePOST("req-1", { accept: true });
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("restituisce 409 se la richiesta non è più PENDING", async () => {
    p.linkRequest.findUnique.mockResolvedValue({ ...baseLinkRequest, status: "ACCEPTED" });
    const [req, ctx] = makePOST("req-1", { accept: true });
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("elaborata");
  });

  it("restituisce 410 se la richiesta è scaduta", async () => {
    p.linkRequest.findUnique.mockResolvedValue({ ...baseLinkRequest, expiresAt: PAST });
    const [req, ctx] = makePOST("req-1", { accept: true });
    const res = await POST(req, ctx);
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toContain("scaduta");
  });

  it("restituisce 400 se 'accept' non è un boolean", async () => {
    const [req, ctx] = makePOST("req-1", { accept: "yes" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("accept");
  });

  it("accetta la richiesta — restituisce { status: ACCEPTED } e invia push", async () => {
    p.user.findUnique.mockResolvedValue({ name: "Giovane" });
    const [req, ctx] = makePOST("req-1", { accept: true });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ACCEPTED");
    expect(mockSendPush).toHaveBeenCalledWith(
      "parent-1",
      expect.objectContaining({ type: "LINK_RESPONSE" })
    );
  });

  it("rifiuta la richiesta — restituisce { status: REJECTED } e invia push", async () => {
    p.user.findUnique.mockResolvedValue({ name: "Giovane" });
    const [req, ctx] = makePOST("req-1", { accept: false });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("REJECTED");
    expect(mockSendPush).toHaveBeenCalledWith(
      "parent-1",
      expect.objectContaining({ type: "LINK_RESPONSE" })
    );
  });

  it("esegue le operazioni dentro una transaction", async () => {
    const [req, ctx] = makePOST("req-1", { accept: true });
    await POST(req, ctx);
    expect(p.$transaction).toHaveBeenCalledOnce();
  });
});
