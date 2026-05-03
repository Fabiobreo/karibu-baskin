import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    competitiveTeam: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type PrismaMock = {
  competitiveTeam: { findMany: Mock; count: Mock; create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;

const baseTeam = {
  id: "team-1",
  name: "Karibu A",
  season: "2025-26",
  championship: "Campionato Veneto",
  color: "#FF6600",
  description: null,
  _count: { memberships: 10, matches: 5 },
};

describe("GET /api/competitive-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.competitiveTeam.findMany.mockResolvedValue([baseTeam]);
  });

  it("restituisce la lista delle squadre", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].name).toBe("Karibu A");
    expect(p.competitiveTeam.findMany).toHaveBeenCalledOnce();
  });

  it("restituisce array vuoto se non ci sono squadre", async () => {
    p.competitiveTeam.findMany.mockResolvedValue([]);
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe("POST /api/competitive-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.competitiveTeam.count.mockResolvedValue(0);
    p.competitiveTeam.create.mockResolvedValue({ ...baseTeam, id: "new-1" });
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost/api/competitive-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Karibu A", season: "2025-26" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per body non valido (nome mancante)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/competitive-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season: "2025-26" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per stagione con formato non valido", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/competitive-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Karibu A", season: "2025-2026" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 409 se ci sono già 2 squadre per la stagione", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.competitiveTeam.count.mockResolvedValue(2);
    const req = new Request("http://localhost/api/competitive-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Karibu C", season: "2025-26" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Massimo 2");
  });

  it("crea la squadra e restituisce 201", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/competitive-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Karibu A  ", season: "2025-26", color: "#FF6600" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = p.competitiveTeam.create.mock.calls[0][0].data;
    expect(data.name).toBe("Karibu A");
    expect(data.season).toBe("2025-26");
    expect(data.color).toBe("#FF6600");
  });

  it("permette una seconda squadra nella stessa stagione (count=1)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.competitiveTeam.count.mockResolvedValue(1);
    const req = new Request("http://localhost/api/competitive-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Karibu B", season: "2025-26" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(p.competitiveTeam.create).toHaveBeenCalledOnce();
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/competitive-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
