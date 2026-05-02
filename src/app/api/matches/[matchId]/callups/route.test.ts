import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    matchCallup: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    match: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { GET, PUT } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  matchCallup: { findMany: Mock; deleteMany: Mock; createMany: Mock };
  match: { findUnique: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const makeParams = (matchId: string) =>
  ({ params: Promise.resolve({ matchId }) } as { params: Promise<{ matchId: string }> });

const callup1 = {
  id: "cu-1",
  matchId: "match-1",
  userId: "user-1",
  childId: null,
  user: { id: "user-1", name: "Mario Rossi", image: null, sportRole: 3, sportRoleVariant: null, slug: "mario-rossi" },
  child: null,
};

describe("GET /api/matches/[matchId]/callups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.matchCallup.findMany.mockResolvedValue([callup1]);
  });

  it("restituisce la lista dei convocati", async () => {
    const req = new Request("http://localhost/api/matches/match-1/callups");
    const res = await GET(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].userId).toBe("user-1");
    expect(p.matchCallup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { matchId: "match-1" } })
    );
  });

  it("restituisce array vuoto se nessun convocato", async () => {
    p.matchCallup.findMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/matches/match-1/callups");
    const res = await GET(req, makeParams("match-1"));
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe("PUT /api/matches/[matchId]/callups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(false);
    p.match.findUnique.mockResolvedValue({ id: "match-1" });
    p.matchCallup.deleteMany.mockResolvedValue({ count: 0 });
    p.matchCallup.createMany.mockResolvedValue({ count: 2 });
    p.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new Request("http://localhost/api/matches/match-1/callups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: ["user-1"], childIds: [] }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per payload non valido", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/callups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: "not-an-array" }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 404 se la partita non esiste", async () => {
    mockIsCoach.mockResolvedValue(true);
    p.match.findUnique.mockResolvedValue(null);
    const req = new Request("http://localhost/api/matches/match-x/callups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: ["user-1"], childIds: [] }),
    });
    const res = await PUT(req, makeParams("match-x"));
    expect(res.status).toBe(404);
  });

  it("sostituisce i convocati e restituisce 200 con totale corretto", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/callups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: ["user-1", "user-2"], childIds: ["child-1"] }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.total).toBe(3);
    expect(p.$transaction).toHaveBeenCalledOnce();
  });

  it("accetta lista vuota (rimuove tutti i convocati)", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/callups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [], childIds: [] }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(0);
  });
});
