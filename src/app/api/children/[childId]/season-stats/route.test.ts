import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    child: { findUnique: vi.fn() },
    playerMatchStats: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  // Tesserato per default: i casi dei non tesserati lo dicono esplicitamente.
  isMember: vi.fn().mockResolvedValue(true),
}));

import { GET } from "./route";
import { isMember } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";

type PrismaMock = {
  child: { findUnique: Mock };
  playerMatchStats: { findMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsMember = isMember as Mock;

function makeGET(
  childId: string,
  season?: string
): [NextRequest, { params: Promise<{ childId: string }> }] {
  const url = season
    ? `http://localhost/api/children/${childId}/season-stats?season=${season}`
    : `http://localhost/api/children/${childId}/season-stats`;
  return [new NextRequest(url), { params: Promise.resolve({ childId }) }];
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
      {
        points: 8,
        twoPointers: 2,
        threePointers: 1,
        freeThrows: 1,
        fouls: 3,
        illegalFouls: 0,
        shotsAttempted: 0,
      },
      {
        points: 12,
        twoPointers: 3,
        threePointers: 2,
        freeThrows: 0,
        fouls: 1,
        illegalFouls: 1,
        shotsAttempted: 0,
      },
      {
        points: 4,
        twoPointers: 1,
        threePointers: 0,
        freeThrows: 2,
        fouls: 2,
        illegalFouls: 0,
        shotsAttempted: 0,
      },
    ]);
    const [req, ctx] = makeGET("c1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchesPlayed).toBe(3);
    expect(json.points).toBe(24);
    expect(json.twoPointers).toBe(6);
    expect(json.threePointers).toBe(3);
    expect(json.freeThrows).toBe(3);
    expect(json.baskets).toBe(12); // 6+3+3
    expect(json.fouls).toBe(6);
    expect(json.illegalFouls).toBe(1);
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

  it("un figlio senza data di nascita è minore: 404 per chi non è tesserato", async () => {
    mockIsMember.mockResolvedValueOnce(false);
    p.child.findUnique.mockResolvedValue({ id: "c1", birthDate: null });
    const res = await GET(...makeGET("c1"));
    expect(res.status).toBe(404);
    expect(p.playerMatchStats.findMany).not.toHaveBeenCalled();
  });

  it("un figlio maggiorenne resta visibile a chi non è tesserato", async () => {
    mockIsMember.mockResolvedValueOnce(false);
    p.child.findUnique.mockResolvedValue({ id: "c1", birthDate: new Date("1990-01-01") });
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const res = await GET(...makeGET("c1"));
    expect(res.status).toBe(200);
  });
});
