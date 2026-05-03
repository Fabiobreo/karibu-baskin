import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    linkRequest: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = { linkRequest: { findMany: Mock } };
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const baseLinkRequest = {
  id: "req-1",
  parentId: "user-parent",
  targetUserId: "user-1",
  status: "PENDING",
  expiresAt: null,
  createdAt: new Date("2025-03-01"),
  child: { id: "child-1", name: "Luca", sportRole: 2, sportRoleVariant: null, gender: "MALE", birthDate: null },
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
