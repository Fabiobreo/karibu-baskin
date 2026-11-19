import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { PICK_AND_SHOOT } from "@/lib/board/fixtures";
import { EMPTY_DRILL_CONTENT } from "@/lib/schemas/drill";

const tx = {
  drill: { updateMany: vi.fn(), update: vi.fn() },
  suggestion: { create: vi.fn() },
};
vi.mock("@/lib/db", () => ({
  prisma: {
    drill: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/background", () => ({
  inBackground: vi.fn((p: Promise<unknown>) => p),
}));
vi.mock("@/lib/notifications/matchNotify", () => ({ deliverNotices: vi.fn() }));
vi.mock("@/lib/notifications/recipients", () => ({ staffUserIds: vi.fn(async () => ["c1"]) }));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { deliverNotices } from "@/lib/notifications/matchNotify";

const p = prisma as unknown as { drill: { findUnique: Mock }; $transaction: Mock };
const mockAuth = auth as Mock;
const ctx = { params: Promise.resolve({ id: "d1" }) };
const submit = () =>
  POST(new NextRequest("http://localhost/api/drills/proposals/d1/submit", { method: "POST" }), ctx);

const stored = (over: object = {}) => ({
  id: "d1",
  title: "Tiro al cono",
  court: "HALF",
  content: PICK_AND_SHOOT,
  description: "Si tira dal cono",
  status: "PROPOSED",
  createdById: "u1",
  proposedAt: null,
  adoptedAt: null,
  archivedAt: null,
  ...over,
});

describe("POST /api/drills/proposals/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "u1", appRole: "ATHLETE", name: "Marco Rossi" } });
    p.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
    tx.drill.updateMany.mockResolvedValue({ count: 1 });
    tx.suggestion.create.mockResolvedValue({ id: "s1" });
  });

  it("invia: suggerimento ESERCIZIO collegato e avviso allo staff con il nome", async () => {
    p.drill.findUnique.mockResolvedValue(stored());
    expect((await submit()).status).toBe(200);
    expect(tx.suggestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { category: "ESERCIZIO", message: "Si tira dal cono", userId: "u1" },
      })
    );
    expect(tx.drill.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { suggestionId: "s1" },
    });
    await vi.waitFor(() => expect(deliverNotices).toHaveBeenCalled());
    const [[notices]] = (deliverNotices as Mock).mock.calls;
    expect(notices[0]).toMatchObject({
      ids: ["c1"],
      title: "Nuovo suggerimento",
      body: "Proposta di esercizio di Marco: Tiro al cono",
      url: "/admin/playbook/proposte/d1",
    });
  });

  it("ospite 403, altro tesserato 404", async () => {
    mockAuth.mockResolvedValue({ user: { id: "g", appRole: "GUEST" } });
    expect((await submit()).status).toBe(403);
    mockAuth.mockResolvedValue({ user: { id: "u2", appRole: "ATHLETE" } });
    p.drill.findUnique.mockResolvedValue(stored());
    expect((await submit()).status).toBe(404);
  });

  it("vuota o senza descrizione: 409", async () => {
    p.drill.findUnique.mockResolvedValue(stored({ content: EMPTY_DRILL_CONTENT }));
    expect((await submit()).status).toBe(409);
    p.drill.findUnique.mockResolvedValue(stored({ description: null }));
    const res = await submit();
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("noDescription");
    expect(tx.suggestion.create).not.toHaveBeenCalled();
  });

  it("già inviata: 409, nessun secondo suggerimento", async () => {
    p.drill.findUnique.mockResolvedValue(stored({ proposedAt: new Date() }));
    expect((await submit()).status).toBe(409);
    p.drill.findUnique.mockResolvedValue(stored());
    tx.drill.updateMany.mockResolvedValue({ count: 0 });
    expect((await submit()).status).toBe(409);
    expect(tx.suggestion.create).not.toHaveBeenCalled();
  });
});
