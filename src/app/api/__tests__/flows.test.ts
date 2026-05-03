/**
 * Test multi-step che verificano l'interazione tra route successive.
 * Ogni test simula un flow completo controllando la transizione di stato.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

// ── Mock condivisi ─────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    registration: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    trainingSession: { findUnique: vi.fn(), update: vi.fn() },
    child: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    linkRequest: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    appNotification: { create: vi.fn() },
    teamMembership: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
  isAdminUser: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/webpush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
  sendPushToUsers: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/appNotifications", () => ({ createAppNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 19 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { POST as postTeams } from "../teams/[sessionId]/route";
import { POST as postRegistration } from "../registrations/route";
import { POST as claimRegistration } from "../registrations/claim/route";
import { POST as respondLinkRequest } from "../link-requests/[requestId]/respond/route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  $transaction: Mock;
  registration: { findMany: Mock; findFirst: Mock; create: Mock; updateMany: Mock };
  trainingSession: { findUnique: Mock; update: Mock };
  child: { findUnique: Mock; update: Mock };
  user: { findUnique: Mock; update: Mock };
  linkRequest: { findUnique: Mock; findFirst: Mock; create: Mock; update: Mock };
  appNotification: { create: Mock };
  teamMembership: { findFirst: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

// ── Flow 1: iscrizione anonima → claim ────────────────────────────────────────

describe("Flow: iscrizione anonima → claim", () => {
  const sessionId = "sess-flow-1";
  const anonName = "Mario Rossi";
  const userId = "user-claim-1";

  const baseSession = {
    date: new Date(Date.now() + 3600_000),
    endTime: null,
    allowedRoles: [],
    restrictTeamId: null,
    openRoles: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    p.trainingSession.findUnique.mockResolvedValue(baseSession);
    p.registration.findFirst.mockResolvedValue(null);
    p.registration.create.mockResolvedValue({
      id: "reg-anon-1", sessionId, name: anonName, role: 1, userId: null, childId: null,
    });
  });

  it("l'iscrizione anonima viene creata e poi assegnata all'utente con il claim", async () => {
    // Step 1: iscrizione anonima (utente non autenticato)
    const regReq = new NextRequest("http://localhost/api/registrations", {
      method: "POST",
      body: JSON.stringify({ sessionId, role: 1, name: anonName }),
      headers: { "Content-Type": "application/json" },
    });
    const regRes = await postRegistration(regReq);
    expect(regRes.status).toBe(201);
    expect(p.registration.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: anonName, role: 1, sessionId }) })
    );
    // L'iscrizione è anonima: nessun userId nel data
    const createData = p.registration.create.mock.calls[0][0].data;
    expect(createData.userId).toBeUndefined();

    // Step 2: claim da utente autenticato con lo stesso nome
    mockAuth.mockResolvedValue({ user: { id: userId, name: anonName } });
    p.registration.findMany.mockResolvedValue([{ id: "reg-anon-1" }]);
    p.registration.updateMany.mockResolvedValue({ count: 1 });

    const claimReq = new NextRequest("http://localhost/api/registrations/claim", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const claimRes = await claimRegistration(claimReq);
    expect(claimRes.status).toBe(200);
    const json = await claimRes.json();
    expect(json.claimed).toBe(1);
    // Il claim imposta userId sull'iscrizione
    expect(p.registration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId } })
    );
  });
});

// ── Flow 2: iscrizioni → generazione squadre ─────────────────────────────────

describe("Flow: iscrizioni → generazione squadre", () => {
  const sessionId = "sess-flow-2";

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(true);
  });

  it("le squadre generate riflettono gli atleti iscritti correnti", async () => {
    const registrations = [
      { id: "r1", name: "A", role: 1, userId: "u1", childId: null, registeredAsCoach: false, createdAt: new Date() },
      { id: "r2", name: "B", role: 2, userId: "u2", childId: null, registeredAsCoach: false, createdAt: new Date() },
      { id: "r3", name: "C", role: 3, userId: "u3", childId: null, registeredAsCoach: false, createdAt: new Date() },
      { id: "r4", name: "D", role: 4, userId: "u4", childId: null, registeredAsCoach: false, createdAt: new Date() },
    ];
    p.registration.findMany.mockResolvedValue(registrations);
    p.trainingSession.findUnique.mockResolvedValue({ title: "Allenamento", dateSlug: null });
    p.trainingSession.update.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/teams/sess-flow-2", {
      method: "POST",
      body: JSON.stringify({ numTeams: 2 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postTeams(req, { params: Promise.resolve({ sessionId }) });
    expect(res.status).toBe(200);

    // Verifica che le squadre salvate contengano tutti e 4 gli atleti
    const updateCall = p.trainingSession.update.mock.calls[0][0];
    const saved = updateCall.data.teams as { teamA: { id: string }[]; teamB: { id: string }[] };
    const allIds = [...saved.teamA.map((a: { id: string }) => a.id), ...saved.teamB.map((a: { id: string }) => a.id)];
    expect(allIds).toHaveLength(4);
    expect(allIds).toContain("r1");
    expect(allIds).toContain("r4");
  });

  it("rigenerare dopo la rimozione di un atleta esclude l'atleta rimosso", async () => {
    const fourAthletes = [
      { id: "r1", name: "A", role: 1, userId: "u1", childId: null, registeredAsCoach: false, createdAt: new Date() },
      { id: "r2", name: "B", role: 2, userId: "u2", childId: null, registeredAsCoach: false, createdAt: new Date() },
      { id: "r3", name: "C", role: 3, userId: "u3", childId: null, registeredAsCoach: false, createdAt: new Date() },
      { id: "r4", name: "D", role: 4, userId: "u4", childId: null, registeredAsCoach: false, createdAt: new Date() },
    ];

    // Prima generazione: 4 atleti
    p.registration.findMany.mockResolvedValue(fourAthletes);
    p.trainingSession.findUnique.mockResolvedValue({ title: "Allenamento", dateSlug: null });
    p.trainingSession.update.mockResolvedValue({});

    const req1 = new NextRequest("http://localhost/api/teams/sess-flow-2", {
      method: "POST", body: JSON.stringify({ numTeams: 2 }), headers: { "Content-Type": "application/json" },
    });
    await postTeams(req1, { params: Promise.resolve({ sessionId }) });
    const ids1 = (() => {
      const saved = p.trainingSession.update.mock.calls[0][0].data.teams as { teamA: { id: string }[]; teamB: { id: string }[] };
      return [...saved.teamA.map((a: { id: string }) => a.id), ...saved.teamB.map((a: { id: string }) => a.id)];
    })();
    expect(ids1).toHaveLength(4);

    // Simula rimozione di r4: seconda generazione con 3 atleti
    p.registration.findMany.mockResolvedValue(fourAthletes.slice(0, 3));
    p.trainingSession.update.mockClear();

    const req2 = new NextRequest("http://localhost/api/teams/sess-flow-2", {
      method: "POST", body: JSON.stringify({ numTeams: 2 }), headers: { "Content-Type": "application/json" },
    });
    await postTeams(req2, { params: Promise.resolve({ sessionId }) });
    const saved2 = p.trainingSession.update.mock.calls[0][0].data.teams as { teamA: { id: string }[]; teamB: { id: string }[] };
    const ids2 = [...saved2.teamA.map((a: { id: string }) => a.id), ...saved2.teamB.map((a: { id: string }) => a.id)];
    expect(ids2).toHaveLength(3);
    expect(ids2).not.toContain("r4");
  });
});

// ── Flow 3: link-request accept → user role + sportRole aggiornati ────────────

describe("Flow: link-request accept → appRole + sportRole utente aggiornati", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "target-user" } });
    p.appNotification.create.mockResolvedValue({});
    p.linkRequest.update.mockResolvedValue({});
    p.child.update.mockResolvedValue({});
    // $transaction: esegue il callback con p come tx
    p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  });

  it("accettare il link aggiorna appRole GUEST→ATHLETE e imposta sportRole dal figlio", async () => {
    p.linkRequest.findUnique.mockResolvedValue({
      id: "req-1",
      childId: "child-1",
      parentId: "parent-1",
      targetUserId: "target-user",
      status: "PENDING",
      expiresAt: null,
      child: { id: "child-1", name: "Luca", sportRole: 2, sportRoleVariant: "T" },
      parent: { id: "parent-1", name: "Genitore" },
    });
    // Prima findUnique: utente respondente (per il nome nel log)
    // Seconda findUnique (dentro tx): utente target per aggiornare ruolo
    p.user.findUnique
      .mockResolvedValueOnce({ id: "target-user", name: "Target", appRole: "GUEST", sportRole: null })
      .mockResolvedValueOnce({ id: "target-user", appRole: "GUEST", sportRole: null });
    p.child.findUnique.mockResolvedValue(null); // nessun figlio già collegato

    const req = new NextRequest("http://localhost/api/link-requests/req-1/respond", {
      method: "POST",
      body: JSON.stringify({ accept: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await respondLinkRequest(req, { params: Promise.resolve({ requestId: "req-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ACCEPTED");

    // Verifica che user.update sia stato chiamato con appRole ATHLETE e sportRole dal figlio
    const updateData = p.user.update.mock.calls[0][0].data;
    expect(updateData.appRole).toBe("ATHLETE");
    expect(updateData.sportRole).toBe(2);

    // Verifica che il child sia stato collegato all'utente
    expect(p.child.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "target-user" } })
    );
  });

  it("rifiutare il link non modifica appRole né sportRole dell'utente", async () => {
    p.linkRequest.findUnique.mockResolvedValue({
      id: "req-2",
      childId: "child-1",
      parentId: "parent-1",
      targetUserId: "target-user",
      status: "PENDING",
      expiresAt: null,
      child: { id: "child-1", name: "Luca", sportRole: 2, sportRoleVariant: null },
      parent: { id: "parent-1", name: "Genitore" },
    });
    p.user.findUnique.mockResolvedValue({ id: "target-user", name: "Target", appRole: "GUEST", sportRole: null });

    const req = new NextRequest("http://localhost/api/link-requests/req-2/respond", {
      method: "POST",
      body: JSON.stringify({ accept: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await respondLinkRequest(req, { params: Promise.resolve({ requestId: "req-2" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("REJECTED");

    // Nessun aggiornamento all'utente né al figlio
    expect(p.user.update).not.toHaveBeenCalled();
    expect(p.child.update).not.toHaveBeenCalled();
  });
});
