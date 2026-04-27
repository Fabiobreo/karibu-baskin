import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    registration: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    child: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  registration: { findUnique: Mock; delete: Mock };
  child: { findUnique: Mock; findFirst: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

function makeDELETE(regId: string): [NextRequest, { params: Promise<{ regId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/registrations/${regId}`, { method: "DELETE" }),
    { params: Promise.resolve({ regId }) },
  ];
}

describe("DELETE /api/registrations/[regId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.registration.delete.mockResolvedValue(undefined);
  });

  it("restituisce 404 se l'iscrizione non esiste", async () => {
    p.registration.findUnique.mockResolvedValue(null);
    const [req, ctx] = makeDELETE("reg-999");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(404);
    expect(p.registration.delete).not.toHaveBeenCalled();
  });

  it("restituisce 401 per utente non autenticato su iscrizione con userId", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: "user-1", childId: null });
    mockAuth.mockResolvedValue(null);
    mockIsCoachOrAdmin.mockResolvedValue(false);
    const [req, ctx] = makeDELETE("reg-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
    expect(p.registration.delete).not.toHaveBeenCalled();
  });

  it("restituisce 401 per utente non correlato su iscrizione utente", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: "user-X", childId: null });
    mockAuth.mockResolvedValue({ user: { id: "user-Y" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findFirst.mockResolvedValue(null);
    const [req, ctx] = makeDELETE("reg-2");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });

  it("restituisce 401 per iscrizione anonima senza staff", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: null, childId: null });
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    const [req, ctx] = makeDELETE("reg-3");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
    expect(p.registration.delete).not.toHaveBeenCalled();
  });

  it("permette all'owner di eliminare la propria iscrizione", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: "user-1", childId: null });
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    const [req, ctx] = makeDELETE("reg-4");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
    expect(p.registration.delete).toHaveBeenCalledWith({ where: { id: "reg-4" } });
  });

  it("permette allo staff (coach/admin) di eliminare qualsiasi iscrizione", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: "user-2", childId: null });
    mockAuth.mockResolvedValue({ user: { id: "coach-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const [req, ctx] = makeDELETE("reg-5");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
    expect(p.registration.delete).toHaveBeenCalledWith({ where: { id: "reg-5" } });
  });

  it("permette allo staff di eliminare anche iscrizioni anonime", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: null, childId: null });
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const [req, ctx] = makeDELETE("reg-6");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
  });

  it("permette al genitore di eliminare l'iscrizione del figlio (via childId)", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: null, childId: "child-1" });
    mockAuth.mockResolvedValue({ user: { id: "parent-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findUnique.mockResolvedValue({ userId: null, parentId: "parent-1" });
    const [req, ctx] = makeDELETE("reg-7");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
    expect(p.child.findUnique).toHaveBeenCalledWith({
      where: { id: "child-1" },
      select: { userId: true, parentId: true },
    });
  });

  it("permette all'account collegato del figlio di eliminare la propria iscrizione (via childId)", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: null, childId: "child-1" });
    mockAuth.mockResolvedValue({ user: { id: "linked-user-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findUnique.mockResolvedValue({ userId: "linked-user-1", parentId: "parent-2" });
    const [req, ctx] = makeDELETE("reg-8");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
  });

  it("nega accesso a un utente non correlato su iscrizione via childId", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: null, childId: "child-1" });
    mockAuth.mockResolvedValue({ user: { id: "stranger-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findUnique.mockResolvedValue({ userId: "other-user", parentId: "other-parent" });
    const [req, ctx] = makeDELETE("reg-9");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });

  it("permette al genitore di eliminare l'iscrizione dell'atleta figlio (via userId)", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: "athlete-1", childId: null });
    mockAuth.mockResolvedValue({ user: { id: "parent-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findFirst.mockResolvedValue({ id: "child-record-1" });
    const [req, ctx] = makeDELETE("reg-10");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
    expect(p.child.findFirst).toHaveBeenCalledWith({
      where: { userId: "athlete-1", parentId: "parent-1" },
    });
  });

  it("nega al genitore l'eliminazione se l'atleta non è suo figlio", async () => {
    p.registration.findUnique.mockResolvedValue({ userId: "athlete-1", childId: null });
    mockAuth.mockResolvedValue({ user: { id: "parent-X" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findFirst.mockResolvedValue(null);
    const [req, ctx] = makeDELETE("reg-11");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });
});
