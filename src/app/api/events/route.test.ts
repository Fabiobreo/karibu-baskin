import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 29 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit } from "@/lib/rateLimit";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/events");
}

type PrismaMock = { event: { findMany: Mock; create: Mock } };
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

const baseEvent = {
  id: "evt-1",
  title: "Torneo Estivo",
  date: new Date("2025-07-10T09:00:00Z"),
  endDate: null,
  location: "Palazzetto",
  description: null,
};

describe("GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.event.findMany.mockResolvedValue([baseEvent]);
  });

  it("restituisce la lista degli eventi ordinata per data", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].title).toBe("Torneo Estivo");
    expect(p.event.findMany).toHaveBeenCalledWith({ orderBy: { date: "asc" } });
  });

  it("restituisce array vuoto se non ci sono eventi", async () => {
    p.event.findMany.mockResolvedValue([]);
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("restituisce 429 quando il rate limit è superato", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockReturnValueOnce({ allowed: false, remaining: 0 });
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    expect(p.event.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.event.create.mockResolvedValue({ ...baseEvent, id: "evt-new" });
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", date: "2025-07-10" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(p.event.create).not.toHaveBeenCalled();
  });

  it("restituisce 400 per body senza titolo", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2025-07-10" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 con messaggio 'Titolo obbligatorio' per titolo stringa vuota", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", date: "2025-07-10" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Titolo");
  });

  it("restituisce 400 per body non JSON valido", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("crea l'evento e restituisce 201", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "  Torneo  ", date: "2025-07-10", location: "  Palazzetto  " }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const call = p.event.create.mock.calls[0][0].data;
    expect(call.title).toBe("Torneo");
    expect(call.location).toBe("Palazzetto");
  });

  it("salva endDate e description se forniti", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Trasferta",
        date: "2025-08-01",
        endDate: "2025-08-03",
        description: "Tre giorni di gare",
      }),
    });
    await POST(req);
    const call = p.event.create.mock.calls[0][0].data;
    expect(call.endDate).toEqual(new Date("2025-08-03"));
    expect(call.description).toBe("Tre giorni di gare");
  });

  it("imposta endDate a null se non fornita", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Evento", date: "2025-07-10" }),
    });
    await POST(req);
    const call = p.event.create.mock.calls[0][0].data;
    expect(call.endDate).toBeNull();
  });
});
