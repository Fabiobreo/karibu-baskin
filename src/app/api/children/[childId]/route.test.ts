import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    child: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    registration: { findMany: vi.fn(), deleteMany: vi.fn() },
    trainingSession: { updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    linkRequest: { findFirst: vi.fn(), create: vi.fn() },
    appNotification: { create: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/webpush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToUser } from "@/lib/webpush";

type PrismaMock = {
  child: { findUnique: Mock; update: Mock; delete: Mock };
  registration: { findMany: Mock; deleteMany: Mock };
  trainingSession: { updateMany: Mock };
  user: { findUnique: Mock };
  linkRequest: { findFirst: Mock; create: Mock };
  appNotification: { create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;
const mockSendPush = sendPushToUser as Mock;

function makePATCH(childId: string, body: object): [NextRequest, { params: Promise<{ childId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/children/${childId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ childId }) },
  ];
}

function makeDELETE(childId: string): [NextRequest, { params: Promise<{ childId: string }> }] {
  return [
    new NextRequest(`http://localhost/api/children/${childId}`, { method: "DELETE" }),
    { params: Promise.resolve({ childId }) },
  ];
}

const baseChild = {
  id: "child-1",
  name: "Luca Rossi",
  parentId: "parent-1",
  userId: null,
  sportRole: null,
  sportRoleVariant: null,
  gender: null,
  birthDate: null,
};

// ─── PATCH ────────────────────────────────────────────────────────────────────

describe("PATCH /api/children/[childId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "parent-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findUnique.mockResolvedValue(baseChild);
    p.child.update.mockResolvedValue(baseChild);
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const [req, ctx] = makePATCH("child-1", { name: "Nuovo Nome" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("restituisce 404 se il figlio non esiste", async () => {
    p.child.findUnique.mockResolvedValue(null);
    const [req, ctx] = makePATCH("child-x", { name: "Test" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
  });

  it("restituisce 403 se non è il genitore e non è staff", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other-user" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    const [req, ctx] = makePATCH("child-1", { name: "Test" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(403);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("consente allo staff di modificare figli altrui", async () => {
    mockAuth.mockResolvedValue({ user: { id: "coach-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.child.update.mockResolvedValue({ ...baseChild, name: "Nome Aggiornato" });
    const [req, ctx] = makePATCH("child-1", { name: "Nome Aggiornato" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(p.child.update).toHaveBeenCalled();
  });

  it("restituisce 400 per gender non valido", async () => {
    const [req, ctx] = makePATCH("child-1", { gender: "X" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("restituisce 400 per sportRole fuori range", async () => {
    const [req, ctx] = makePATCH("child-1", { sportRole: 9 });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("restituisce 400 per linkEmail non valida", async () => {
    const [req, ctx] = makePATCH("child-1", { linkEmail: "non-una-email" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se il nome diventa vuoto dopo il trim", async () => {
    const [req, ctx] = makePATCH("child-1", { name: "   " });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("aggiorna nome e sportRole con successo", async () => {
    p.child.update.mockResolvedValue({ ...baseChild, name: "Luca", sportRole: 2 });
    const [req, ctx] = makePATCH("child-1", { name: "Luca", sportRole: 2 });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sportRole).toBe(2);
    expect(p.child.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "child-1" } })
    );
  });

  it("trimma il nome prima del salvataggio", async () => {
    p.child.update.mockResolvedValue({ ...baseChild, name: "Luca" });
    const [req, ctx] = makePATCH("child-1", { name: "  Luca  " });
    await PATCH(req, ctx);
    const call = p.child.update.mock.calls[0][0];
    expect(call.data.name).toBe("Luca");
  });

  // ── Link flow ────────────────────────────────────────────────────────────────

  it("restituisce 404 se l'utente target non esiste (linkEmail)", async () => {
    p.user.findUnique.mockResolvedValue(null);
    const [req, ctx] = makePATCH("child-1", { linkEmail: "target@example.com" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(404);
    expect(p.linkRequest.create).not.toHaveBeenCalled();
  });

  it("restituisce 409 se l'account target è già collegato a un altro figlio", async () => {
    p.user.findUnique.mockResolvedValue({ id: "target-1", name: "Target", email: "target@example.com" });
    p.child.findUnique
      .mockResolvedValueOnce(baseChild) // prima chiamata: lookup del figlio stesso
      .mockResolvedValueOnce({ id: "child-OTHER" }); // seconda chiamata: alreadyLinked
    const [req, ctx] = makePATCH("child-1", { linkUserId: "target-1" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(409);
    expect(p.linkRequest.create).not.toHaveBeenCalled();
  });

  it("restituisce il child se l'account è già collegato allo stesso figlio (idempotente)", async () => {
    p.user.findUnique.mockResolvedValue({ id: "target-1", name: "Target", email: "target@example.com" });
    p.child.findUnique
      .mockResolvedValueOnce(baseChild) // figlio corrente
      .mockResolvedValueOnce({ id: "child-1" }); // alreadyLinked === questo figlio
    const [req, ctx] = makePATCH("child-1", { linkUserId: "target-1" });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(p.linkRequest.create).not.toHaveBeenCalled();
  });

  it("restituisce pending se esiste già una richiesta pendente", async () => {
    p.user.findUnique.mockResolvedValue({ id: "target-1", name: "Target", email: "target@example.com" });
    p.child.findUnique
      .mockResolvedValueOnce(baseChild)
      .mockResolvedValueOnce(null); // alreadyLinked: null
    p.linkRequest.findFirst.mockResolvedValue({ id: "req-existing" });
    const [req, ctx] = makePATCH("child-1", { linkUserId: "target-1" });
    const res = await PATCH(req, ctx);
    const json = await res.json();
    expect(json.pending).toBe(true);
    expect(json.requestId).toBe("req-existing");
    expect(p.linkRequest.create).not.toHaveBeenCalled();
  });

  it("crea LinkRequest, notifica in-app e push notification", async () => {
    p.user.findUnique
      .mockResolvedValueOnce({ id: "target-1", name: "Target", email: "target@example.com" }) // targetUser
      .mockResolvedValueOnce({ name: "Genitore" }); // parent
    p.child.findUnique
      .mockResolvedValueOnce(baseChild)
      .mockResolvedValueOnce(null); // alreadyLinked: null
    p.linkRequest.findFirst.mockResolvedValue(null);
    p.linkRequest.create.mockResolvedValue({ id: "req-new" });
    p.appNotification.create.mockResolvedValue(undefined);
    const [req, ctx] = makePATCH("child-1", { linkUserId: "target-1" });
    const res = await PATCH(req, ctx);
    const json = await res.json();
    expect(json.pending).toBe(true);
    expect(json.requestId).toBe("req-new");
    expect(p.linkRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: "child-1", targetUserId: "target-1" }) })
    );
    expect(p.appNotification.create).toHaveBeenCalled();
    expect(mockSendPush).toHaveBeenCalledWith("target-1", expect.objectContaining({ type: "LINK_REQUEST" }));
  });

  // ── Unlink ───────────────────────────────────────────────────────────────────

  it("scollega account impostando userId a null", async () => {
    p.child.update.mockResolvedValue({ ...baseChild, userId: null });
    const [req, ctx] = makePATCH("child-1", { unlinkAccount: true });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(200);
    expect(p.child.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: null } })
    );
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe("DELETE /api/children/[childId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "parent-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.child.findUnique.mockResolvedValue(baseChild);
    p.registration.findMany.mockResolvedValue([]);
    p.registration.deleteMany.mockResolvedValue(undefined);
    p.trainingSession.updateMany.mockResolvedValue(undefined);
    p.child.delete.mockResolvedValue(undefined);
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const [req, ctx] = makeDELETE("child-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
    expect(p.child.delete).not.toHaveBeenCalled();
  });

  it("restituisce 404 se il figlio non esiste", async () => {
    p.child.findUnique.mockResolvedValue(null);
    const [req, ctx] = makeDELETE("child-x");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(404);
    expect(p.child.delete).not.toHaveBeenCalled();
  });

  it("restituisce 403 se non è il genitore e non è staff", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other-user" } });
    mockIsCoachOrAdmin.mockResolvedValue(false);
    const [req, ctx] = makeDELETE("child-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(403);
    expect(p.child.delete).not.toHaveBeenCalled();
  });

  it("elimina il figlio con successo (genitore) — 204 senza body", async () => {
    const [req, ctx] = makeDELETE("child-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
    expect(p.child.delete).toHaveBeenCalledWith({ where: { id: "child-1" } });
  });

  it("permette allo staff di eliminare figli altrui", async () => {
    mockAuth.mockResolvedValue({ user: { id: "coach-1" } });
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const [req, ctx] = makeDELETE("child-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(204);
    expect(p.child.delete).toHaveBeenCalled();
  });

  it("elimina le iscrizioni del figlio prima di eliminarlo (CASCADE manuale)", async () => {
    p.registration.findMany.mockResolvedValue([
      { sessionId: "session-1" },
      { sessionId: "session-2" },
    ]);
    const [req, ctx] = makeDELETE("child-1");
    await DELETE(req, ctx);
    expect(p.registration.deleteMany).toHaveBeenCalledWith({ where: { childId: "child-1" } });
    expect(p.child.delete).toHaveBeenCalled();
  });

  it("azzera il campo teams nelle sessioni interessate dopo aver eliminato le iscrizioni", async () => {
    p.registration.findMany.mockResolvedValue([
      { sessionId: "session-1" },
      { sessionId: "session-1" }, // duplicato — deve essere deduplicato
      { sessionId: "session-2" },
    ]);
    const [req, ctx] = makeDELETE("child-1");
    await DELETE(req, ctx);
    const call = p.trainingSession.updateMany.mock.calls[0][0];
    // deve deduplicare i sessionId
    expect(call.where.id.in).toHaveLength(2);
    expect(call.where.id.in).toContain("session-1");
    expect(call.where.id.in).toContain("session-2");
  });

  it("non chiama deleteMany né updateMany se il figlio non ha iscrizioni", async () => {
    p.registration.findMany.mockResolvedValue([]);
    const [req, ctx] = makeDELETE("child-1");
    await DELETE(req, ctx);
    expect(p.registration.deleteMany).not.toHaveBeenCalled();
    expect(p.trainingSession.updateMany).not.toHaveBeenCalled();
    expect(p.child.delete).toHaveBeenCalled();
  });
});
