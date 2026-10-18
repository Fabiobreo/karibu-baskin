import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    trainingMatchResult: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rating/recompute", () => ({
  recomputeRatingsSafely: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
}));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { recomputeRatingsSafely } from "@/lib/rating/recompute";

type PrismaMock = {
  $transaction: Mock;
  trainingMatchResult: { findUnique: Mock; update: Mock; delete: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const CTX = (resultId: string) => ({ params: Promise.resolve({ sessionId: "s1", resultId }) });

describe("PUT /api/sessions/[sessionId]/match-results/[resultId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(true);
  });

  it("restituisce 403 se non staff", async () => {
    mockIsCoach.mockResolvedValue(false);
    const req = new NextRequest("http://localhost/...", {
      method: "PUT",
      body: JSON.stringify({ scoreA: 12 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, CTX("mr1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 404 se il risultato non esiste", async () => {
    p.trainingMatchResult.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/...", {
      method: "PUT",
      body: JSON.stringify({ scoreA: 12 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, CTX("mr-missing"));
    expect(res.status).toBe(404);
  });

  it("aggiorna scoreA e scoreB", async () => {
    p.trainingMatchResult.findUnique.mockResolvedValue({ id: "mr1", sessionId: "s1" });
    p.trainingMatchResult.update.mockResolvedValue({
      id: "mr1",
      scoreA: 20,
      scoreB: 15,
      scoreC: null,
      notes: null,
    });
    const req = new NextRequest("http://localhost/...", {
      method: "PUT",
      body: JSON.stringify({ scoreA: 20, scoreB: 15 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req, CTX("mr1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scoreA).toBe(20);
    expect(json.scoreB).toBe(15);
    // Ricalcolo dopo la risposta, fuori dalla transazione (vedi recompute.ts).
    expect(p.$transaction).not.toHaveBeenCalled();
    expect(recomputeRatingsSafely).toHaveBeenCalledOnce();
  });

  it("aggiorna solo i campi forniti", async () => {
    p.trainingMatchResult.findUnique.mockResolvedValue({ id: "mr1", sessionId: "s1" });
    p.trainingMatchResult.update.mockResolvedValue({
      id: "mr1",
      scoreA: 25,
      scoreB: 15,
      scoreC: null,
      notes: null,
    });
    const req = new NextRequest("http://localhost/...", {
      method: "PUT",
      body: JSON.stringify({ scoreA: 25 }),
      headers: { "Content-Type": "application/json" },
    });
    await PUT(req, CTX("mr1"));
    const updateCall = p.trainingMatchResult.update.mock.calls[0][0].data;
    expect(updateCall).toHaveProperty("scoreA", 25);
    expect(updateCall).not.toHaveProperty("scoreB");
  });
});

describe("DELETE /api/sessions/[sessionId]/match-results/[resultId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(true);
  });

  it("restituisce 403 se non staff", async () => {
    mockIsCoach.mockResolvedValue(false);
    const req = new NextRequest("http://localhost/...", { method: "DELETE" });
    const res = await DELETE(req, CTX("mr1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 404 se il risultato non esiste", async () => {
    p.trainingMatchResult.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/...", { method: "DELETE" });
    const res = await DELETE(req, CTX("mr-missing"));
    expect(res.status).toBe(404);
  });

  it("elimina il risultato e restituisce 204", async () => {
    p.trainingMatchResult.findUnique.mockResolvedValue({ id: "mr1", sessionId: "s1" });
    p.trainingMatchResult.delete.mockResolvedValue({ id: "mr1" });
    const req = new NextRequest("http://localhost/...", { method: "DELETE" });
    const res = await DELETE(req, CTX("mr1"));
    expect(res.status).toBe(204);
    expect(p.trainingMatchResult.delete).toHaveBeenCalledWith({ where: { id: "mr1" } });
    expect(recomputeRatingsSafely).toHaveBeenCalledOnce();
  });

  it("non elimina un risultato di un altro allenamento", async () => {
    p.trainingMatchResult.findUnique.mockResolvedValue({ id: "mr1", sessionId: "altro" });
    const req = new NextRequest("http://localhost/...", { method: "DELETE" });
    const res = await DELETE(req, CTX("mr1"));
    expect(res.status).toBe(404);
    expect(p.trainingMatchResult.delete).not.toHaveBeenCalled();
  });
});
