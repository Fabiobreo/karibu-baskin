import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => {
  const user = { findUnique: vi.fn(), update: vi.fn() };
  const childGuardian = { create: vi.fn(), findMany: vi.fn(), delete: vi.fn() };
  return {
    prisma: {
      child: { findUnique: vi.fn() },
      user,
      childGuardian,
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb({ user, childGuardian })),
    },
  };
});
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));

import { POST, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

type PrismaMock = {
  child: { findUnique: Mock };
  user: { findUnique: Mock; update: Mock };
  childGuardian: { create: Mock; findMany: Mock; delete: Mock };
};
const p = prisma as unknown as PrismaMock;
const ctx = { params: Promise.resolve({ childId: "c1" }) };

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/admin/children/c1/guardians", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    ctx
  );
const del = (qs: string) =>
  DELETE(
    new NextRequest(`http://localhost/api/admin/children/c1/guardians${qs}`, { method: "DELETE" }),
    ctx
  );

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "coach1", appRole: "COACH" } });
  (isCoachOrAdmin as Mock).mockResolvedValue(true);
  p.child.findUnique.mockResolvedValue({ id: "c1", name: "Luca", userId: null });
  p.user.findUnique.mockResolvedValue({ id: "u2", name: "Marco", appRole: "PARENT" });
  p.childGuardian.create.mockResolvedValue({});
});

describe("POST /api/admin/children/[childId]/guardians", () => {
  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await post({ userId: "u2" })).status).toBe(403);
    expect(p.childGuardian.create).not.toHaveBeenCalled();
  });

  it("collega il genitore e lo registra nell'audit", async () => {
    const res = await post({ userId: "u2" });
    expect(res.status).toBe(201);
    expect(p.childGuardian.create).toHaveBeenCalledWith({
      data: { childId: "c1", userId: "u2" },
    });
    expect(p.user.update).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "LINK_GUARDIAN" }));
  });

  it("promuove a PARENT un genitore GUEST quando richiesto", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u2", name: "Marco", appRole: "GUEST" });
    const res = await post({ userId: "u2", promoteParent: true });
    expect((await res.json()).parentPromoted).toBe(true);
    expect(p.user.update).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { appRole: "PARENT" },
    });
  });

  it("già collegato: 409", async () => {
    p.childGuardian.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
    );
    expect((await post({ userId: "u2" })).status).toBe(409);
  });

  it("il figlio non può essere genitore del proprio account", async () => {
    p.child.findUnique.mockResolvedValue({ id: "c1", name: "Luca", userId: "u2" });
    expect((await post({ userId: "u2" })).status).toBe(400);
  });

  it("figlio o utente inesistenti: 404", async () => {
    p.child.findUnique.mockResolvedValue(null);
    expect((await post({ userId: "u2" })).status).toBe(404);
  });
});

describe("DELETE /api/admin/children/[childId]/guardians", () => {
  it("scollega uno dei genitori", async () => {
    p.childGuardian.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    const res = await del("?userId=u2");
    expect(res.status).toBe(204);
    expect(p.childGuardian.delete).toHaveBeenCalledWith({
      where: { childId_userId: { childId: "c1", userId: "u2" } },
    });
  });

  it("non scollega l'ultimo genitore", async () => {
    p.childGuardian.findMany.mockResolvedValue([{ userId: "u2" }]);
    const res = await del("?userId=u2");
    expect(res.status).toBe(400);
    expect(p.childGuardian.delete).not.toHaveBeenCalled();
  });

  it("collegamento inesistente: 404; userId mancante: 400", async () => {
    p.childGuardian.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u3" }]);
    expect((await del("?userId=u2")).status).toBe(404);
    expect((await del("")).status).toBe(400);
  });
});
