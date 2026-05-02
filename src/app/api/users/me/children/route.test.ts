import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    child: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/schemas/child", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/schemas/child")>();
  return actual;
});

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = { child: { findMany: Mock; create: Mock } };
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const baseChild = {
  id: "child-1",
  parentId: "user-1",
  name: "Luca Rossi",
  sportRole: 3,
  sportRoleVariant: null,
  gender: "MALE",
  birthDate: null,
  createdAt: new Date("2025-01-01"),
  teamMemberships: [],
};

describe("GET /api/users/me/children", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.child.findMany.mockResolvedValue([baseChild]);
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("restituisce array vuoto se nessun figlio", async () => {
    p.child.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("restituisce figli con teamMemberships formattati", async () => {
    p.child.findMany.mockResolvedValue([
      {
        ...baseChild,
        teamMemberships: [
          {
            teamId: "team-1",
            team: { name: "Arancioni", color: "#FF6600", season: "2025-26" },
          },
        ],
      },
    ]);
    const res = await GET();
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].teamMemberships).toEqual([
      {
        teamId: "team-1",
        teamName: "Arancioni",
        teamColor: "#FF6600",
        teamSeason: "2025-26",
      },
    ]);
    expect(json[0].name).toBe("Luca Rossi");
  });

  it("usa il parentId dall'utente in sessione nella query", async () => {
    await GET();
    expect(p.child.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: "user-1" } })
    );
  });
});

describe("POST /api/users/me/children", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.child.create.mockResolvedValue({ ...baseChild, id: "child-new" });
  });

  const makeRequest = (body: unknown) =>
    new NextRequest("http://localhost/api/users/me/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const req = makeRequest({ name: "Figlio" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(p.child.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per body non JSON valido", async () => {
    const req = new NextRequest("http://localhost/api/users/me/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se nome mancante", async () => {
    const req = makeRequest({ sportRole: 2 });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("restituisce 400 se nome è stringa vuota", async () => {
    const req = makeRequest({ name: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("obbligatorio");
  });

  it("restituisce 400 se gender non è valido", async () => {
    const req = makeRequest({ name: "Figlio", gender: "OTHER" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("crea il figlio e restituisce 201", async () => {
    const req = makeRequest({ name: "  Luca  ", sportRole: 2, gender: "MALE" });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const call = p.child.create.mock.calls[0][0].data;
    expect(call.name).toBe("Luca");
    expect(call.parentId).toBe("user-1");
    expect(call.sportRole).toBe(2);
    expect(call.gender).toBe("MALE");
  });

  it("imposta sportRole e birthDate a null se non forniti", async () => {
    const req = makeRequest({ name: "Figlio" });
    await POST(req);
    const call = p.child.create.mock.calls[0][0].data;
    expect(call.sportRole).toBeNull();
    expect(call.birthDate).toBeNull();
  });

  it("converte birthDate in oggetto Date", async () => {
    const req = makeRequest({ name: "Figlio", birthDate: "2015-06-15" });
    await POST(req);
    const call = p.child.create.mock.calls[0][0].data;
    expect(call.birthDate).toBeInstanceOf(Date);
  });
});
