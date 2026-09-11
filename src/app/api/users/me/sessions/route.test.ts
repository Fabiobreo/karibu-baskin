import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { session: { deleteMany: vi.fn() } },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));

import { DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

const deleteMany = (prisma as unknown as { session: { deleteMany: Mock } }).session.deleteMany;
const mockAuth = auth as unknown as Mock;

describe("DELETE /api/users/me/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteMany.mockResolvedValue({ count: 3 });
  });

  it("richiede l'autenticazione", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await DELETE()).status).toBe(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("cancella tutte e sole le sessioni dell'utente", async () => {
    // Prisma `prisma.session` è la sessione Auth.js, non l'allenamento.
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 3 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("risponde con un errore leggibile se il database fallisce", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    deleteMany.mockRejectedValue(new Error("db giù"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await DELETE();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
  });
});
