import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    child: { findUnique: vi.fn() },
    playerMatchStats: { findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

type PrismaMock = {
  child: { findUnique: Mock };
  playerMatchStats: { findMany: Mock };
};
const p = prisma as unknown as PrismaMock;

function makeGET(childId: string, season?: string): [NextRequest, { params: Promise<{ childId: string }> }] {
  const url = season
    ? `http://localhost/api/children/${childId}/season-stats?season=${season}`
    : `http://localhost/api/children/${childId}/season-stats`;
  return [
    new NextRequest(url),
    { params: Promise.resolve({ childId }) },
  ];
}

describe("GET /api/children/[childId]/season-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restituisce 404 se il figlio non esiste", async () => {
    p.child.findUnique.mockResolvedValue(null);
    const [req, ctx] = makeGET("child-missing");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("restituisce zero stats se nessuna partita giocata", async () => {
    p.child.findUnique.mockResolvedValue({ id: "c1" });
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const [req, ctx] = makeGET("c1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchesPlayed).toBe(0);
    expect(json.points).toBe(0);
    expect(json.avgPoints).toBe(0);
    expect(json.season).toBeNull();
  });

  it("aggrega correttamente le statistiche", async () => {
    p.child.findUnique.mockResolvedValue({ id: "c1" });
    p.playerMatchStats.findMany.mockResolvedValue([
      { points: 8, baskets: 3, fouls: 3, assists: 0, rebounds: 2 },
      { points: 12, baskets: 5, fouls: 1, assists: 2, rebounds: 4 },
      { points: 4, baskets: 1, fouls: 2, assists: 1, rebounds: 1 },
    ]);
    const [req, ctx] = makeGET("c1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchesPlayed).toBe(3);
    expect(json.points).toBe(24);
    expect(json.baskets).toBe(9);
    expect(json.fouls).toBe(6);
    expect(json.assists).toBe(3);
    expect(json.rebounds).toBe(7);
    expect(json.avgPoints).toBe(8);
  });

  it("filtra per stagione quando fornita", async () => {
    p.child.findUnique.mockResolvedValue({ id: "c1" });
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const [req, ctx] = makeGET("c1", "2024-25");
    await GET(req, ctx);
    expect(p.playerMatchStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ match: { team: { season: "2024-25" } } }),
      })
    );
  });

  it("non filtra per stagione se il parametro è assente", async () => {
    p.child.findUnique.mockResolvedValue({ id: "c1" });
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const [req, ctx] = makeGET("c1");
    await GET(req, ctx);
    expect(p.playerMatchStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { childId: "c1" } })
    );
  });
});
