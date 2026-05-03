import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    opposingTeam: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

type PrismaMock = {
  opposingTeam: { update: Mock; delete: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;

const makeParams = (id: string) =>
  ({ params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> });

const baseTeam = { id: "opp-1", name: "Basket Vicenza", city: "Vicenza", notes: null };

describe("PUT /api/opposing-teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.opposingTeam.update.mockResolvedValue(baseTeam);
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nuovo Nome" }),
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "BAD_JSON",
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(400);
  });

  it("aggiorna la squadra con trim e restituisce 200", async () => {
    mockIsAdmin.mockResolvedValue(true);
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
    mockIsAdmin.mockResolvedValue(true);
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
    mockIsAdmin.mockResolvedValue(true);
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
    mockIsAdmin.mockResolvedValue(false);
    p.opposingTeam.delete.mockResolvedValue(baseTeam);
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(403);
  });

  it("elimina la squadra avversaria e restituisce 204", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(204);
    expect(p.opposingTeam.delete).toHaveBeenCalledWith({ where: { id: "opp-1" } });
  });
});
