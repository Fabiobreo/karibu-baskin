import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    competitiveTeam: { findUnique: vi.fn() },
    opposingTeam: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/webpush", () => ({
  sendPushToAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/slugUtils", () => ({
  generateMatchSlug: vi.fn().mockResolvedValue("karibu-a-vs-avversari-2025-06-01"),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { GET, PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { sendPushToAll } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";

type PrismaMock = {
  match: { findUnique: Mock; update: Mock; delete: Mock };
  competitiveTeam: { findUnique: Mock };
  opposingTeam: { findUnique: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;
const mockSendPush = sendPushToAll as Mock;
const mockCreateNotif = createAppNotification as Mock;

const baseMatch = {
  id: "match-1",
  slug: "karibu-a-vs-avversari-2025-06-01",
  date: new Date("2025-06-01T15:00:00Z"),
  isHome: true,
  venue: null,
  matchType: "CAMPIONATO",
  ourScore: null,
  theirScore: null,
  result: null,
  notes: null,
  matchday: null,
  groupId: null,
  teamId: "team-1",
  opponentId: "opp-1",
  createdAt: new Date(),
  team: { id: "team-1", name: "Karibu A", season: "2025-26", color: "#FF6600", championship: null },
  opponent: { id: "opp-1", name: "Avversari FC", city: "Vicenza" },
  group: null,
};

const fullMatch = {
  ...baseMatch,
  playerStats: [],
};

function makeParams(matchId: string) {
  return { params: Promise.resolve({ matchId }) };
}

describe("GET /api/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.match.findUnique.mockResolvedValue({ ...fullMatch });
  });

  it("restituisce la partita con playerStats", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("match-1");
    expect(Array.isArray(json.playerStats)).toBe(true);
  });

  it("restituisce 404 se la partita non esiste", async () => {
    p.match.findUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("missing"));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    // previous match state
    p.match.findUnique.mockResolvedValue({
      result: null,
      ourScore: null,
      theirScore: null,
      slug: baseMatch.slug,
      teamId: "team-1",
      opponentId: "opp-1",
      date: baseMatch.date,
    });
    p.match.update.mockResolvedValue({ ...baseMatch });
    p.competitiveTeam.findUnique.mockResolvedValue({ name: "Karibu A" });
    p.opposingTeam.findUnique.mockResolvedValue({ name: "Avversari FC" });
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHome: false }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per body non valido (JSON malformato)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(400);
  });

  it("aggiorna la partita e restituisce 200", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.match.update.mockResolvedValue({ ...baseMatch, isHome: false });
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHome: false }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
  });

  it("deriva automaticamente il risultato WIN dai punteggi", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.match.update.mockResolvedValue({
      ...baseMatch,
      ourScore: 45,
      theirScore: 30,
      result: "WIN",
      team: baseMatch.team,
      opponent: baseMatch.opponent,
      group: null,
    });
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ourScore: 45, theirScore: 30 }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const updateCall = p.match.update.mock.calls[0][0];
    expect(updateCall.data.result).toBe("WIN");
  });

  it("deriva LOSS quando theirScore > ourScore", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.match.update.mockResolvedValue({ ...baseMatch, ourScore: 20, theirScore: 50, result: "LOSS", team: baseMatch.team, opponent: baseMatch.opponent, group: null });
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ourScore: 20, theirScore: 50 }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const updateCall = p.match.update.mock.calls[0][0];
    expect(updateCall.data.result).toBe("LOSS");
  });

  it("restituisce 400 se il risultato esplicito è incongruente con i punteggi", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ourScore: 45, theirScore: 30, result: "LOSS" }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("non corrisponde");
  });

  it("invia push notification quando il risultato viene impostato per la prima volta", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.match.update.mockResolvedValue({
      ...baseMatch,
      ourScore: 45,
      theirScore: 30,
      result: "WIN",
      team: baseMatch.team,
      opponent: baseMatch.opponent,
      group: null,
    });
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ourScore: 45, theirScore: 30 }),
    });
    await PUT(req, makeParams("match-1"));
    // Give microtasks a tick to settle (fire-and-forget .catch())
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendPush).toHaveBeenCalledOnce();
    expect(mockCreateNotif).toHaveBeenCalledOnce();
    const pushArgs = mockSendPush.mock.calls[0];
    expect(pushArgs[0].type).toBe("MATCH_RESULT");
  });

  it("restituisce 404 se la partita non esiste (P2025 via findUnique null)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.match.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHome: false }),
    });
    const res = await PUT(req, makeParams("missing"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("non trovata");
    expect(p.match.update).not.toHaveBeenCalled();
  });

  it("non invia push se il risultato era già impostato", async () => {
    mockIsAdmin.mockResolvedValue(true);
    p.match.findUnique.mockResolvedValue({
      result: "WIN",
      ourScore: 40,
      theirScore: 30,
      slug: baseMatch.slug,
      teamId: "team-1",
      opponentId: "opp-1",
      date: baseMatch.date,
    });
    p.match.update.mockResolvedValue({ ...baseMatch, ourScore: 41, theirScore: 30, result: "WIN", team: baseMatch.team, opponent: baseMatch.opponent, group: null });
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ourScore: 41 }),
    });
    await PUT(req, makeParams("match-1"));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.match.delete.mockResolvedValue(undefined);
  });

  it("restituisce 403 per utente non admin", async () => {
    const res = await DELETE(new Request("http://localhost"), makeParams("match-1"));
    expect(res.status).toBe(403);
  });

  it("elimina la partita e restituisce 204", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await DELETE(new Request("http://localhost"), makeParams("match-1"));
    expect(res.status).toBe(204);
    expect(p.match.delete).toHaveBeenCalledWith({ where: { id: "match-1" } });
  });

  it("restituisce 404 se la partita non esiste (P2025)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const p2025 = new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "6.0.0" });
    p.match.delete.mockRejectedValue(p2025);
    const res = await DELETE(new Request("http://localhost"), makeParams("missing"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("non trovata");
  });
});
