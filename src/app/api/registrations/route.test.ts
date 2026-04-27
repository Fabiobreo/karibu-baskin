import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    registration: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    trainingSession: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    child: {
      findUnique: vi.fn(),
    },
    teamMembership: {
      findFirst: vi.fn(),
    },
  },
}));

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

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { checkRateLimit } from "@/lib/rateLimit";

type PrismaMock = {
  registration: { findFirst: Mock; create: Mock };
  trainingSession: { findUnique: Mock };
  user: { findUnique: Mock; update: Mock };
  child: { findUnique: Mock };
  teamMembership: { findFirst: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;
const mockCheckRateLimit = checkRateLimit as Mock;

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
  });
});
