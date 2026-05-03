import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    group: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  group: { findMany: Mock; create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const baseGroup = {
  id: "g-1",
  name: "Girone A",
  season: "2025-26",
  championship: null,
  teamId: "team-1",
  team: { id: "team-1", name: "Arancioni", color: "#FF6600" },
  _count: { matches: 3 },
};

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/groups");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.group.findMany.mockResolvedValue([baseGroup]);
  });

  it("restituisce la lista dei gironi", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].name).toBe("Girone A");
  });

  it("restituisce array vuoto se non ci sono gironi", async () => {
    p.group.findMany.mockResolvedValue([]);
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("filtra per season se fornita", async () => {
    await GET(makeGet({ season: "2025-26" }));
    const where = p.group.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ season: "2025-26" });
  });

  it("filtra per teamId se fornito", async () => {
    await GET(makeGet({ teamId: "team-1" }));
    const where = p.group.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ teamId: "team-1" });
  });

  it("non filtra se i parametri sono assenti", async () => {
    await GET(makeGet());
    const where = p.group.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("season");
    expect(where).not.toHaveProperty("teamId");
  });
});

describe("POST /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(false);
    p.group.create.mockResolvedValue({ ...baseGroup, id: "g-new" });
  });

  it("restituisce 403 per utente non staff", async () => {
    const res = await POST(makePost({ name: "Girone A", season: "2025-26", teamId: "team-1" }));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsCoach.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se manca il nome", async () => {
    mockIsCoach.mockResolvedValue(true);
    const res = await POST(makePost({ season: "2025-26", teamId: "team-1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("restituisce 400 per stagione in formato errato", async () => {
    mockIsCoach.mockResolvedValue(true);
    const res = await POST(makePost({ name: "Girone A", season: "2025-2026", teamId: "team-1" }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se manca teamId", async () => {
    mockIsCoach.mockResolvedValue(true);
    const res = await POST(makePost({ name: "Girone A", season: "2025-26" }));
    expect(res.status).toBe(400);
  });

  it("crea il girone e restituisce 201", async () => {
    mockIsCoach.mockResolvedValue(true);
    const res = await POST(makePost({ name: "Girone A", season: "2025-26", teamId: "team-1" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("g-new");
  });

  it("applica trim al nome e alla stagione", async () => {
    mockIsCoach.mockResolvedValue(true);
    await POST(makePost({ name: "  Girone A  ", season: "2025-26", teamId: "team-1" }));
    const data = p.group.create.mock.calls[0][0].data;
    expect(data.name).toBe("Girone A");
  });

  it("imposta championship=null se non fornito", async () => {
    mockIsCoach.mockResolvedValue(true);
    await POST(makePost({ name: "Girone A", season: "2025-26", teamId: "team-1" }));
    const data = p.group.create.mock.calls[0][0].data;
    expect(data.championship).toBeNull();
  });

  it("salva championship dopo trim se fornito", async () => {
    mockIsCoach.mockResolvedValue(true);
    await POST(
      makePost({ name: "Girone A", season: "2025-26", teamId: "team-1", championship: "  Reg. Veneto  " }),
    );
    const data = p.group.create.mock.calls[0][0].data;
    expect(data.championship).toBe("Reg. Veneto");
  });
});
