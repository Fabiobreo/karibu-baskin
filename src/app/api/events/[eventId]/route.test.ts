import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  prisma: {
    event: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = { event: { update: Mock; delete: Mock } };
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

function makeP2025() {
  const err = new Prisma.PrismaClientKnownRequestError("record not found", {
    code: "P2025",
    clientVersion: "5.0.0",
  });
  return err;
}

function makePUT(eventId: string, body: object): [Request, { params: Promise<{ eventId: string }> }] {
  return [
    new Request(`http://localhost/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ eventId }) },
  ];
}

function makeDELETE(eventId: string): [Request, { params: Promise<{ eventId: string }> }] {
  return [
    new Request(`http://localhost/api/events/${eventId}`, { method: "DELETE" }),
    { params: Promise.resolve({ eventId }) },
  ];
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe("PUT /api/events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.event.update.mockResolvedValue(baseEvent);
  });

  it("restituisce 403 per utente non staff", async () => {
    const [req, ctx] = makePUT("evt-1", { title: "Nuovo Titolo" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(403);
    expect(p.event.update).not.toHaveBeenCalled();
  });

  it("restituisce 400 per body non JSON valido", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/events/evt-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await PUT(req, { params: Promise.resolve({ eventId: "evt-1" }) });
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per titolo vuoto", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const [req, ctx] = makePUT("evt-1", { title: "" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    expect(p.event.update).not.toHaveBeenCalled();
  });

  it("restituisce 404 se l'evento non esiste", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.event.update.mockRejectedValue(makeP2025());
    const [req, ctx] = makePUT("evt-x", { title: "Test" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("non trovato");
  });

  it("aggiorna l'evento e restituisce 200", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.event.update.mockResolvedValue({ ...baseEvent, title: "Titolo Aggiornato" });
    const [req, ctx] = makePUT("evt-1", { title: "  Titolo Aggiornato  " });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
    const call = p.event.update.mock.calls[0][0];
    expect(call.where.id).toBe("evt-1");
    expect(call.data.title).toBe("Titolo Aggiornato");
  });

  it("aggiorna endDate a null quando passato null", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.event.update.mockResolvedValue({ ...baseEvent, endDate: null });
    const [req, ctx] = makePUT("evt-1", { endDate: null });
    await PUT(req, ctx);
    const call = p.event.update.mock.calls[0][0];
    expect(call.data.endDate).toBeNull();
  });

  it("aggiorna location a null quando passata stringa vuota", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.event.update.mockResolvedValue({ ...baseEvent, location: null });
    const [req, ctx] = makePUT("evt-1", { location: "" });
    await PUT(req, ctx);
    const call = p.event.update.mock.calls[0][0];
    expect(call.data.location).toBeNull();
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.event.delete.mockResolvedValue(baseEvent);
  });

  it("restituisce 403 per utente non staff", async () => {
    const [req, ctx] = makeDELETE("evt-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(403);
    expect(p.event.delete).not.toHaveBeenCalled();
  });

  it("restituisce 404 se l'evento non esiste", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.event.delete.mockRejectedValue(makeP2025());
    const [req, ctx] = makeDELETE("evt-x");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("non trovato");
  });

  it("elimina l'evento e restituisce 204 senza body", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const [req, ctx] = makeDELETE("evt-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
    expect(p.event.delete).toHaveBeenCalledWith({ where: { id: "evt-1" } });
  });
});
