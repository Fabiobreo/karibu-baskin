import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    playerMatchStats: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    match: {
      findUnique: vi.fn().mockResolvedValue({ teamId: "team-1", team: { season: "2025-26" } }),
    },
    teamMembership: {
      findMany: vi.fn().mockResolvedValue([{ userId: "user-1", childId: null }]),
    },
  },
}));

vi.mock("@/lib/webpush", () => ({ sendPushToAll: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
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

import { GET, PUT } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type PrismaMock = {
  playerMatchStats: { findMany: Mock; upsert: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;

const makeParams = (matchId: string) =>
  ({ params: Promise.resolve({ matchId }) }) as { params: Promise<{ matchId: string }> };

const stat1 = {
  id: "stat-1",
  matchId: "match-1",
  userId: "user-1",
  childId: null,
  points: 10,
  twoPointers: 2,
  threePointers: 2,
  freeThrows: 0,
  fouls: 2,
  illegalFouls: 0,
  shotsAttempted: 0,
  notes: null,
  user: { id: "user-1", name: "Mario Rossi", image: null, sportRole: 3, sportRoleVariant: null },
  child: null,
};

describe("GET /api/matches/[matchId]/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.playerMatchStats.findMany.mockResolvedValue([stat1]);
  });

  it("restituisce le statistiche per la partita", async () => {
    const req = new Request("http://localhost/api/matches/match-1/stats");
    const res = await GET(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].points).toBe(10);
    expect(p.playerMatchStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { matchId: "match-1" } })
    );
  });

  it("restituisce array vuoto se nessuna statistica", async () => {
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/matches/match-1/stats");
    const res = await GET(req, makeParams("match-1"));
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe("PUT /api/matches/[matchId]/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.playerMatchStats.upsert.mockResolvedValue(stat1);
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ userId: "user-1", twoPointers: 3 }]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per payload non valido (non array)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-1" }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "BAD_JSON",
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(400);
  });

  it("calcola points dai tiri e fa upsert per userId", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          userId: "user-1",
          twoPointers: 3,
          threePointers: 2,
          freeThrows: 1,
          fouls: 2,
          illegalFouls: 0,
          shotsAttempted: 0,
        },
      ]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.where).toHaveProperty("matchId_userId");
    // 3*2 + 2*3 + 1 = 13
    expect(upsertCall.create.points).toBe(13);
    expect(upsertCall.create.twoPointers).toBe(3);
    expect(upsertCall.create.threePointers).toBe(2);
    expect(upsertCall.create.freeThrows).toBe(1);
  });

  it("esegue upsert per childId", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const childStat = { ...stat1, userId: null, childId: "child-1" };
    p.playerMatchStats.upsert.mockResolvedValue(childStat);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ childId: "child-1", twoPointers: 2, freeThrows: 1 }]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.where).toHaveProperty("matchId_childId");
    expect(upsertCall.create.childId).toBe("child-1");
    expect(upsertCall.create.points).toBe(5); // 2*2 + 1
  });

  it("usa 0 come default per campi numerici non forniti", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ userId: "user-1" }]),
    });
    await PUT(req, makeParams("match-1"));
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.create.points).toBe(0);
    expect(upsertCall.create.twoPointers).toBe(0);
    expect(upsertCall.create.threePointers).toBe(0);
    expect(upsertCall.create.freeThrows).toBe(0);
    expect(upsertCall.create.fouls).toBe(0);
    expect(upsertCall.create.illegalFouls).toBe(0);
    expect(upsertCall.create.shotsAttempted).toBe(0);
  });

  it("trimma le note e le imposta a null se stringa vuota", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ userId: "user-1", notes: "  " }]),
    });
    await PUT(req, makeParams("match-1"));
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.create.notes).toBeNull();
  });

  it("accetta array vuoto e restituisce array vuoto", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
    expect(p.playerMatchStats.upsert).not.toHaveBeenCalled();
  });
});
