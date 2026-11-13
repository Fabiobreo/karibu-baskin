import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findUnique: vi.fn() },
    matchPrediction: { findUnique: vi.fn(), upsert: vi.fn(), groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn(),
}));

const SETTINGS_ON = { quiz: "OFF", prediction: "MEMBERS", simulator: "MEMBERS" };
vi.mock("@/lib/games/loadGameSettings", () => ({ loadGameSettings: vi.fn() }));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("1.2.3.4"),
}));

import { GET, PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { loadGameSettings } from "@/lib/games/loadGameSettings";

type PrismaMock = {
  match: { findUnique: Mock };
  matchPrediction: { findUnique: Mock; upsert: Mock; groupBy: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const HOUR = 60 * 60 * 1000;
const upcoming = {
  id: "m-1",
  date: new Date(Date.now() + 24 * HOUR),
  opponentId: "opp-1",
  opponentTeamId: null,
};
const started = { ...upcoming, date: new Date(Date.now() - HOUR) };
const ctx = { params: Promise.resolve({ matchId: "m-1" }) };

const put = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/matches/m-1/prediction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx
  );
const get = () => GET(new NextRequest("http://localhost/api/matches/m-1/prediction"), ctx);

describe("/api/matches/[matchId]/prediction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "u-1", appRole: "ATHLETE" } });
    (loadGameSettings as Mock).mockResolvedValue(SETTINGS_ON);
    p.match.findUnique.mockResolvedValue(upcoming);
    p.matchPrediction.findUnique.mockResolvedValue(null);
    p.matchPrediction.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        outcome: create.outcome,
        ourScore: create.ourScore,
        theirScore: create.theirScore,
      })
    );
    p.matchPrediction.groupBy.mockResolvedValue([
      { outcome: "WIN", _count: { _all: 3 } },
      { outcome: "LOSS", _count: { _all: 1 } },
    ]);
  });

  it("401 senza accesso e 403 per un ospite", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await put({ outcome: "WIN" })).status).toBe(401);
    mockAuth.mockResolvedValue({ user: { id: "g-1", appRole: "GUEST" } });
    expect((await put({ outcome: "WIN" })).status).toBe(403);
    expect((await get()).status).toBe(403);
  });

  it("spento dall'admin risponde 404, tranne allo staff (UX-66)", async () => {
    (loadGameSettings as Mock).mockResolvedValue({ ...SETTINGS_ON, prediction: "OFF" });
    expect((await get()).status).toBe(404);
    expect((await put({ outcome: "WIN" })).status).toBe(404);
    expect(p.matchPrediction.upsert).not.toHaveBeenCalled();
    mockAuth.mockResolvedValue({ user: { id: "c-1", appRole: "COACH" } });
    expect((await get()).status).toBe(200);
  });

  it("salva il pronostico prima dell'inizio", async () => {
    const res = await put({ outcome: "WIN", ourScore: 40, theirScore: 30 });
    expect(res.status).toBe(200);
    expect(p.matchPrediction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId_userId: { matchId: "m-1", userId: "u-1" } },
        create: { matchId: "m-1", userId: "u-1", outcome: "WIN", ourScore: 40, theirScore: 30 },
      })
    );
  });

  it("409 dopo l'inizio, nelle amichevoli interne e prima dell'apertura", async () => {
    p.match.findUnique.mockResolvedValue(started);
    expect((await put({ outcome: "WIN" })).status).toBe(409);
    p.match.findUnique.mockResolvedValue({ ...upcoming, opponentId: null, opponentTeamId: "t-2" });
    expect((await put({ outcome: "WIN" })).status).toBe(409);
    p.match.findUnique.mockResolvedValue({
      ...upcoming,
      date: new Date(Date.now() + 5 * 24 * HOUR),
    });
    expect((await put({ outcome: "WIN" })).status).toBe(409);
    expect(p.matchPrediction.upsert).not.toHaveBeenCalled();
  });

  it("400 con un punteggio che dice un altro risultato", async () => {
    expect((await put({ outcome: "WIN", ourScore: 20, theirScore: 30 })).status).toBe(400);
  });

  it("prima dell'inizio i totali non ci sono", async () => {
    const body = await (await get()).json();
    expect(body.totals).toBeNull();
    expect(p.matchPrediction.groupBy).not.toHaveBeenCalled();
  });

  it("dopo l'inizio dà i totali, senza nomi", async () => {
    p.match.findUnique.mockResolvedValue(started);
    const body = await (await get()).json();
    expect(body.totals).toEqual({ total: 4, WIN: 3, DRAW: 0, LOSS: 1 });
    expect(JSON.stringify(body)).not.toContain("userId");
  });
});
