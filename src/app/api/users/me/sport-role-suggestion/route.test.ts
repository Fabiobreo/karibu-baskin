import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

const p = prisma as unknown as { user: { findUnique: Mock; update: Mock } };
const mockAuth = auth as Mock;

function put(body: unknown) {
  return PUT(
    new Request("http://localhost/api/users/me/sport-role-suggestion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("PUT /api/users/me/sport-role-suggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    p.user.findUnique.mockResolvedValue({ sportRole: null });
    p.user.update.mockResolvedValue({ sportRoleSuggested: 2, sportRoleSuggestedVariant: "T" });
  });

  it("401 senza sessione", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await put({ role: 2 })).status).toBe(401);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("400 con un ruolo non valido", async () => {
    expect((await put({ role: 9 })).status).toBe(400);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("salva ruolo e variante sull'utente della sessione", async () => {
    const res = await put({ role: 2, variant: "T" });
    expect(res.status).toBe(200);
    expect(p.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { sportRoleSuggested: 2, sportRoleSuggestedVariant: "T" },
      })
    );
  });

  it("senza variante la azzera", async () => {
    await put({ role: 4 });
    expect(p.user.update.mock.calls[0][0].data).toEqual({
      sportRoleSuggested: 4,
      sportRoleSuggestedVariant: null,
    });
  });

  it("409 se lo staff ha già confermato un ruolo", async () => {
    p.user.findUnique.mockResolvedValue({ sportRole: 3 });
    expect((await put({ role: 5 })).status).toBe(409);
    expect(p.user.update).not.toHaveBeenCalled();
  });
});
