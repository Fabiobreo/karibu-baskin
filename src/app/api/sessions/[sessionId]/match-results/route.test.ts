import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: { findUnique: vi.fn() },
    trainingMatchResult: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  trainingSession: { findUnique: Mock };
  trainingMatchResult: { findMany: Mock; create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const CTX = (sessionId: string) => ({ params: Promise.resolve({ sessionId }) });

describe("GET /api/sessions/[sessionId]/match-results", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restituisce la lista dei risultati", async () => {
    const results = [
      { id: "mr1", sessionId: "s1", scoreA: 10, scoreB: 8, scoreC: null, notes: null, createdAt: new Date() },
    ];
    p.trainingMatchResult.findMany.mockResolvedValue(results);
    const req = new NextRequest("http://localhost/api/sessions/s1/match-results");
    const res = await GET(req, CTX("s1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].scoreA).toBe(10);
  });

  it("restituisce array vuoto se nessun risultato", async () => {
    p.trainingMatchResult.findMany.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/sessions/s1/match-results");
    const res = await GET(req, CTX("s1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(0);
  });
});

describe("POST /api/sessions/[sessionId]/match-results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(true);
  });

  it("restituisce 403 se non staff", async () => {
    mockIsCoach.mockResolvedValue(false);
    const req = new NextRequest("http://localhost/api/sessions/s1/match-results", {
      method: "POST",
      body: JSON.stringify({ scoreA: 10, scoreB: 8 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, CTX("s1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 404 se la sessione non esiste", async () => {
    p.trainingSession.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/sessions/s-missing/match-results", {
      method: "POST",
      body: JSON.stringify({ scoreA: 10, scoreB: 8 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, CTX("s-missing"));
    expect(res.status).toBe(404);
  });

  it("restituisce 400 se scoreA manca", async () => {
    p.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    const req = new NextRequest("http://localhost/api/sessions/s1/match-results", {
      method: "POST",
      body: JSON.stringify({ scoreB: 8 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, CTX("s1"));
    expect(res.status).toBe(400);
  });

  it("crea un risultato 2 squadre", async () => {
    p.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    const created = { id: "mr1", sessionId: "s1", scoreA: 15, scoreB: 12, scoreC: null, notes: null, createdAt: new Date() };
    p.trainingMatchResult.create.mockResolvedValue(created);
    const req = new NextRequest("http://localhost/api/sessions/s1/match-results", {
      method: "POST",
      body: JSON.stringify({ scoreA: 15, scoreB: 12 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, CTX("s1"));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.scoreA).toBe(15);
    expect(json.scoreB).toBe(12);
    expect(json.scoreC).toBeNull();
  });

  it("crea un risultato a 3 squadre con scoreC", async () => {
    p.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    const created = { id: "mr2", sessionId: "s1", scoreA: 10, scoreB: 8, scoreC: 6, notes: null, createdAt: new Date() };
    p.trainingMatchResult.create.mockResolvedValue(created);
    const req = new NextRequest("http://localhost/api/sessions/s1/match-results", {
      method: "POST",
      body: JSON.stringify({ scoreA: 10, scoreB: 8, scoreC: 6 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, CTX("s1"));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.scoreC).toBe(6);
  });

  it("rifiuta punteggio negativo", async () => {
    p.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    const req = new NextRequest("http://localhost/api/sessions/s1/match-results", {
      method: "POST",
      body: JSON.stringify({ scoreA: -1, scoreB: 8 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, CTX("s1"));
    expect(res.status).toBe(400);
  });
});
