import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { PICK_AND_SHOOT } from "@/lib/board/fixtures";

vi.mock("@/lib/db", () => ({
  prisma: {
    drill: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    suggestion: { update: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

const p = prisma as unknown as {
  drill: { findUnique: Mock; update: Mock; delete: Mock };
  suggestion: { update: Mock; deleteMany: Mock };
  $transaction: Mock;
};
const mockAuth = auth as Mock;
const as = (appRole: string | null, id = "u1") =>
  mockAuth.mockResolvedValue(appRole ? { user: { id, appRole } } : null);
const ctx = { params: Promise.resolve({ id: "d1" }) };
const url = "http://localhost/api/drills/proposals/d1";
const put = (body: unknown) =>
  PUT(
    new NextRequest(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx
  );
const del = () => DELETE(new NextRequest(url, { method: "DELETE" }), ctx);

const stored = (over: object = {}) => ({
  status: "PROPOSED",
  createdById: "u1",
  proposedAt: null,
  adoptedAt: null,
  archivedAt: null,
  court: "HALF",
  content: PICK_AND_SHOOT,
  description: "Si tira",
  suggestionId: null,
  ...over,
});

describe("PUT /api/drills/proposals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.drill.update.mockReturnValue({ id: "d1", updatedAt: new Date() });
    p.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  });

  it("anonimo 401, ospite 403, un altro tesserato 404", async () => {
    as(null);
    expect((await put({ title: "X" })).status).toBe(401);
    as("GUEST");
    expect((await put({ title: "X" })).status).toBe(403);
    as("ATHLETE", "u2");
    p.drill.findUnique.mockResolvedValue(stored());
    expect((await put({ title: "X" })).status).toBe(404);
  });

  it("l'autore modifica disegno e titolo", async () => {
    as("ATHLETE");
    p.drill.findUnique.mockResolvedValue(stored());
    expect((await put({ title: "Nuovo", content: PICK_AND_SHOOT })).status).toBe(200);
    expect(p.drill.update).toHaveBeenCalled();
  });

  it("rifiuta un tipo da schema", async () => {
    as("ATHLETE");
    p.drill.findUnique.mockResolvedValue(stored());
    expect((await put({ kind: "DEFENSE" })).status).toBe(400);
  });

  it("dopo l'adozione o un 'Non adesso' non si modifica più", async () => {
    as("ATHLETE");
    p.drill.findUnique.mockResolvedValue(
      stored({ archivedAt: new Date(), proposedAt: new Date() })
    );
    expect((await put({ title: "X" })).status).toBe(409);
    p.drill.findUnique.mockResolvedValue(stored({ status: "DRAFT", adoptedAt: new Date() }));
    expect((await put({ title: "X" })).status).toBe(404);
  });

  it("inviata: la descrizione aggiorna anche il suggerimento", async () => {
    as("ATHLETE");
    p.drill.findUnique.mockResolvedValue(stored({ proposedAt: new Date(), suggestionId: "s1" }));
    expect((await put({ description: "Nuovo testo" })).status).toBe(200);
    expect(p.suggestion.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { message: "Nuovo testo" },
    });
  });
});

describe("DELETE /api/drills/proposals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.$transaction.mockResolvedValue([]);
  });

  it("l'autore ritira: si cancellano esercizio e suggerimento", async () => {
    as("ATHLETE");
    p.drill.findUnique.mockResolvedValue(stored({ proposedAt: new Date(), suggestionId: "s1" }));
    expect((await del()).status).toBe(200);
    expect(p.drill.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
    expect(p.suggestion.deleteMany).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("dopo l'adozione no; un altro tesserato riceve 404", async () => {
    as("ATHLETE");
    p.drill.findUnique.mockResolvedValue(stored({ status: "DRAFT", adoptedAt: new Date() }));
    expect((await del()).status).toBe(409);
    as("ATHLETE", "u2");
    p.drill.findUnique.mockResolvedValue(stored());
    expect((await del()).status).toBe(404);
  });
});
