import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    registration: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  registration: { findMany: Mock; updateMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/registrations/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/registrations/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    p.registration.findMany.mockResolvedValue([]);
    p.registration.updateMany.mockResolvedValue({ count: 0 });
  });

  it("restituisce 401 se l'utente non è autenticato", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(401);
    expect(p.registration.updateMany).not.toHaveBeenCalled();
  });

  it("restituisce 401 se manca il nome utente nella sessione", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: null } });
    const res = await POST(makePost({}));
    expect(res.status).toBe(401);
    expect(p.registration.updateMany).not.toHaveBeenCalled();
  });

  it("rivendica tutte le iscrizioni anonime corrispondenti (fallback senza ids)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: "Mario Rossi" } });
    p.registration.updateMany.mockResolvedValue({ count: 3 });

    const res = await POST(makePost({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claimed).toBe(3);
    expect(p.registration.updateMany).toHaveBeenCalledWith({
      where: { userId: null, childId: null, name: { equals: "Mario Rossi", mode: "insensitive" } },
      data: { userId: "user-1" },
    });
  });

  it("rivendica solo gli ids specificati che appartengono all'utente per nome", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: "Mario Rossi" } });
    p.registration.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    p.registration.updateMany.mockResolvedValue({ count: 2 });

    const res = await POST(makePost({ ids: ["r1", "r2", "r3-other"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claimed).toBe(2);
    expect(p.registration.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["r1", "r2", "r3-other"] },
        userId: null,
        childId: null,
        name: { equals: "Mario Rossi", mode: "insensitive" },
      },
      select: { id: true },
    });
    expect(p.registration.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["r1", "r2"] } },
      data: { userId: "user-1" },
    });
  });

  it("restituisce claimed: 0 se nessun ids è eleggibile", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: "Mario Rossi" } });
    p.registration.findMany.mockResolvedValue([]);

    const res = await POST(makePost({ ids: ["r-other"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claimed).toBe(0);
    expect(p.registration.updateMany).not.toHaveBeenCalled();
  });

  it("usa fallback se ids è array vuoto", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: "Mario" } });
    p.registration.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makePost({ ids: [] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.claimed).toBe(1);
    // Array vuoto → fallback alla query globale, non alla findMany
    expect(p.registration.findMany).not.toHaveBeenCalled();
  });
});
