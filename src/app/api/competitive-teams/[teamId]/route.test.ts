import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    competitiveTeam: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

import { GET, PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type PrismaMock = {
  competitiveTeam: { findUnique: Mock; update: Mock; delete: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;

const baseTeam = {
  id: "team-1",
  name: "Karibu A",
  season: "2025-26",
  championship: null,
  color: "#FF6600",
  description: null,
  memberships: [],
  matches: [],
};

function makeParams(teamId: string) {
  return { params: Promise.resolve({ teamId }) };
}

describe("GET /api/competitive-teams/[teamId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.competitiveTeam.findUnique.mockResolvedValue({ ...baseTeam });
  });

  it("restituisce la squadra con memberships e matches", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("team-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Karibu A");
    expect(Array.isArray(json.memberships)).toBe(true);
  });

  it("restituisce 404 se la squadra non esiste", async () => {
    p.competitiveTeam.findUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("missing"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("non trovata");
  });
});

describe("PUT /api/competitive-teams/[teamId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.competitiveTeam.update.mockResolvedValue({ ...baseTeam, name: "Karibu B" });
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Karibu B" }),
    });
    const res = await PUT(req, makeParams("team-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per corpo non valido (colore hex errato)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: "red" }),
    });
    const res = await PUT(req, makeParams("team-1"));
    expect(res.status).toBe(400);
  });

  it("aggiorna la squadra e restituisce 200", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Karibu B  " }),
    });
    const res = await PUT(req, makeParams("team-1"));
    expect(res.status).toBe(200);
    const data = p.competitiveTeam.update.mock.calls[0][0].data;
    expect(data.name).toBe("Karibu B");
  });

  it("permette di azzerare il colore con null", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.competitiveTeam.update.mockResolvedValue({ ...baseTeam, color: null });
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: null }),
    });
    const res = await PUT(req, makeParams("team-1"));
    expect(res.status).toBe(200);
    const data = p.competitiveTeam.update.mock.calls[0][0].data;
    expect(data.color).toBeNull();
  });
});

describe("DELETE /api/competitive-teams/[teamId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.competitiveTeam.delete.mockResolvedValue(undefined);
  });

  it("restituisce 403 per utente non admin", async () => {
    const res = await DELETE(new Request("http://localhost"), makeParams("team-1"));
    expect(res.status).toBe(403);
  });

  it("elimina la squadra e restituisce 204", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await DELETE(new Request("http://localhost"), makeParams("team-1"));
    expect(res.status).toBe(204);
    expect(p.competitiveTeam.delete).toHaveBeenCalledWith({ where: { id: "team-1" } });
  });
});
