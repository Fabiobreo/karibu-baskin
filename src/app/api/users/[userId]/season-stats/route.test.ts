import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    playerMatchStats: { findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

type PrismaMock = {
  user: { findUnique: Mock };
  playerMatchStats: { findMany: Mock };
};
const p = prisma as unknown as PrismaMock;

function makeGET(userId: string, season?: string): [NextRequest, { params: Promise<{ userId: string }> }] {
  const url = season
    ? `http://localhost/api/users/${userId}/season-stats?season=${season}`
    : `http://localhost/api/users/${userId}/season-stats`;
  return [
    new NextRequest(url),
    { params: Promise.resolve({ userId }) },
  ];
}

describe("GET /api/users/[userId]/season-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restituisce 404 se l'utente non esiste", async () => {
    p.user.findUnique.mockResolvedValue(null);
    const [req, ctx] = makeGET("user-missing");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("restituisce zero stats se nessuna partita giocata", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1" });
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const [req, ctx] = makeGET("u1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchesPlayed).toBe(0);
    expect(json.points).toBe(0);
    expect(json.avgPoints).toBe(0);
    expect(json.season).toBeNull();
  });

  it("aggrega correttamente punti, canestri, falli, assist, rimbalzi", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1" });
    p.playerMatchStats.findMany.mockResolvedValue([
      { points: 10, baskets: 4, fouls: 2, assists: 1, rebounds: 3 },
      { points: 20, baskets: 8, fouls: 1, assists: 3, rebounds: 5 },
    ]);
    const [req, ctx] = makeGET("u1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchesPlayed).toBe(2);
    expect(json.points).toBe(30);
    expect(json.baskets).toBe(12);
    expect(json.fouls).toBe(3);
    expect(json.assists).toBe(4);
    expect(json.rebounds).toBe(8);
    expect(json.avgPoints).toBe(15);
  });

  it("arrotonda avgPoints a 1 decimale", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1" });
    p.playerMatchStats.findMany.mockResolvedValue([
      { points: 10, baskets: 0, fouls: 0, assists: 0, rebounds: 0 },
      { points: 10, baskets: 0, fouls: 0, assists: 0, rebounds: 0 },
      { points: 11, baskets: 0, fouls: 0, assists: 0, rebounds: 0 },
    ]);
    const [req, ctx] = makeGET("u1");
    const res = await GET(req, ctx);
    const json = await res.json();
    expect(json.avgPoints).toBe(10.3);
  });

  it("filtra per stagione quando fornita", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1" });
    p.playerMatchStats.findMany.mockResolvedValue([
      { points: 15, baskets: 6, fouls: 1, assists: 2, rebounds: 4 },
    ]);
    const [req, ctx] = makeGET("u1", "2025-26");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.season).toBe("2025-26");
    expect(json.matchesPlayed).toBe(1);
    // Verifica che il filtro stagione sia stato passato a prisma
    expect(p.playerMatchStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ match: { team: { season: "2025-26" } } }),
      })
    );
  });

  it("non filtra per stagione se il parametro è assente", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1" });
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const [req, ctx] = makeGET("u1");
    await GET(req, ctx);
    expect(p.playerMatchStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });
});
