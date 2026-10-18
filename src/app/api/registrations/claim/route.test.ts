import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => {
  const tx = {
    registration: { findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    child: { findUnique: vi.fn() },
    trainingSession: { findUnique: vi.fn(), update: vi.fn() },
  };
  return {
    prisma: { ...tx, $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)) },
  };
});

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  $transaction: Mock;
  registration: { findMany: Mock; update: Mock; delete: Mock };
  child: { findUnique: Mock };
  trainingSession: { findUnique: Mock; update: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/registrations/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const anon = (id: string, sessionId: string, extra: Record<string, unknown> = {}) => ({
  id,
  sessionId,
  attended: null,
  note: null,
  ...extra,
});

/** Prima findMany: le anonime; seconda: le iscrizioni dell'account negli stessi allenamenti. */
function setRows(anonymous: unknown[], own: unknown[] = []) {
  p.registration.findMany.mockResolvedValueOnce(anonymous).mockResolvedValueOnce(own);
}

describe("POST /api/registrations/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Mario Rossi", email: "Mario@Example.com" },
    });
    p.$transaction.mockImplementation((cb: (t: PrismaMock) => unknown) => cb(p));
    p.registration.findMany.mockResolvedValue([]);
    p.child.findUnique.mockResolvedValue(null);
    p.trainingSession.findUnique.mockResolvedValue({ teams: null });
  });

  it("restituisce 401 se l'utente non è autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost({}));
    expect(res.status).toBe(401);
    expect(p.registration.update).not.toHaveBeenCalled();
  });

  it("restituisce 401 se manca il nome utente nella sessione", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: null } });
    const res = await POST(makePost({}));
    expect(res.status).toBe(401);
  });

  it("cerca solo anonime con lo stesso nome, fra gli id richiesti", async () => {
    await POST(makePost({ ids: ["r1", "r2"] }));
    expect(p.registration.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["r1", "r2"] },
      userId: null,
      childId: null,
      name: { equals: "Mario Rossi", mode: "insensitive" },
      // Un omonimo non prende un'iscrizione che ha lasciato un'altra email.
      OR: [{ anonymousEmail: null }, { anonymousEmail: "mario@example.com" }],
    });
  });

  it("due collegamenti in parallelo: il secondo riceve 409, non 500", async () => {
    const { Prisma } = await import("@prisma/client");
    p.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025", clientVersion: "6" })
    );
    const res = await POST(makePost({ ids: ["r1"] }));
    expect(res.status).toBe(409);
  });

  it("senza id cerca tutte le anonime con il nome dell'account", async () => {
    await POST(makePost({ ids: [] }));
    expect(p.registration.findMany.mock.calls[0][0].where).not.toHaveProperty("id");
  });

  it("restituisce 0 se non c'è niente da collegare", async () => {
    const res = await POST(makePost({ ids: ["r-other"] }));
    expect(await res.json()).toEqual({ claimed: 0, merged: 0 });
    expect(p.registration.update).not.toHaveBeenCalled();
  });

  it("assegna all'account le anonime di allenamenti a cui non è iscritto", async () => {
    setRows([anon("r1", "s1"), anon("r2", "s2")]);
    const res = await POST(makePost({ ids: ["r1", "r2"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 2, merged: 0 });
    expect(p.registration.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { userId: "user-1" },
    });
    expect(p.registration.delete).not.toHaveBeenCalled();
  });

  it("fonde l'anonima se l'account è già iscritto allo stesso allenamento", async () => {
    setRows(
      [anon("anon", "s1", { attended: true, note: "Esco prima" })],
      [{ id: "kept", sessionId: "s1", attended: null, note: null }]
    );
    p.trainingSession.findUnique.mockResolvedValue({
      teams: { teamA: [{ id: "anon", name: "Mario Rossi", role: 3 }], teamB: [] },
    });

    const res = await POST(makePost({ ids: ["anon"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 0, merged: 1 });
    // Niente assegnazione: avrebbe violato l'unicità (allenamento, utente).
    expect(p.registration.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "anon" } })
    );
    expect(p.registration.update).toHaveBeenCalledWith({
      where: { id: "kept" },
      data: { attended: true, note: "Esco prima" },
    });
    expect(p.registration.delete).toHaveBeenCalledWith({ where: { id: "anon" } });
    expect(p.trainingSession.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { teams: { teamA: [{ id: "kept", name: "Mario Rossi", role: 3 }], teamB: [] } },
    });
  });

  it("considera già iscritto anche chi lo è tramite la propria scheda figlio", async () => {
    p.child.findUnique.mockResolvedValue({ id: "child-1" });
    setRows(
      [anon("anon", "s1")],
      [{ id: "via-child", sessionId: "s1", attended: null, note: null }]
    );

    const res = await POST(makePost({ ids: ["anon"] }));
    expect(await res.json()).toEqual({ claimed: 0, merged: 1 });
    expect(p.registration.findMany.mock.calls[1][0].where.OR).toEqual([
      { userId: "user-1" },
      { childId: "child-1" },
    ]);
    expect(p.registration.delete).toHaveBeenCalledWith({ where: { id: "anon" } });
  });

  it("non riscrive le squadre se non nominano l'anonima", async () => {
    setRows([anon("anon", "s1")], [{ id: "kept", sessionId: "s1", attended: null, note: null }]);
    p.trainingSession.findUnique.mockResolvedValue({ teams: { teamA: [], teamB: [] } });
    await POST(makePost({ ids: ["anon"] }));
    expect(p.trainingSession.update).not.toHaveBeenCalled();
  });

  it("due anonime nello stesso allenamento: la prima si assegna, la seconda si fonde", async () => {
    setRows([anon("a1", "s1"), anon("a2", "s1")]);
    const res = await POST(makePost({}));
    expect(await res.json()).toEqual({ claimed: 1, merged: 1 });
    expect(p.registration.delete).toHaveBeenCalledWith({ where: { id: "a2" } });
  });

  it("risponde con un JSON leggibile se qualcosa fallisce", async () => {
    p.$transaction.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makePost({ ids: ["r1"] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Collegamento non riuscito. Riprova." });
  });
});
