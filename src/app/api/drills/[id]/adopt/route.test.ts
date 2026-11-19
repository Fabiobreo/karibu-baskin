import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

const tx = {
  drill: { updateMany: vi.fn() },
  suggestionNote: { create: vi.fn() },
  suggestion: { update: vi.fn() },
};
vi.mock("@/lib/db", () => ({
  prisma: { drill: { findUnique: vi.fn() }, $transaction: vi.fn() },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/notifications/matchNotify", () => ({ deliverNotices: vi.fn() }));
vi.mock("@/lib/board/drillAdmin", () => ({ auditDrill: vi.fn() }));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { auditDrill } from "@/lib/board/drillAdmin";
import { deliverNotices } from "@/lib/notifications/matchNotify";
import { ADOPTION_REPLY } from "@/lib/board/proposalNotify";

const p = prisma as unknown as { drill: { findUnique: Mock }; $transaction: Mock };
const mockAuth = auth as Mock;
const ctx = { params: Promise.resolve({ id: "d1" }) };
const adopt = () =>
  POST(new NextRequest("http://localhost/api/drills/d1/adopt", { method: "POST" }), ctx);
const proposal = (over: object = {}) => ({
  title: "Tiro al cono",
  status: "PROPOSED",
  createdById: "author",
  proposedAt: new Date(),
  adoptedAt: null,
  archivedAt: null,
  suggestionId: "s1",
  ...over,
});

describe("POST /api/drills/[id]/adopt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "coach", appRole: "COACH" } });
    p.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
    tx.drill.updateMany.mockResolvedValue({ count: 1 });
  });

  it("solo lo staff: il dirigente e un atleta no", async () => {
    mockAuth.mockResolvedValue({ user: { id: "d", appRole: "DIRECTOR" } });
    expect((await adopt()).status).toBe(403);
    mockAuth.mockResolvedValue({ user: { id: "a", appRole: "ATHLETE" } });
    expect((await adopt()).status).toBe(403);
  });

  it("diventa una bozza dello staff, con la risposta automatica all'autore", async () => {
    p.drill.findUnique.mockResolvedValue(proposal());
    expect((await adopt()).status).toBe(200);
    expect(tx.drill.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DRAFT", archivedAt: null, updatedById: "coach" }),
      })
    );
    expect(tx.suggestionNote.create).toHaveBeenCalledWith({
      data: { suggestionId: "s1", authorId: "coach", body: ADOPTION_REPLY, isReply: true },
    });
    expect(auditDrill).toHaveBeenCalledWith(expect.objectContaining({ action: "ADOPT_DRILL" }));
    expect(deliverNotices).toHaveBeenCalledWith(
      [expect.objectContaining({ ids: ["author"], url: "/profilo/suggerimenti#s-s1" })],
      "drill adopted"
    );
  });

  it("una bozza non inviata non esiste; una già adottata è 409", async () => {
    p.drill.findUnique.mockResolvedValue(proposal({ proposedAt: null }));
    expect((await adopt()).status).toBe(404);
    p.drill.findUnique.mockResolvedValue(proposal({ status: "DRAFT", adoptedAt: new Date() }));
    expect((await adopt()).status).toBe(404);
    p.drill.findUnique.mockResolvedValue(proposal());
    tx.drill.updateMany.mockResolvedValue({ count: 0 });
    expect((await adopt()).status).toBe(409);
  });
});
