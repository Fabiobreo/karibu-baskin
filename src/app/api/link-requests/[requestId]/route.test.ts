import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    linkRequest: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = { linkRequest: { findUnique: Mock; delete: Mock } };
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

function makeRequest(requestId: string) {
  return new NextRequest(`http://localhost/api/link-requests/${requestId}`, {
    method: "DELETE",
  });
}

const makeParams = (requestId: string) =>
  ({ params: Promise.resolve({ requestId }) }) as { params: Promise<{ requestId: string }> };

describe("DELETE /api/link-requests/[requestId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-parent" } });
    p.linkRequest.findUnique.mockResolvedValue({
      parentId: "user-parent",
      status: "PENDING",
    });
    p.linkRequest.delete.mockResolvedValue({});
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest("req-1"), makeParams("req-1"));
    expect(res.status).toBe(401);
    expect(p.linkRequest.delete).not.toHaveBeenCalled();
  });

  it("restituisce 404 se la richiesta non esiste", async () => {
    p.linkRequest.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("req-missing"), makeParams("req-missing"));
    expect(res.status).toBe(404);
    expect(p.linkRequest.delete).not.toHaveBeenCalled();
  });

  it("restituisce 403 se l'utente non è il richiedente", async () => {
    p.linkRequest.findUnique.mockResolvedValue({
      parentId: "altro-utente",
      status: "PENDING",
    });
    const res = await DELETE(makeRequest("req-1"), makeParams("req-1"));
    expect(res.status).toBe(403);
    expect(p.linkRequest.delete).not.toHaveBeenCalled();
  });

  it("restituisce 409 se la richiesta è già stata elaborata", async () => {
    p.linkRequest.findUnique.mockResolvedValue({
      parentId: "user-parent",
      status: "ACCEPTED",
    });
    const res = await DELETE(makeRequest("req-1"), makeParams("req-1"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("elaborata");
    expect(p.linkRequest.delete).not.toHaveBeenCalled();
  });

  it("elimina la richiesta e restituisce 204", async () => {
    const res = await DELETE(makeRequest("req-1"), makeParams("req-1"));
    expect(res.status).toBe(204);
    expect(p.linkRequest.delete).toHaveBeenCalledWith({ where: { id: "req-1" } });
  });
});
