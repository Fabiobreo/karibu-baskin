import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/webpush", () => ({
  sendPushToAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 59 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { createAppNotification } from "@/lib/appNotifications";
import { checkRateLimit } from "@/lib/rateLimit";
import { Prisma } from "@prisma/client";

type PrismaMock = {
  trainingSession: {
    findMany: Mock;
    count: Mock;
    create: Mock;
  };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

const baseSession = {
  id: "sess-1",
  title: "Allenamento Test",
  date: new Date("2025-06-01T18:00:00Z"),
  endTime: new Date("2025-06-01T20:00:00Z"),
  dateSlug: "2025-06-01",
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
  teams: null,
  _count: { registrations: 5 },
  restrictTeam: null,
};

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/sessions");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.trainingSession.findMany.mockResolvedValue([baseSession]);
    p.trainingSession.count.mockResolvedValue(1);
  });

  it("restituisce la lista di allenamenti senza paginazione", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("sess-1");
    expect(p.trainingSession.count).not.toHaveBeenCalled();
  });

  it("filtra gli allenamenti futuri con upcoming=true", async () => {
    const res = await GET(makeGet({ upcoming: "true" }));
    expect(res.status).toBe(200);
    const call = p.trainingSession.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ date: { gte: expect.any(Date) } });
    expect(call.orderBy).toEqual({ date: "asc" });
  });

  it("restituisce tutti gli allenamenti ordinati per data decrescente senza upcoming", async () => {
    await GET(makeGet());
    const call = p.trainingSession.findMany.mock.calls[0][0];
    expect(call.where).toBeUndefined();
    expect(call.orderBy).toEqual({ date: "desc" });
  });

  it("restituisce risposta paginata con limit e page", async () => {
    p.trainingSession.findMany.mockResolvedValue([baseSession]);
    p.trainingSession.count.mockResolvedValue(15);
    const res = await GET(makeGet({ limit: "5", page: "2" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("sessions");
    expect(json).toHaveProperty("total", 15);
    expect(json).toHaveProperty("page", 2);
    expect(json).toHaveProperty("limit", 5);
    expect(json).toHaveProperty("pages", 3);
    expect(p.trainingSession.count).toHaveBeenCalledOnce();
  });

  it("applica skip corretto nella paginazione (page 3, limit 10 → skip 20)", async () => {
    p.trainingSession.count.mockResolvedValue(50);
    await GET(makeGet({ limit: "10", page: "3" }));
    const call = p.trainingSession.findMany.mock.calls[0][0];
    expect(call.skip).toBe(20);
    expect(call.take).toBe(10);
  });

  it("clamp limit a massimo 100", async () => {
    p.trainingSession.count.mockResolvedValue(500);
    await GET(makeGet({ limit: "999" }));
    const call = p.trainingSession.findMany.mock.calls[0][0];
    expect(call.take).toBe(100);
  });

  it("clamp page a minimo 1 con valori non validi", async () => {
    p.trainingSession.count.mockResolvedValue(10);
    await GET(makeGet({ limit: "5", page: "-5" }));
    const call = p.trainingSession.findMany.mock.calls[0][0];
    expect(call.skip).toBe(0);
  });

  it("restituisce 429 quando il rate limit è superato", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockReturnValueOnce({ allowed: false, remaining: 0 });
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    expect(p.trainingSession.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.trainingSession.create.mockResolvedValue({
      ...baseSession,
      _count: { registrations: 0 },
    });
  });

  it("restituisce 401 se l'utente non è coach/admin", async () => {
    const res = await POST(
      makePost({ title: "Allenamento", date: "2025-06-01T18:00:00Z" }),
    );
    expect(res.status).toBe(401);
    expect(p.trainingSession.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per body non JSON valido", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se manca il titolo", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await POST(makePost({ date: "2025-06-01T18:00:00Z" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("restituisce 400 se manca la data", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await POST(makePost({ title: "Allenamento" }));
    expect(res.status).toBe(400);
  });

  it("crea l'allenamento e restituisce 201", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await POST(
      makePost({ title: "Allenamento Giovedì", date: "2025-06-05T18:00:00Z" }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("sess-1");
    expect(p.trainingSession.create).toHaveBeenCalledOnce();
  });

  it("passa il titolo trimmed al DB", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await POST(
      makePost({ title: "  Allenamento  ", date: "2025-06-05T18:00:00Z" }),
    );
    const data = p.trainingSession.create.mock.calls[0][0].data;
    expect(data.title).toBe("Allenamento");
  });

  it("crea l'allenamento con allowedRoles e restrictTeamId opzionali", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await POST(
      makePost({
        title: "Allenamento",
        date: "2025-06-05T18:00:00Z",
        allowedRoles: [1, 2],
        restrictTeamId: "team-abc",
        openRoles: [1],
      }),
    );
    const data = p.trainingSession.create.mock.calls[0][0].data;
    expect(data.allowedRoles).toEqual([1, 2]);
    expect(data.restrictTeamId).toBe("team-abc");
    expect(data.openRoles).toEqual([1]);
  });

  it("le notifiche push sono fire-and-forget (non bloccano la risposta)", async () => {
    const { sendPushToAll } = await import("@/lib/webpush");
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await POST(
      makePost({ title: "Allenamento", date: "2025-06-05T18:00:00Z" }),
    );
    expect(res.status).toBe(201);
    expect(sendPushToAll).toHaveBeenCalledOnce();
    expect(createAppNotification).toHaveBeenCalledOnce();
  });

  it("restituisce 409 se esiste già un allenamento nella stessa data (P2002)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.trainingSession.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      }),
    );
    const res = await POST(
      makePost({ title: "Allenamento Duplicato", date: "2025-06-01T18:00:00Z" }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/allenamento/i);
  });
});
