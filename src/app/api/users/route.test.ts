import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type PrismaMock = {
  user: { findMany: Mock; count: Mock; findUnique: Mock; create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;

const baseUser = {
  id: "user-1",
  name: "Mario Rossi",
  email: "mario@example.com",
  image: null,
  appRole: "ATHLETE",
  sportRole: 2,
  sportRoleVariant: null,
  sportRoleSuggested: null,
  sportRoleSuggestedVariant: null,
  gender: "MALE",
  birthDate: null,
  createdAt: new Date("2025-01-01"),
  _count: { registrations: 3 },
  sportRoleHistory: [],
};

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/users");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(true);
    p.user.findMany.mockResolvedValue([baseUser]);
    p.user.count.mockResolvedValue(1);
  });

  it("restituisce 403 se l'utente non è admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
    expect(p.user.findMany).not.toHaveBeenCalled();
  });

  it("restituisce risposta paginata anche senza limit esplicito (clamp a 1)", async () => {
    p.user.count.mockResolvedValue(5);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // limit omesso → Math.max(1, parseInt("0")) = 1 → sempre paginato
    expect(json).toHaveProperty("users");
    expect(json).toHaveProperty("limit", 1);
    expect(p.user.count).toHaveBeenCalledOnce();
  });

  it("restituisce risposta paginata quando limit > 0", async () => {
    p.user.count.mockResolvedValue(30);
    const res = await GET(makeGet({ limit: "10", page: "2" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("users");
    expect(json).toHaveProperty("total", 30);
    expect(json).toHaveProperty("page", 2);
    expect(json).toHaveProperty("limit", 10);
    expect(json).toHaveProperty("pages", 3);
    expect(p.user.count).toHaveBeenCalledOnce();
  });

  it("applica skip corretto nella paginazione (page 3, limit 10 → skip 20)", async () => {
    p.user.count.mockResolvedValue(50);
    await GET(makeGet({ limit: "10", page: "3" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.skip).toBe(20);
    expect(call.take).toBe(10);
  });

  it("clamp limit a massimo 100", async () => {
    p.user.count.mockResolvedValue(999);
    await GET(makeGet({ limit: "999" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.take).toBe(100);
  });

  it("clamp page a minimo 1 con valori non validi", async () => {
    p.user.count.mockResolvedValue(10);
    await GET(makeGet({ limit: "5", page: "-3" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.skip).toBe(0);
  });

  it("applica filtro search su nome e email", async () => {
    await GET(makeGet({ search: "mario" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { name: { contains: "mario", mode: "insensitive" } },
      { email: { contains: "mario", mode: "insensitive" } },
    ]);
  });

  it("applica filtro appRole valido", async () => {
    await GET(makeGet({ appRole: "COACH" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.appRole).toBe("COACH");
  });

  it("ignora appRole non valido", async () => {
    await GET(makeGet({ appRole: "SUPERUSER" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.appRole).toBeUndefined();
  });

  it("filtra sportRole=none come null", async () => {
    await GET(makeGet({ sportRole: "none" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.sportRole).toBeNull();
  });

  it("filtra sportRole numerico", async () => {
    await GET(makeGet({ sportRole: "3" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.sportRole).toBe(3);
  });

  it("filtra gender=none come null", async () => {
    await GET(makeGet({ gender: "none" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.gender).toBeNull();
  });

  it("filtra gender valido (FEMALE)", async () => {
    await GET(makeGet({ gender: "FEMALE" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.gender).toBe("FEMALE");
  });

  it("ignora gender non valido", async () => {
    await GET(makeGet({ gender: "X" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.where.gender).toBeUndefined();
  });

  it("ordina per nome con sortBy=name", async () => {
    await GET(makeGet({ sortBy: "name", sortDir: "asc" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ name: "asc" });
  });

  it("ordina per sportRole con sortBy=sportRole", async () => {
    await GET(makeGet({ sortBy: "sportRole", sortDir: "desc" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ sportRole: "desc" });
  });

  it("ordina per appRole con sortBy=appRole", async () => {
    await GET(makeGet({ sortBy: "appRole" }));
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ appRole: "desc" });
  });

  it("ordina per createdAt di default", async () => {
    await GET(makeGet());
    const call = p.user.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });
});

describe("POST /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(true);
    p.user.findUnique.mockResolvedValue(null);
    p.user.create.mockResolvedValue({
      id: "user-new",
      email: "nuovo@example.com",
      name: "Nuovo Utente",
      appRole: "GUEST",
    });
  });

  it("restituisce 401 se l'utente non è admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(makePost({ email: "test@example.com" }));
    expect(res.status).toBe(401);
    expect(p.user.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 se manca l'email", async () => {
    const res = await POST(makePost({ name: "Solo Nome" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
    expect(p.user.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per email con formato non valido", async () => {
    const res = await POST(makePost({ email: "non-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
    expect(p.user.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per appRole non valido", async () => {
    const res = await POST(makePost({ email: "ok@example.com", appRole: "SUPERADMIN" }));
    expect(res.status).toBe(400);
    expect(p.user.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per gender non valido", async () => {
    const res = await POST(makePost({ email: "ok@example.com", gender: "NONBINARY" }));
    expect(res.status).toBe(400);
    expect(p.user.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per sportRole fuori range", async () => {
    const res = await POST(makePost({ email: "ok@example.com", sportRole: 9 }));
    expect(res.status).toBe(400);
    expect(p.user.create).not.toHaveBeenCalled();
  });

  it("restituisce 409 se email già registrata", async () => {
    p.user.findUnique.mockResolvedValue({ id: "existing", email: "esiste@example.com" });
    const res = await POST(makePost({ email: "esiste@example.com" }));
    expect(res.status).toBe(409);
    expect(p.user.create).not.toHaveBeenCalled();
  });

  it("crea l'utente e restituisce 201", async () => {
    const res = await POST(makePost({ email: "nuovo@example.com", name: "Nuovo Utente" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("user-new");
    expect(p.user.create).toHaveBeenCalledOnce();
  });

  it("normalizza l'email in lowercase prima del salvataggio", async () => {
    await POST(makePost({ email: "MAIUSCOLA@EXAMPLE.COM" }));
    const call = p.user.findUnique.mock.calls[0][0];
    expect(call.where.email).toBe("maiuscola@example.com");
    const createData = p.user.create.mock.calls[0][0].data;
    expect(createData.email).toBe("maiuscola@example.com");
  });

  it("imposta appRole GUEST di default se non specificato", async () => {
    await POST(makePost({ email: "nuovo@example.com" }));
    const createData = p.user.create.mock.calls[0][0].data;
    expect(createData.appRole).toBe("GUEST");
  });

  it("crea utente con tutti i campi opzionali", async () => {
    await POST(makePost({
      email: "completo@example.com",
      name: "Completo",
      appRole: "ATHLETE",
      sportRole: 3,
      gender: "MALE",
      birthDate: "2005-06-15",
    }));
    const data = p.user.create.mock.calls[0][0].data;
    expect(data.appRole).toBe("ATHLETE");
    expect(data.sportRole).toBe(3);
    expect(data.gender).toBe("MALE");
    expect(data.birthDate).toBeInstanceOf(Date);
  });

  it("trim del nome prima del salvataggio", async () => {
    await POST(makePost({ email: "ok@example.com", name: "  Spazi  " }));
    const data = p.user.create.mock.calls[0][0].data;
    expect(data.name).toBe("Spazi");
  });
});
