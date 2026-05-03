import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    group: { findUnique: vi.fn() },
    groupMatch: { create: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  group: { findUnique: Mock };
  groupMatch: { create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const makeParams = (groupId: string) =>
  ({ params: Promise.resolve({ groupId }) } as { params: Promise<{ groupId: string }> });

const baseMatch = {
  id: "gm-1",
  groupId: "g-1",
  matchday: 1,
  date: null,
  homeTeamId: "opp-1",
  awayTeamId: "opp-2",
  homeScore: null,
  awayScore: null,
  homeTeam: { id: "opp-1", name: "Falchi", slug: "falchi" },
  awayTeam: { id: "opp-2", name: "Aquile", slug: "aquile" },
};

function makePost(groupId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/groups/${groupId}/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/groups/[groupId]/matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(false);
    p.group.findUnique.mockResolvedValue({ id: "g-1" });
    p.groupMatch.create.mockResolvedValue(baseMatch);
  });

  it("restituisce 403 per utente non staff", async () => {
    const res = await POST(
      makePost("g-1", { homeTeamId: "opp-1", awayTeamId: "opp-2" }),
      makeParams("g-1"),
    );
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups/g-1/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req, makeParams("g-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se homeTeamId mancante", async () => {
    mockIsCoach.mockResolvedValue(true);
    const res = await POST(makePost("g-1", { awayTeamId: "opp-2" }), makeParams("g-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se homeTeamId === awayTeamId", async () => {
    mockIsCoach.mockResolvedValue(true);
    const res = await POST(
      makePost("g-1", { homeTeamId: "opp-1", awayTeamId: "opp-1" }),
      makeParams("g-1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("diverse");
  });

  it("restituisce 404 se il girone non esiste", async () => {
    mockIsCoach.mockResolvedValue(true);
    p.group.findUnique.mockResolvedValue(null);
    const res = await POST(
      makePost("nonexistent", { homeTeamId: "opp-1", awayTeamId: "opp-2" }),
      makeParams("nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  it("crea la partita e restituisce 201", async () => {
    mockIsCoach.mockResolvedValue(true);
    const res = await POST(
      makePost("g-1", { homeTeamId: "opp-1", awayTeamId: "opp-2", matchday: 1 }),
      makeParams("g-1"),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("gm-1");
  });

  it("passa il groupId corretto al DB", async () => {
    mockIsCoach.mockResolvedValue(true);
    await POST(
      makePost("g-1", { homeTeamId: "opp-1", awayTeamId: "opp-2" }),
      makeParams("g-1"),
    );
    const data = p.groupMatch.create.mock.calls[0][0].data;
    expect(data.groupId).toBe("g-1");
  });

  it("converte la stringa data in oggetto Date", async () => {
    mockIsCoach.mockResolvedValue(true);
    await POST(
      makePost("g-1", { homeTeamId: "opp-1", awayTeamId: "opp-2", date: "2025-11-10T18:00" }),
      makeParams("g-1"),
    );
    const data = p.groupMatch.create.mock.calls[0][0].data;
    expect(data.date).toBeInstanceOf(Date);
  });

  it("imposta null per homeScore e awayScore se non forniti", async () => {
    mockIsCoach.mockResolvedValue(true);
    await POST(
      makePost("g-1", { homeTeamId: "opp-1", awayTeamId: "opp-2" }),
      makeParams("g-1"),
    );
    const data = p.groupMatch.create.mock.calls[0][0].data;
    expect(data.homeScore).toBeNull();
    expect(data.awayScore).toBeNull();
  });
});
