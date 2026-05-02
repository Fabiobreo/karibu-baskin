import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => {
  // Shared mock objects so $transaction callback reuses the same spies as the outer prisma
  const registration = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  };
  const user = { findUnique: vi.fn(), update: vi.fn() };
  const child = { findUnique: vi.fn(), update: vi.fn() };
  return {
    prisma: {
      registration,
      trainingSession: { findUnique: vi.fn(), update: vi.fn() },
      user,
      child,
      teamMembership: { findFirst: vi.fn() },
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb({ registration, user, child })),
    },
  };
});

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { POST, PATCH, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { checkRateLimit } from "@/lib/rateLimit";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  registration: { findFirst: Mock; findMany: Mock; create: Mock; updateMany: Mock; deleteMany: Mock };
  trainingSession: { findUnique: Mock; update: Mock };
  user: { findUnique: Mock; update: Mock };
  child: { findUnique: Mock; update: Mock };
  teamMembership: { findFirst: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockCheckRateLimit = checkRateLimit as Mock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

const FUTURE_END = new Date(Date.now() + 4 * 60 * 60 * 1000);
const PAST_END = new Date(Date.now() - 1000);

const baseSession = {
  date: new Date(Date.now() + 2 * 60 * 60 * 1000),
  endTime: FUTURE_END,
  allowedRoles: [] as number[],
  restrictTeamId: null as string | null,
  openRoles: [] as number[],
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    mockAuth.mockResolvedValue(null);
    p.trainingSession.findUnique.mockResolvedValue({ ...baseSession });
    p.registration.findFirst.mockResolvedValue(null);
    p.registration.create.mockResolvedValue({ id: "reg-1", sessionId: "sess-1", role: 3, name: "Mario" });
    p.child.findUnique.mockResolvedValue(null);
    p.user.findUnique.mockResolvedValue(null);
    p.teamMembership.findFirst.mockResolvedValue(null);
  });

  it("restituisce 429 quando il rate limit è superato", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false });
    const res = await POST(makePost({ sessionId: "sess-1", role: 3, name: "Mario" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("Troppe richieste");
  });

  it("restituisce 400 per body con role fuori range", async () => {
    const res = await POST(makePost({ sessionId: "sess-1", role: 99 }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per body non JSON valido", async () => {
    const req = new NextRequest("http://localhost/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 404 se l'allenamento non esiste", async () => {
    p.trainingSession.findUnique.mockResolvedValue(null);
    const res = await POST(makePost({ sessionId: "sess-1", role: 3, name: "Mario" }));
    expect(res.status).toBe(404);
  });

  it("restituisce 400 se l'allenamento è già terminato", async () => {
    p.trainingSession.findUnique.mockResolvedValue({ ...baseSession, endTime: PAST_END });
    const res = await POST(makePost({ sessionId: "sess-1", role: 3, name: "Mario" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("chiuse");
  });

  describe("iscrizione anonima", () => {
    it("crea l'iscrizione e restituisce 201", async () => {
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, name: "Mario" }));
      expect(res.status).toBe(201);
      expect(p.registration.create).toHaveBeenCalledOnce();
      const data = p.registration.create.mock.calls[0][0].data;
      expect(data.name).toBe("Mario");
      expect(data.userId).toBeUndefined();
    });

    it("restituisce 400 se manca il nome", async () => {
      const res = await POST(makePost({ sessionId: "sess-1", role: 3 }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Nome obbligatorio");
    });

    it("restituisce 409 se il nome è già iscritto", async () => {
      p.registration.findFirst.mockResolvedValue({ id: "dup" });
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, name: "Mario" }));
      expect(res.status).toBe(409);
    });

    it("restituisce 403 se il ruolo non è tra quelli ammessi", async () => {
      p.trainingSession.findUnique.mockResolvedValue({
        ...baseSession,
        allowedRoles: [1, 2],
      });
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, name: "Mario" }));
      expect(res.status).toBe(403);
    });

    it("salva anonymousEmail normalizzata se fornita", async () => {
      const res = await POST(
        makePost({ sessionId: "sess-1", role: 3, name: "Mario", anonymousEmail: "MARIO@example.com" }),
      );
      expect(res.status).toBe(201);
      const data = p.registration.create.mock.calls[0][0].data;
      expect(data.anonymousEmail).toBe("mario@example.com");
    });
  });

  describe("iscrizione utente loggato", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "user-1", appRole: "ATHLETE" } });
      p.user.findUnique.mockResolvedValue({
        name: "Fabio",
        appRole: "ATHLETE",
        sportRole: 3,
        sportRoleSuggested: null,
      });
    });

    it("crea l'iscrizione con userId e restituisce 201", async () => {
      const res = await POST(makePost({ sessionId: "sess-1", role: 3 }));
      expect(res.status).toBe(201);
      const data = p.registration.create.mock.calls[0][0].data;
      expect(data.userId).toBe("user-1");
      expect(data.name).toBe("Fabio");
    });

    it("restituisce 409 se l'utente è già iscritto", async () => {
      p.registration.findFirst.mockResolvedValue({ id: "dup" });
      const res = await POST(makePost({ sessionId: "sess-1", role: 3 }));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("già iscritto");
    });

    it("restituisce 404 se l'utente non esiste nel DB", async () => {
      p.user.findUnique.mockResolvedValue(null);
      const res = await POST(makePost({ sessionId: "sess-1", role: 3 }));
      expect(res.status).toBe(404);
    });

    it("salva sportRoleSuggested se l'utente non ha ruolo confermato", async () => {
      p.user.findUnique.mockResolvedValue({ name: "Fabio", appRole: "ATHLETE", sportRole: null, sportRoleSuggested: null });
      p.child.findUnique.mockResolvedValue(null);
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, roleVariant: "A" }));
      expect(res.status).toBe(201);
      expect(p.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { sportRoleSuggested: 3, sportRoleSuggestedVariant: "A" },
      });
    });

    it("restituisce 409 se l'utente è già iscritto tramite il genitore", async () => {
      p.registration.findFirst.mockResolvedValue(null);
      p.child.findUnique.mockResolvedValue({ id: "child-linked" });
      // La seconda chiamata a findFirst (per linkedChild) restituisce una registrazione esistente
      p.registration.findFirst
        .mockResolvedValueOnce(null)        // check userId duplicate
        .mockResolvedValueOnce({ id: "existing-via-parent" }); // check childId duplicate
      const res = await POST(makePost({ sessionId: "sess-1", role: 3 }));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("tramite il tuo genitore");
    });
  });

  describe("iscrizione figlio (genitore loggato)", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: "parent-1", appRole: "PARENT" } });
      p.child.findUnique.mockResolvedValue({
        id: "child-1",
        name: "Luca",
        parentId: "parent-1",
        sportRole: 3,
        userId: null,
      });
      p.user.findUnique.mockResolvedValue({ appRole: "PARENT" });
    });

    it("crea l'iscrizione del figlio con childId e restituisce 201", async () => {
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, childId: "child-1" }));
      expect(res.status).toBe(201);
      const data = p.registration.create.mock.calls[0][0].data;
      expect(data.childId).toBe("child-1");
      expect(data.name).toBe("Luca");
      expect(data.userId).toBeUndefined();
    });

    it("restituisce 401 se il genitore non è autenticato", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, childId: "child-1" }));
      expect(res.status).toBe(401);
    });

    it("restituisce 404 se il figlio non esiste", async () => {
      p.child.findUnique.mockResolvedValue(null);
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, childId: "child-1" }));
      expect(res.status).toBe(404);
    });

    it("restituisce 403 se l'utente non è il genitore del figlio", async () => {
      p.child.findUnique.mockResolvedValue({
        id: "child-1",
        name: "Luca",
        parentId: "other-parent",
        sportRole: 3,
        userId: null,
      });
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, childId: "child-1" }));
      expect(res.status).toBe(403);
    });

    it("restituisce 409 se il figlio è già iscritto", async () => {
      p.registration.findFirst.mockResolvedValue({ id: "dup" });
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, childId: "child-1" }));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("già iscritto");
    });

    it("restituisce 403 se il ruolo non è ammesso per il figlio", async () => {
      p.trainingSession.findUnique.mockResolvedValue({
        ...baseSession,
        allowedRoles: [1, 2],
      });
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, childId: "child-1" }));
      expect(res.status).toBe(403);
    });

    it("restituisce 409 se il figlio è già iscritto tramite il proprio account", async () => {
      p.child.findUnique.mockResolvedValue({
        id: "child-1",
        name: "Luca",
        parentId: "parent-1",
        sportRole: 3,
        userId: "linked-user",
      });
      p.registration.findFirst
        .mockResolvedValueOnce(null)             // check childId duplicate
        .mockResolvedValueOnce({ id: "dup" });   // check linked userId
      const res = await POST(makePost({ sessionId: "sess-1", role: 3, childId: "child-1" }));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("proprio account");
    });

    it("salva il ruolo proposto sul figlio se non ha ruolo confermato", async () => {
      p.child.findUnique.mockResolvedValue({
        id: "child-1",
        name: "Luca",
        parentId: "parent-1",
        sportRole: null,
        userId: null,
      });
      const res = await POST(makePost({ sessionId: "sess-1", role: 2, roleVariant: "B", childId: "child-1" }));
      expect(res.status).toBe(201);
      expect(p.child.update).toHaveBeenCalledWith({
        where: { id: "child-1" },
        data: { sportRole: 2, sportRoleVariant: "B" },
      });
    });
  });
});

