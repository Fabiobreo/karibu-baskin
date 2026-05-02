import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sportRoleHistory: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/webpush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isAdminUser } from "@/lib/apiAuth";
import { sendPushToUser } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";
import { logAudit } from "@/lib/audit";

type PrismaMock = {
  user: { findUnique: Mock; update: Mock; delete: Mock };
  sportRoleHistory: { create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockIsAdmin = isAdminUser as Mock;
const mockSendPush = sendPushToUser as Mock;
const mockCreateNotif = createAppNotification as Mock;
const mockLogAudit = logAudit as Mock;

function makePATCH(userId: string, body: object): [NextRequest, { params: Promise<{ userId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ userId }) },
  ];
}

function makeDELETE(userId: string): [NextRequest, { params: Promise<{ userId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/users/${userId}`, { method: "DELETE" }),
    { params: Promise.resolve({ userId }) },
  ];
}

const baseUser = {
  id: "user-1",
  name: "Mario Rossi",
  email: "mario@example.com",
  appRole: "ATHLETE",
  sportRole: null,
  sportRoleVariant: null,
  gender: null,
  birthDate: null,
};

describe("PATCH /api/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockIsAdmin.mockResolvedValue(true);
    p.user.findUnique.mockResolvedValue(baseUser);
    p.user.update.mockResolvedValue({ ...baseUser });
    p.sportRoleHistory.create.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("restituisce 401 se l'utente non è admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const [req, ctx] = makePATCH("user-1", { appRole: "COACH" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("aggiorna appRole con successo", async () => {
    p.user.update.mockResolvedValue({ ...baseUser, appRole: "COACH" });
    const [req, ctx] = makePATCH("user-1", { appRole: "COACH" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.appRole).toBe("COACH");
  });

  it("restituisce 400 per appRole non valido", async () => {
    const [req, ctx] = makePATCH("user-1", { appRole: "SUPERUSER" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("restituisce 400 per gender non valido", async () => {
    const [req, ctx] = makePATCH("user-1", { gender: "X" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("accetta gender null (reset)", async () => {
    p.user.update.mockResolvedValue({ ...baseUser, gender: null });
    const [req, ctx] = makePATCH("user-1", { gender: null });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
  });

  it("restituisce 400 per sportRole fuori range", async () => {
    const [req, ctx] = makePATCH("user-1", { sportRole: 9 });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("restituisce 400 per sportRoleVariant non valida", async () => {
    const [req, ctx] = makePATCH("user-1", { sportRoleVariant: "X" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("crea SportRoleHistory quando sportRole cambia", async () => {
    p.user.findUnique.mockResolvedValue({ ...baseUser, sportRole: 1 });
    p.user.update.mockResolvedValue({ ...baseUser, sportRole: 3 });
    const [req, ctx] = makePATCH("user-1", { sportRole: 3 });
    await PATCH(req, ctx);
    expect(p.sportRoleHistory.create).toHaveBeenCalledWith({
      data: { userId: "user-1", sportRole: 3 },
    });
  });

  it("non crea SportRoleHistory se sportRole non cambia", async () => {
    p.user.findUnique.mockResolvedValue({ ...baseUser, sportRole: 2 });
    p.user.update.mockResolvedValue({ ...baseUser, sportRole: 2 });
    const [req, ctx] = makePATCH("user-1", { sportRole: 2 });
    await PATCH(req, ctx);
    expect(p.sportRoleHistory.create).not.toHaveBeenCalled();
  });

  it("non crea SportRoleHistory quando sportRole è null (primo accesso senza ruolo)", async () => {
    p.user.findUnique.mockResolvedValue({ ...baseUser, sportRole: null });
    p.user.update.mockResolvedValue({ ...baseUser, sportRole: null });
    const [req, ctx] = makePATCH("user-1", { sportRole: null });
    await PATCH(req, ctx);
    expect(p.sportRoleHistory.create).not.toHaveBeenCalled();
  });

  it("invia push notification quando sportRole viene assegnato la prima volta", async () => {
    p.user.findUnique.mockResolvedValue({ ...baseUser, sportRole: null });
    p.user.update.mockResolvedValue({ ...baseUser, sportRole: 2 });
    const [req, ctx] = makePATCH("user-1", { sportRole: 2 });
    await PATCH(req, ctx);
    // fire-and-forget — viene chiamato prima della risposta
    expect(mockSendPush).toHaveBeenCalledWith("user-1", expect.objectContaining({ title: "Ruolo sportivo assegnato" }));
    expect(mockCreateNotif).toHaveBeenCalled();
  });

  it("invia push 'aggiornato' quando sportRole cambia da valore esistente", async () => {
    p.user.findUnique.mockResolvedValue({ ...baseUser, sportRole: 1 });
    p.user.update.mockResolvedValue({ ...baseUser, sportRole: 3 });
    const [req, ctx] = makePATCH("user-1", { sportRole: 3 });
    await PATCH(req, ctx);
    expect(mockSendPush).toHaveBeenCalledWith("user-1", expect.objectContaining({ title: "Ruolo sportivo aggiornato" }));
  });

  it("non invia push se sportRole non cambia", async () => {
    p.user.findUnique.mockResolvedValue({ ...baseUser, sportRole: 2 });
    p.user.update.mockResolvedValue({ ...baseUser, sportRole: 2 });
    const [req, ctx] = makePATCH("user-1", { sportRole: 2 });
    await PATCH(req, ctx);
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("chiama logAudit per aggiornamento appRole", async () => {
    p.user.update.mockResolvedValue({ ...baseUser, appRole: "COACH" });
    const [req, ctx] = makePATCH("user-1", { appRole: "COACH" });
    await PATCH(req, ctx);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "UPDATE_ROLE", actorId: "admin-1" })
    );
  });

  it("restituisce 404 se l'utente non esiste (P2025)", async () => {
    const p2025 = Object.assign(new Error("Record not found"), { code: "P2025" });
    p.user.update.mockRejectedValue(p2025);
    const [req, ctx] = makePATCH("non-existent", { appRole: "COACH" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/non trovato/i);
  });
});

describe("DELETE /api/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockIsAdmin.mockResolvedValue(true);
    p.user.findUnique.mockResolvedValue({ email: "mario@example.com", name: "Mario Rossi", appRole: "ATHLETE" });
    p.user.delete.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
  });

  it("restituisce 401 se l'utente non è admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const [req, ctx] = makeDELETE("user-2");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
    expect(p.user.delete).not.toHaveBeenCalled();
  });

  it("impedisce all'admin di eliminare se stesso", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    const [req, ctx] = makeDELETE("admin-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/tuo account/i);
    expect(p.user.delete).not.toHaveBeenCalled();
  });

  it("elimina un altro utente con successo", async () => {
    const [req, ctx] = makeDELETE("user-2");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(p.user.delete).toHaveBeenCalledWith({ where: { id: "user-2" } });
  });

  it("chiama logAudit dopo eliminazione", async () => {
    const [req, ctx] = makeDELETE("user-2");
    await DELETE(req, ctx);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DELETE_USER", actorId: "admin-1", targetId: "user-2" })
    );
  });

  it("non chiama logAudit se la sessione admin è assente", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockAuth.mockResolvedValue(null);
    const [req, ctx] = makeDELETE("user-2");
    await DELETE(req, ctx);
    expect(p.user.delete).toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});
