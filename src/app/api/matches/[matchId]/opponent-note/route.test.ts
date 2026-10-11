import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findUnique: vi.fn() },
    matchOpponentNote: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "coach-1" } }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { PUT } from "./route";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  match: { findUnique: Mock };
  matchOpponentNote: { upsert: Mock; deleteMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsStaff = isCoachOrAdmin as Mock;

const DAY = 24 * 60 * 60 * 1000;
const played = { opponentId: "opp-1", date: new Date(Date.now() - DAY), opponentNote: null };

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/matches/m-1/opponent-note", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ matchId: "m-1" }) }
  );

describe("PUT /api/matches/[matchId]/opponent-note", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStaff.mockResolvedValue(true);
    p.match.findUnique.mockResolvedValue(played);
    // Come Prisma con `select: { note: true }`: torna solo la nota salvata.
    p.matchOpponentNote.upsert.mockImplementation(({ create }) =>
      Promise.resolve({ note: create.note })
    );
    p.matchOpponentNote.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("403 per chi non è staff", async () => {
    mockIsStaff.mockResolvedValue(false);
    expect((await put({ note: "Ciao" })).status).toBe(403);
    expect(p.match.findUnique).not.toHaveBeenCalled();
  });

  it("400 per un corpo non valido", async () => {
    expect((await put("BAD_JSON")).status).toBe(400);
    expect((await put({})).status).toBe(400);
    expect((await put({ note: "x".repeat(1001) })).status).toBe(400);
  });

  it("404 se la partita non esiste", async () => {
    p.match.findUnique.mockResolvedValue(null);
    expect((await put({ note: "Ciao" })).status).toBe(404);
  });

  it("400 per un'amichevole interna: non c'è un'avversaria con una scheda", async () => {
    p.match.findUnique.mockResolvedValue({ ...played, opponentId: null });
    expect((await put({ note: "Ciao" })).status).toBe(400);
    expect(p.matchOpponentNote.upsert).not.toHaveBeenCalled();
  });

  it("409 per una partita non ancora iniziata", async () => {
    p.match.findUnique.mockResolvedValue({ ...played, date: new Date(Date.now() + DAY) });
    expect((await put({ note: "Ciao" })).status).toBe(409);
    expect(p.matchOpponentNote.upsert).not.toHaveBeenCalled();
  });

  it("salva la nota, senza spazi ai bordi", async () => {
    const res = await put({ note: "  Mancava il loro 5 titolare  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ note: "Mancava il loro 5 titolare" });
    expect(p.matchOpponentNote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId: "m-1" },
        create: { matchId: "m-1", note: "Mancava il loro 5 titolare" },
        select: { note: true },
        update: { note: "Mancava il loro 5 titolare" },
      })
    );
  });

  it("una nota vuota o null la toglie", async () => {
    for (const note of ["   ", null]) {
      const res = await put({ note });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ note: null });
    }
    expect(p.matchOpponentNote.deleteMany).toHaveBeenCalledTimes(2);
    expect(p.matchOpponentNote.upsert).not.toHaveBeenCalled();
  });

  it("lascia traccia nel registro di chi ha scritto la nota, senza il testo", async () => {
    await put({ note: "Mancava il loro 5 titolare" });
    expect(logAudit).toHaveBeenCalledTimes(1);
    const entry = (logAudit as Mock).mock.calls[0][0];
    expect(entry).toMatchObject({
      actorId: "coach-1",
      action: "UPDATE_OPPONENT_NOTE",
      targetType: "Match",
      targetId: "m-1",
      before: { nota: false, caratteri: 0 },
      after: { nota: true, caratteri: 26 },
    });
    expect(JSON.stringify(entry)).not.toContain("titolare");
  });

  it("registra anche la nota tolta, e non una nota salvata uguale", async () => {
    p.match.findUnique.mockResolvedValue({ ...played, opponentNote: { note: "Veloci" } });
    await put({ note: "Veloci" });
    expect(logAudit).not.toHaveBeenCalled();
    await put({ note: null });
    expect((logAudit as Mock).mock.calls[0][0]).toMatchObject({
      before: { nota: true, caratteri: 6 },
      after: { nota: false, caratteri: 0 },
    });
  });
});
