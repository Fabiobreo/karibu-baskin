import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    competitiveTeam: {
      findUnique: vi.fn(),
    },
    opposingTeam: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/slugUtils", () => ({
  generateMatchSlug: vi.fn().mockResolvedValue("karibu-vs-avversario-2026-01-15"),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type PrismaMock = {
  match: { findMany: Mock; create: Mock };
  competitiveTeam: { findUnique: Mock };
  opposingTeam: { findUnique: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdminUser = isAdminUser as Mock;

const matchStub = {
  id: "match-1",
  teamId: "team-1",
  opponentId: "opp-1",
  date: new Date("2026-01-15T18:00:00Z"),
  isHome: true,
  ourScore: null,
  theirScore: null,
  result: null,
  team: { id: "team-1", name: "Karibu", season: "2025-26", color: "#ff6600", championship: "Serie A" },
  opponent: { id: "opp-1", name: "Avversario", city: "Milano" },
  group: null,
  _count: { playerStats: 0 },
};

function makePost(body: unknown): Request {
  return new Request("http://localhost/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.match.findMany.mockResolvedValue([matchStub]);
  });

  it("restituisce l'elenco delle partite", async () => {
    const req = new Request("http://localhost/api/matches");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(1);
    expect(p.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: "desc" } })
    );
  });

  it("filtra per teamId se fornito", async () => {
    p.match.findMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/matches?teamId=team-42");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(p.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teamId: "team-42" } })
    );
  });

  it("non filtra per teamId se non fornito", async () => {
    const req = new Request("http://localhost/api/matches");
    await GET(req);
    expect(p.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });
});

describe("POST /api/matches", () => {
  const validBody = {
    teamId: "team-1",
    opponentId: "opp-1",
    date: "2026-01-15T18:00:00Z",
    isHome: true,
    matchType: "LEAGUE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdminUser.mockResolvedValue(false);
    p.competitiveTeam.findUnique.mockResolvedValue({ name: "Karibu" });
    p.opposingTeam.findUnique.mockResolvedValue({ name: "Avversario" });
    p.match.create.mockResolvedValue({ ...matchStub });
  });

  it("restituisce 403 per utente non admin", async () => {
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
    expect(p.match.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per body non valido (teamId mancante)", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    const res = await POST(makePost({ opponentId: "opp-1", date: "2026-01-15T18:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per body non JSON valido", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("crea la partita e restituisce 201", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    expect(p.match.create).toHaveBeenCalledOnce();
    const data = p.match.create.mock.calls[0][0].data;
    expect(data.teamId).toBe("team-1");
    expect(data.opponentId).toBe("opp-1");
    expect(data.isHome).toBe(true);
  });

  it("deriva automaticamente il risultato dai punteggi (vittoria)", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    const res = await POST(makePost({ ...validBody, ourScore: 60, theirScore: 45 }));
    expect(res.status).toBe(201);
    const data = p.match.create.mock.calls[0][0].data;
    expect(data.result).toBe("WIN");
    expect(data.ourScore).toBe(60);
    expect(data.theirScore).toBe(45);
  });

  it("deriva automaticamente il risultato dai punteggi (pareggio)", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    const res = await POST(makePost({ ...validBody, ourScore: 50, theirScore: 50 }));
    expect(res.status).toBe(201);
    const data = p.match.create.mock.calls[0][0].data;
    expect(data.result).toBe("DRAW");
  });

  it("deriva automaticamente il risultato dai punteggi (sconfitta)", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    const res = await POST(makePost({ ...validBody, ourScore: 40, theirScore: 55 }));
    expect(res.status).toBe(201);
    const data = p.match.create.mock.calls[0][0].data;
    expect(data.result).toBe("LOSS");
  });

  it("restituisce 400 se il risultato esplicito non corrisponde ai punteggi", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    const res = await POST(makePost({ ...validBody, ourScore: 60, theirScore: 45, result: "LOSS" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("non corrisponde al punteggio");
  });

  it("genera lo slug dalla coppia squadra-avversario", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    await POST(makePost(validBody));
    const data = p.match.create.mock.calls[0][0].data;
    expect(data.slug).toBe("karibu-vs-avversario-2026-01-15");
  });

  it("crea la partita senza slug se team o avversario non trovati", async () => {
    mockIsAdminUser.mockResolvedValue(true);
    p.competitiveTeam.findUnique.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    const data = p.match.create.mock.calls[0][0].data;
    expect(data.slug).toBeNull();
  });
});
