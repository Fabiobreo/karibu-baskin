import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { PICK_AND_SHOOT } from "@/lib/board/fixtures";
import { EMPTY_DRILL_CONTENT } from "@/lib/schemas/drill";

vi.mock("@/lib/db", () => ({
  prisma: {
    drill: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/board/drillAdmin", async (orig) => ({
  ...(await orig<typeof import("@/lib/board/drillAdmin")>()),
  auditDrill: vi.fn(),
}));

import { GET, PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { auditDrill } from "@/lib/board/drillAdmin";

const p = prisma as unknown as {
  drill: { findUnique: Mock; findFirst: Mock; update: Mock; delete: Mock };
};
const mockAuth = auth as Mock;
const ctx = { params: Promise.resolve({ id: "d1" }) };
const url = "http://localhost/api/drills/d1";
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
const get = () => GET(new NextRequest(url), ctx);
const as = (appRole: string) => mockAuth.mockResolvedValue({ user: { id: "u1", appRole } });

const stored = (over: object = {}) => ({
  title: "Pick",
  court: "HALF",
  status: "DRAFT",
  content: PICK_AND_SHOOT,
  archivedAt: null,
  publishedAt: null,
  ...over,
});

describe("GET /api/drills/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ospite e anonimo: 403, senza leggere niente", async () => {
    as("GUEST");
    expect((await get()).status).toBe(403);
    mockAuth.mockResolvedValue(null);
    expect((await get()).status).toBe(403);
    expect(p.drill.findFirst).not.toHaveBeenCalled();
  });

  it("al tesserato solo pubblicati e non archiviati", async () => {
    as("ATHLETE");
    p.drill.findFirst.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
    expect(p.drill.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "d1", status: "PUBLISHED", archivedAt: null } })
    );
  });

  it("il dirigente legge anche le bozze", async () => {
    as("DIRECTOR");
    p.drill.findUnique.mockResolvedValue({ id: "d1", status: "DRAFT" });
    expect((await get()).status).toBe(200);
  });
});

describe("PUT /api/drills/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    as("COACH");
    p.drill.findUnique.mockResolvedValue(stored());
    p.drill.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: "d1", ...stored(), ...data })
    );
  });

  it("dirigente e atleta non scrivono", async () => {
    as("DIRECTOR");
    expect((await put({ title: "x" })).status).toBe(403);
    as("ATHLETE");
    expect((await put({ title: "x" })).status).toBe(403);
    expect(p.drill.update).not.toHaveBeenCalled();
  });

  it("salva il disegno valido e lo registra", async () => {
    expect((await put({ content: PICK_AND_SHOOT })).status).toBe(200);
    expect(auditDrill).toHaveBeenCalledWith(expect.objectContaining({ action: "UPDATE_DRILL" }));
  });

  it("rifiuta un disegno fuori dalla meta' campo", async () => {
    const c = structuredClone(PICK_AND_SHOOT);
    c.steps[0].at.a3 = { x: 3, y: 4 };
    const res = await put({ content: c });
    expect(res.status).toBe(400);
    expect(p.drill.update).not.toHaveBeenCalled();
  });

  it("a meta' campo si passa solo con i pezzi gia' a destra", async () => {
    const c = structuredClone(PICK_AND_SHOOT);
    c.steps[0].at.a3 = { x: 3, y: 4 };
    p.drill.findUnique.mockResolvedValue(stored({ court: "FULL", content: c }));
    const res = await put({ court: "HALF" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/metà campo di destra/);
  });

  it("non pubblica uno schema vuoto; pubblicando segna la data una volta", async () => {
    p.drill.findUnique.mockResolvedValue(stored({ content: EMPTY_DRILL_CONTENT }));
    expect((await put({ status: "PUBLISHED" })).status).toBe(409);

    p.drill.findUnique.mockResolvedValue(stored());
    expect((await put({ status: "PUBLISHED" })).status).toBe(200);
    expect(p.drill.update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
    expect(auditDrill).toHaveBeenCalledWith(expect.objectContaining({ action: "PUBLISH_DRILL" }));
  });

  it("uno schema archiviato non si modifica", async () => {
    p.drill.findUnique.mockResolvedValue(stored({ archivedAt: new Date() }));
    expect((await put({ title: "x" })).status).toBe(409);
  });
});

describe("DELETE /api/drills/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    as("COACH");
  });

  it("mai usato: si elimina", async () => {
    p.drill.findUnique.mockResolvedValue({
      title: "Pick",
      archivedAt: null,
      _count: { trainings: 0 },
    });
    expect(await (await del()).json()).toEqual({ deleted: true });
    expect(p.drill.delete).toHaveBeenCalled();
  });

  it("usato in un allenamento: si archivia", async () => {
    p.drill.findUnique.mockResolvedValue({
      title: "Pick",
      archivedAt: null,
      _count: { trainings: 2 },
    });
    expect(await (await del()).json()).toEqual({ archived: true });
    expect(p.drill.delete).not.toHaveBeenCalled();
    expect(p.drill.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(Date);
  });
});