describe("PATCH /api/registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.registration.updateMany.mockResolvedValue({ count: 2 });
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new NextRequest("http://localhost/api/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["r1"], role: 2 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per body non valido (ids mancante)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: 2 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("aggiorna le iscrizioni anonime e restituisce 200 con updated count", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["r1", "r2"], role: 2 }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(2);
    expect(p.registration.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["r1", "r2"] }, userId: null, childId: null },
      data: { role: 2 },
    });
  });
});

describe("DELETE /api/registrations (bulk per nome)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.registration.findMany.mockResolvedValue([]);
    p.registration.deleteMany.mockResolvedValue({ count: 0 });
    p.trainingSession.update.mockResolvedValue(undefined);
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new NextRequest("http://localhost/api/registrations?name=Mario", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("restituisce 400 se manca il parametro name", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/registrations", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 204 (no content) se non ci sono iscrizioni anonime con quel nome", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.registration.findMany.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/registrations?name=Mario", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(204);
    expect(p.registration.deleteMany).not.toHaveBeenCalled();
  });

  it("elimina le iscrizioni e azzera le squadre degli allenamenti coinvolti", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.registration.findMany.mockResolvedValue([
      { id: "r1", sessionId: "sess-1" },
      { id: "r2", sessionId: "sess-2" },
    ]);
    const req = new NextRequest("http://localhost/api/registrations?name=Mario", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(204);
    expect(p.registration.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["r1", "r2"] } } });
    expect(p.trainingSession.update).toHaveBeenCalledTimes(2);
  });
});
