import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    opposingTeam: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type PrismaMock = {
  opposingTeam: { findMany: Mock; create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;

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
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].name).toBe("Basket Vicenza");
    expect(p.opposingTeam.findMany).toHaveBeenCalledOnce();
  });

  it("restituisce array vuoto se non ci sono squadre", async () => {
    p.opposingTeam.findMany.mockResolvedValue([]);
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe("POST /api/opposing-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.opposingTeam.create.mockResolvedValue({ ...baseTeam, id: "opp-new" });
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Basket Vicenza" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per body senza nome", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: "Vicenza" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("crea la squadra avversaria con trim e restituisce 201", async () => {
    mockIsAdmin.mockResolvedValue(true);
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
    mockIsAdmin.mockResolvedValue(true);
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
