import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    suggestion: { findUnique: vi.fn(), update: vi.fn() },
    suggestionNote: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/notifications/matchNotify", () => ({ deliverNotices: vi.fn() }));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  suggestion: { findUnique: Mock; update: Mock };
  suggestionNote: { create: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const AUTHOR_ID = "id-autore-riservato";

function call(body: unknown) {
  const req = new Request("http://x/api/suggestions/s1/notes", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id: "s1" }) });
}

const note = {
  id: "n1",
  body: "Ciao",
  isReply: false,
  createdAt: new Date("2026-10-19T10:00:00Z"),
  author: { id: "staff1", name: "Anna", image: null, customImage: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "staff1", name: "Anna Bianchi" } });
  (isCoachOrAdmin as Mock).mockResolvedValue(true);
  p.suggestionNote.create.mockReturnValue(note);
  p.suggestion.update.mockReturnValue({});
  p.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
});

describe("POST /api/suggestions/[id]/notes", () => {
  it("401 senza staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await call({ body: "Ciao" })).status).toBe(401);
  });

  it("404 se il suggerimento non esiste", async () => {
    p.suggestion.findUnique.mockResolvedValue(null);
    expect((await call({ body: "Ciao" })).status).toBe(404);
  });

  it("409 con REPLY su un suggerimento senza autore", async () => {
    p.suggestion.findUnique.mockResolvedValue({
      id: "s1",
      userId: null,
      status: "NUOVO",
      notes: [],
    });
    const res = await call({ body: "Ciao", kind: "REPLY" });
    expect(res.status).toBe(409);
    expect(p.suggestionNote.create).not.toHaveBeenCalled();
  });

  it("NOTE su un NUOVO: nota creata e stato LETTO, senza userId nella risposta", async () => {
    p.suggestion.findUnique.mockResolvedValue({
      id: "s1",
      userId: AUTHOR_ID,
      status: "NUOVO",
      notes: [],
    });
    const res = await call({ body: "Ciao" });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("LETTO");
    expect(json.note.id).toBe("n1");
    expect(p.suggestion.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "LETTO" },
    });
    expect(JSON.stringify(json)).not.toContain(AUTHOR_ID);
  });

  it("su un suggerimento già LETTO lo stato non cambia", async () => {
    p.suggestion.findUnique.mockResolvedValue({
      id: "s1",
      userId: AUTHOR_ID,
      status: "ARCHIVIATO",
      notes: [],
    });
    const json = await (await call({ body: "Ciao" })).json();
    expect(json.status).toBe("ARCHIVIATO");
    expect(p.suggestion.update).not.toHaveBeenCalled();
  });
});
