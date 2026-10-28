import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: { childGuardian: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

const db = prisma as unknown as { childGuardian: { findUnique: Mock; update: Mock } };
const mockAuth = auth as unknown as Mock;

function put(body: unknown) {
  const req = new NextRequest("http://localhost/api/children/c1/next-action", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return PUT(req, { params: Promise.resolve({ childId: "c1" }) });
}

describe("PUT /api/children/[childId]/next-action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "mamma" } });
  });

  it("401 senza sessione", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await put({ show: false })).status).toBe(401);
  });

  it("400 con un corpo non valido", async () => {
    expect((await put({ show: "no" })).status).toBe(400);
  });

  it("403 se non è suo genitore", async () => {
    db.childGuardian.findUnique.mockResolvedValue(null);
    expect((await put({ show: false })).status).toBe(403);
    expect(db.childGuardian.update).not.toHaveBeenCalled();
  });

  it("409 per un figlio senza account", async () => {
    db.childGuardian.findUnique.mockResolvedValue({ child: { userId: null } });
    expect((await put({ show: false })).status).toBe(409);
  });

  it("salva la scelta solo sul proprio collegamento", async () => {
    db.childGuardian.findUnique.mockResolvedValue({ child: { userId: "figlio" } });
    const res = await put({ show: false });
    expect(res.status).toBe(200);
    expect(db.childGuardian.update).toHaveBeenCalledWith({
      where: { childId_userId: { childId: "c1", userId: "mamma" } },
      data: { showInNextAction: false },
    });
  });
});
