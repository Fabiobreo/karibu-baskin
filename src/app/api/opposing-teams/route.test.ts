import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    opposingTeam: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  opposingTeam: { findMany: Mock; create: Mock; findUnique: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsStaff = isCoachOrAdmin as Mock;

const baseTeam = {
  id: "opp-1",
  name: "Basket Vicenza",
  city: "Vicenza",
  notes: null,
  _count: { matches: 3 },
};

describe("GET /api/opposing-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.opposingTeam.findMany.mockResolvedValue([baseTeam]);
  });

  it("restituisce la lista delle squadre avversarie", async () => {
    const res = await GET(new NextRequest("http://localhost/api/opposing-teams"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].name).toBe("Basket Vicenza");
    expect(p.opposingTeam.findMany).toHaveBeenCalledOnce();
  });

  it("restituisce array vuoto se non ci sono squadre", async () => {
    p.opposingTeam.findMany.mockResolvedValue([]);
    const res = await GET(new NextRequest("http://localhost/api/opposing-teams"));
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe("POST /api/opposing-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStaff.mockResolvedValue(false);
    p.opposingTeam.create.mockResolvedValue({ ...baseTeam, id: "opp-new" });
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Basket Vicenza" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per body senza nome", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: "Vicenza" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("crea la squadra avversaria con trim e restituisce 201", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Basket Vicenza  ", city: "  Vicenza  " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = p.opposingTeam.create.mock.calls[0][0].data;
    expect(data.name).toBe("Basket Vicenza");
    expect(data.city).toBe("Vicenza");
  });

  it("imposta city=null e notes=null se non forniti", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nuova Squadra" }),
    });
    await POST(req);
    const data = p.opposingTeam.create.mock.calls[0][0].data;
    expect(data.city).toBeNull();
    expect(data.notes).toBeNull();
  });
});
