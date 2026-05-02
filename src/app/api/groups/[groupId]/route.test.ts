import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    group: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    match: { updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/standings", () => ({
  computeStandings: vi.fn().mockReturnValue([]),
}));

import { GET, PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  group: { findUnique: Mock; update: Mock; delete: Mock };
  match: { updateMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const makeParams = (groupId: string) =>
  ({ params: Promise.resolve({ groupId }) } as { params: Promise<{ groupId: string }> });

const baseGroup = {
  id: "g-1",
  name: "Girone A",
  season: "2025-26",
  championship: null,
  teamId: "team-1",
  team: { id: "team-1", name: "Arancioni", color: "#FF6600", season: "2025-26" },
  matches: [],
  groupMatches: [],
  _count: { matches: 0 },
};

describe("GET /api/groups/[groupId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.group.findUnique.mockResolvedValue(baseGroup);
  });

  it("restituisce il girone con standings calcolate", async () => {
    const req = new NextRequest("http://localhost/api/groups/g-1");
    const res = await GET(req, makeParams("g-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Girone A");
    expect(json).toHaveProperty("standings");
  });

  it("restituisce 404 se il girone non esiste", async () => {
    p.group.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/groups/nonexistent");
    const res = await GET(req, makeParams("nonexistent"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Girone non trovato");
  });

  it("interroga il DB con il groupId corretto", async () => {
    const req = new NextRequest("http://localhost/api/groups/g-1");
    await GET(req, makeParams("g-1"));
    expect(p.group.findUnique.mock.calls[0][0].where).toEqual({ id: "g-1" });
  });
});

describe("PUT /api/groups/[groupId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(false);
    p.group.update.mockResolvedValue({ ...baseGroup, _count: { matches: 0 } });
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new NextRequest("http://localhost/api/groups/g-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Girone B" }),
    });
    const res = await PUT(req, makeParams("g-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "BAD_JSON",
    });
    const res = await PUT(req, makeParams("g-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per nome vuoto", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const res = await PUT(req, makeParams("g-1"));
    expect(res.status).toBe(400);
  });

  it("aggiorna il girone e restituisce 200", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Girone B" }),
    });
    const res = await PUT(req, makeParams("g-1"));
    expect(res.status).toBe(200);
    const data = p.group.update.mock.calls[0][0].data;
    expect(data.name).toBe("Girone B");
  });

  it("applica trim al nome", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Girone C  " }),
    });
    await PUT(req, makeParams("g-1"));
    const data = p.group.update.mock.calls[0][0].data;
    expect(data.name).toBe("Girone C");
  });

  it("imposta championship=null se fornito null", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ championship: null }),
    });
    await PUT(req, makeParams("g-1"));
    const data = p.group.update.mock.calls[0][0].data;
    expect(data.championship).toBeNull();
  });

  it("non modifica i campi non presenti nel body", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ championship: "Regionale" }),
    });
    await PUT(req, makeParams("g-1"));
    const data = p.group.update.mock.calls[0][0].data;
    expect("name" in data).toBe(false);
  });
});

describe("DELETE /api/groups/[groupId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(false);
    p.match.updateMany.mockResolvedValue({ count: 0 });
    p.group.delete.mockResolvedValue(baseGroup);
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new NextRequest("http://localhost/api/groups/g-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("g-1"));
    expect(res.status).toBe(403);
  });

  it("azzera groupId delle partite prima di eliminare il girone", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", { method: "DELETE" });
    await DELETE(req, makeParams("g-1"));
    expect(p.match.updateMany).toHaveBeenCalledWith({
      where: { groupId: "g-1" },
      data: { groupId: null },
    });
    expect(p.group.delete).toHaveBeenCalledWith({ where: { id: "g-1" } });
  });

  it("restituisce 204 dopo l'eliminazione", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("g-1"));
    expect(res.status).toBe(204);
  });
});
