import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    opposingTeam: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
    },
    match: { count: vi.fn().mockResolvedValue(0) },
    groupMatch: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { Prisma } from "@prisma/client";

type PrismaMock = {
  opposingTeam: { findUnique: Mock; update: Mock; delete: Mock };
  match: { count: Mock };
  groupMatch: { count: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsStaff = isCoachOrAdmin as Mock;

const makeParams = (id: string) =>
  ({ params: Promise.resolve({ id }) }) as { params: Promise<{ id: string }> };

const baseTeam = { id: "opp-1", name: "Basket Vicenza", city: "Vicenza", notes: null };

describe("PUT /api/opposing-teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStaff.mockResolvedValue(false);
    p.opposingTeam.update.mockResolvedValue(baseTeam);
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nuovo Nome" }),
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "BAD_JSON",
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(400);
  });

  it("aggiorna la squadra con trim e restituisce 200", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Basket Vicenza Aggiornato  ", city: "  Vicenza  " }),
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(200);
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect(updateData.name).toBe("Basket Vicenza Aggiornato");
    expect(updateData.city).toBe("Vicenza");
  });

  it("imposta city=null per stringa vuota", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: "" }),
    });
    await PUT(req, makeParams("opp-1"));
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect(updateData.city).toBeNull();
  });

  it("non aggiorna i campi non forniti nel body", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Squadra forte" }),
    });
    await PUT(req, makeParams("opp-1"));
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect("name" in updateData).toBe(false);
    expect("city" in updateData).toBe(false);
    expect(updateData.notes).toBe("Squadra forte");
  });
});

describe("DELETE /api/opposing-teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStaff.mockResolvedValue(false);
    p.opposingTeam.delete.mockResolvedValue(baseTeam);
    p.match.count.mockResolvedValue(0);
    p.groupMatch.count.mockResolvedValue(0);
  });

  it("restituisce 409 e non elimina se la squadra compare in partite del club", async () => {
    // Sul DB la FK delle partite del club è ON DELETE SET NULL: la delete
    // riuscirebbe lasciando partite senza avversario.
    mockIsStaff.mockResolvedValue(true);
    p.opposingTeam.findUnique.mockResolvedValueOnce({ name: "Basket Vicenza", city: null });
    p.match.count.mockResolvedValueOnce(2);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Basket Vicenza");
    expect(p.match.count).toHaveBeenCalledWith({ where: { opponentId: "opp-1" } });
    expect(p.opposingTeam.delete).not.toHaveBeenCalled();
  });

  it("restituisce 409 e non elimina se la squadra compare in partite di girone", async () => {
    mockIsStaff.mockResolvedValue(true);
    p.groupMatch.count.mockResolvedValueOnce(1);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(409);
    expect(p.groupMatch.count).toHaveBeenCalledWith({
      where: { OR: [{ homeTeamId: "opp-1" }, { awayTeamId: "opp-1" }] },
    });
    expect(p.opposingTeam.delete).not.toHaveBeenCalled();
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(403);
  });

  it("elimina la squadra avversaria e restituisce 204", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(204);
    expect(p.opposingTeam.delete).toHaveBeenCalledWith({ where: { id: "opp-1" } });
  });

  it("restituisce 409 con un messaggio se la squadra ha partite collegate (P2003)", async () => {
    mockIsStaff.mockResolvedValue(true);
    p.opposingTeam.findUnique.mockResolvedValueOnce({ name: "Basket Vicenza", city: null });
    p.opposingTeam.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "test",
      })
    );
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Basket Vicenza");
    expect(body.error).toContain("partite");
  });

  it("restituisce 404 se la squadra non esiste più (P2025)", async () => {
    mockIsStaff.mockResolvedValue(true);
    p.opposingTeam.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      })
    );
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(404);
  });
});
