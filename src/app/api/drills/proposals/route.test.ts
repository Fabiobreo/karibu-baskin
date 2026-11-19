import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: { drill: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/board/drillAdmin", () => ({ freeDrillSlug: vi.fn(async () => "tiro") }));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

const p = prisma as unknown as { drill: { count: Mock; create: Mock; findMany: Mock } };
const mockAuth = auth as Mock;
const as = (appRole: string | null) =>
  mockAuth.mockResolvedValue(appRole ? { user: { id: "u1", appRole, name: "Marco" } } : null);
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/drills/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
const valid = { title: "Tiro al cono", kind: "EXERCISE", court: "HALF" };

describe("POST /api/drills/proposals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.drill.count.mockResolvedValue(0);
    p.drill.create.mockResolvedValue({ id: "d1" });
  });

  it("anonimo 401, ospite 403", async () => {
    as(null);
    expect((await post(valid)).status).toBe(401);
    as("GUEST");
    expect((await post(valid)).status).toBe(403);
    expect(p.drill.create).not.toHaveBeenCalled();
  });

  it("un tesserato crea la sua bozza, firmata e con il nome acceso", async () => {
    as("ATHLETE");
    const res = await post(valid);
    expect(res.status).toBe(201);
    expect(p.drill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PROPOSED",
          showAuthor: true,
          createdById: "u1",
          kind: "EXERCISE",
        }),
      })
    );
  });

  it("rifiuta i tipi degli schemi", async () => {
    as("ATHLETE");
    const res = await post({ ...valid, kind: "ATTACK" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("kind");
    expect(p.drill.create).not.toHaveBeenCalled();
  });

  it("oltre 3 proposte in attesa: 409 con il perché", async () => {
    as("PARENT");
    p.drill.count.mockResolvedValue(3);
    const res = await post(valid);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("limit");
    expect(json.error).toMatch(/ritirane una/);
    expect(p.drill.count).toHaveBeenCalledWith({
      where: { createdById: "u1", status: "PROPOSED", adoptedAt: null, archivedAt: null },
    });
  });
});

describe("GET /api/drills/proposals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("solo le proprie, solo ai tesserati", async () => {
    as(null);
    expect((await GET()).status).toBe(401);
    as("GUEST");
    expect((await GET()).status).toBe(403);
    as("ATHLETE");
    p.drill.findMany.mockResolvedValue([]);
    expect((await GET()).status).toBe(200);
    expect(p.drill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdById: "u1" }) })
    );
  });
});
