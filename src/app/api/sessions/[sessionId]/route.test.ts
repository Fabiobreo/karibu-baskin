import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { GET, PATCH, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  trainingSession: {
    findFirst: Mock;
    update: Mock;
    delete: Mock;
  };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

const baseSession = {
  id: "sess-abc",
  title: "Allenamento Test",
  date: new Date("2025-06-01T18:00:00Z"),
  endTime: new Date("2025-06-01T20:00:00Z"),
  dateSlug: "2025-06-01T18:00",
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
  teams: null,
  _count: { registrations: 3 },
  restrictTeam: null,
};

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function makeGet(sessionId: string): [NextRequest, ReturnType<typeof makeParams>] {
  return [
    new NextRequest(`http://localhost/api/sessions/${sessionId}`),
    makeParams(sessionId),
  ];
}

function makePATCH(
  sessionId: string,
  body: object,
): [NextRequest, ReturnType<typeof makeParams>] {
  return [
    new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    makeParams(sessionId),
  ];
}

function makeDELETE(sessionId: string): [NextRequest, ReturnType<typeof makeParams>] {
  return [
    new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
      method: "DELETE",
    }),
    makeParams(sessionId),
  ];
}

describe("GET /api/sessions/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.trainingSession.findFirst.mockResolvedValue(baseSession);
  });

  it("restituisce la sessione per ID (200)", async () => {
    const res = await GET(...makeGet("sess-abc"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("sess-abc");
    expect(json.title).toBe("Allenamento Test");
  });

  it("cerca per ID o dateSlug (OR clause)", async () => {
    await GET(...makeGet("2025-06-01T18:00"));
    const call = p.trainingSession.findFirst.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { id: "2025-06-01T18:00" },
      { dateSlug: "2025-06-01T18:00" },
    ]);
  });

  it("restituisce 404 se la sessione non esiste", async () => {
    p.trainingSession.findFirst.mockResolvedValue(null);
    const res = await GET(...makeGet("inesistente"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("include _count e restrictTeam nella risposta", async () => {
    const res = await GET(...makeGet("sess-abc"));
    const json = await res.json();
    expect(json._count).toEqual({ registrations: 3 });
    expect(json.restrictTeam).toBeNull();
  });
});

describe("PATCH /api/sessions/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.trainingSession.update.mockResolvedValue({
      ...baseSession,
      title: "Aggiornato",
    });
  });

  it("restituisce 401 se l'utente non è coach/admin", async () => {
    const res = await PATCH(...makePATCH("sess-abc", { title: "Nuovo" }));
    expect(res.status).toBe(401);
    expect(p.trainingSession.update).not.toHaveBeenCalled();
  });

  it("restituisce 400 per body non JSON valido", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const req = new NextRequest("http://localhost/api/sessions/sess-abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "NOT_JSON",
    });
    const res = await PATCH(req, makeParams("sess-abc"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 se il titolo è stringa vuota", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await PATCH(...makePATCH("sess-abc", { title: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("aggiorna il titolo con trim e restituisce 200", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await PATCH(...makePATCH("sess-abc", { title: "  Nuovo Titolo  " }));
    expect(res.status).toBe(200);
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.title).toBe("Nuovo Titolo");
  });

  it("aggiorna la data quando fornita", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await PATCH(...makePATCH("sess-abc", { date: "2025-07-10T18:00:00Z" }));
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.date).toBeInstanceOf(Date);
    expect((data.date as Date).toISOString()).toBe("2025-07-10T18:00:00.000Z");
  });

  it("imposta endTime a null quando il campo è presente con valore null", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await PATCH(...makePATCH("sess-abc", { endTime: null }));
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.endTime).toBeNull();
  });

  it("aggiorna allowedRoles e openRoles", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await PATCH(
      ...makePATCH("sess-abc", { allowedRoles: [1, 2, 3], openRoles: [1] }),
    );
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.allowedRoles).toEqual([1, 2, 3]);
    expect(data.openRoles).toEqual([1]);
  });

  it("imposta restrictTeamId a null per rimuovere la restrizione squadra", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await PATCH(...makePATCH("sess-abc", { restrictTeamId: null }));
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data.restrictTeamId).toBeNull();
  });

  it("non include campi assenti nel payload DB", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await PATCH(...makePATCH("sess-abc", { title: "Solo titolo" }));
    const data = p.trainingSession.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("date");
    expect(data).not.toHaveProperty("allowedRoles");
  });

  it("usa il sessionId corretto nella where clause", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await PATCH(...makePATCH("sess-xyz", { title: "Test" }));
    const call = p.trainingSession.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "sess-xyz" });
  });

  it("restituisce 404 se la sessione non esiste (P2025)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const p2025 = new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "6.0.0" });
    p.trainingSession.update.mockRejectedValue(p2025);
    const res = await PATCH(...makePATCH("inesistente", { title: "Test" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/non trovato/i);
  });
});

describe("DELETE /api/sessions/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.trainingSession.delete.mockResolvedValue(baseSession);
  });

  it("restituisce 401 se l'utente non è coach/admin", async () => {
    const res = await DELETE(...makeDELETE("sess-abc"));
    expect(res.status).toBe(401);
    expect(p.trainingSession.delete).not.toHaveBeenCalled();
  });

  it("elimina la sessione e restituisce 204", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await DELETE(...makeDELETE("sess-abc"));
    expect(res.status).toBe(204);
    expect(p.trainingSession.delete).toHaveBeenCalledOnce();
  });

  it("usa il sessionId corretto nella where clause", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    await DELETE(...makeDELETE("sess-xyz"));
    const call = p.trainingSession.delete.mock.calls[0][0];
    expect(call.where).toEqual({ id: "sess-xyz" });
  });

  it("il body della risposta 204 è vuoto", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await DELETE(...makeDELETE("sess-abc"));
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe("");
  });

  it("restituisce 404 se la sessione non esiste (P2025)", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const p2025 = new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "6.0.0" });
    p.trainingSession.delete.mockRejectedValue(p2025);
    const res = await DELETE(...makeDELETE("inesistente"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/non trovato/i);
  });
});
