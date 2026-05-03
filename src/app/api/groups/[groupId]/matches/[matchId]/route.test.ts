import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    groupMatch: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  groupMatch: { findUnique: Mock; update: Mock; delete: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const makeParams = (groupId: string, matchId: string) =>
  ({
    params: Promise.resolve({ groupId, matchId }),
  } as { params: Promise<{ groupId: string; matchId: string }> });

const baseMatch = {
  id: "gm-1",
  groupId: "g-1",
  matchday: 1,
  date: null,
  homeTeamId: "opp-1",
  awayTeamId: "opp-2",
  homeScore: null,
  awayScore: null,
};

const baseMatchWithIncludes = {
  ...baseMatch,
  homeTeam: { id: "opp-1", name: "Falchi", slug: "falchi" },
  awayTeam: { id: "opp-2", name: "Aquile", slug: "aquile" },
};

describe("PUT /api/groups/[groupId]/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(false);
    p.groupMatch.findUnique.mockResolvedValue(baseMatch);
    p.groupMatch.update.mockResolvedValue(baseMatchWithIncludes);
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: 70 }),
    });
    const res = await PUT(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "BAD_JSON",
    });
    const res = await PUT(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se homeScore è negativo", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: -5 }),
    });
    const res = await PUT(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se homeTeamId === awayTeamId", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeTeamId: "opp-1", awayTeamId: "opp-1" }),
    });
    const res = await PUT(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("diverse");
  });

  it("restituisce 404 se la partita non esiste", async () => {
    mockIsCoach.mockResolvedValue(true);
    p.groupMatch.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: 70 }),
    });
    const res = await PUT(req, makeParams("g-1", "nonexistent"));
    expect(res.status).toBe(404);
  });

  it("restituisce 404 se la partita appartiene a un altro girone", async () => {
    mockIsCoach.mockResolvedValue(true);
    p.groupMatch.findUnique.mockResolvedValue({ ...baseMatch, groupId: "altro-girone" });
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: 70 }),
    });
    const res = await PUT(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(404);
  });

  it("aggiorna il punteggio e restituisce 200", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: 70, awayScore: 50 }),
    });
    const res = await PUT(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(200);
    const data = p.groupMatch.update.mock.calls[0][0].data;
    expect(data.homeScore).toBe(70);
    expect(data.awayScore).toBe(50);
  });

  it("non modifica i campi non presenti nel body", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: 70 }),
    });
    await PUT(req, makeParams("g-1", "gm-1"));
    const data = p.groupMatch.update.mock.calls[0][0].data;
    expect("awayScore" in data).toBe(false);
    expect("homeTeamId" in data).toBe(false);
  });

  it("azzera il punteggio passando null", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: null, awayScore: null }),
    });
    await PUT(req, makeParams("g-1", "gm-1"));
    const data = p.groupMatch.update.mock.calls[0][0].data;
    expect(data.homeScore).toBeNull();
    expect(data.awayScore).toBeNull();
  });

  it("converte la stringa data in oggetto Date", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2025-11-10T18:00" }),
    });
    await PUT(req, makeParams("g-1", "gm-1"));
    const data = p.groupMatch.update.mock.calls[0][0].data;
    expect(data.date).toBeInstanceOf(Date);
  });
});

describe("DELETE /api/groups/[groupId]/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(false);
    p.groupMatch.findUnique.mockResolvedValue(baseMatch);
    p.groupMatch.delete.mockResolvedValue(baseMatch);
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 404 se la partita non esiste", async () => {
    mockIsCoach.mockResolvedValue(true);
    p.groupMatch.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/nonexistent", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("g-1", "nonexistent"));
    expect(res.status).toBe(404);
  });

  it("restituisce 404 se la partita appartiene a un altro girone", async () => {
    mockIsCoach.mockResolvedValue(true);
    p.groupMatch.findUnique.mockResolvedValue({ ...baseMatch, groupId: "altro-girone" });
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(404);
  });

  it("elimina la partita e restituisce 204", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches/gm-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("g-1", "gm-1"));
    expect(res.status).toBe(204);
    expect(p.groupMatch.delete).toHaveBeenCalledWith({ where: { id: "gm-1" } });
  });
});
