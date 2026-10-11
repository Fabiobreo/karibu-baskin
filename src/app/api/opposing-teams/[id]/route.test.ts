import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    opposingTeam: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
    },
    match: { count: vi.fn().mockResolvedValue(0) },
    groupMatch: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { PUT, DELETE } from "./route";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { Prisma } from "@prisma/client";

type PrismaMock = {
  opposingTeam: { findUnique: Mock; update: Mock; delete: Mock };
  match: { count: Mock };
  groupMatch: { count: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsStaff = isCoachOrAdmin as Mock;

const makeParams = (id: string) =>
  ({ params: Promise.resolve({ id }) }) as { params: Promise<{ id: string }> };

const baseTeam = { id: "opp-1", name: "Basket Vicenza", city: "Vicenza", notes: null };

describe("PUT /api/opposing-teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStaff.mockResolvedValue(false);
    p.opposingTeam.update.mockResolvedValue(baseTeam);
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nuovo Nome" }),
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "BAD_JSON",
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(400);
  });

  it("aggiorna la squadra con trim e restituisce 200", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Basket Vicenza Aggiornato  ", city: "  Vicenza  " }),
    });
    const res = await PUT(req, makeParams("opp-1"));
    expect(res.status).toBe(200);
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect(updateData.name).toBe("Basket Vicenza Aggiornato");
    expect(updateData.city).toBe("Vicenza");
  });

  it("imposta city=null per stringa vuota", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: "" }),
    });
    await PUT(req, makeParams("opp-1"));
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect(updateData.city).toBeNull();
  });

  it("non aggiorna i campi non forniti nel body", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Squadra forte" }),
    });
    await PUT(req, makeParams("opp-1"));
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect("name" in updateData).toBe(false);
    expect("city" in updateData).toBe(false);
    expect(updateData.notes).toBe("Squadra forte");
    // L'anagrafica non tocca la scheda dello staff, né la sua data.
    expect("scoutingProfile" in updateData).toBe(false);
    expect("scoutingUpdatedAt" in updateData).toBe(false);
  });

  const putSheet = (body: unknown) =>
    PUT(
      new Request("http://localhost/api/opposing-teams/opp-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      makeParams("opp-1")
    );

  it("salva la scheda (forza e valutazione per ruolo) e ne aggiorna la data", async () => {
    mockIsStaff.mockResolvedValue(true);
    const scoutingProfile = {
      categories: {
        "5": {
          strength: "STRONG",
          physicality: "HIGH",
          players: [{ number: "14", initials: "T.C.", note: "Cerca il contatto" }],
        },
      },
      notes: "Pressano a tutto campo",
    };
    const res = await putSheet({ ratingMu: 32.5, scoutingProfile });
    expect(res.status).toBe(200);
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect(updateData.ratingMu).toBe(32.5);
    expect(updateData.scoutingProfile).toEqual(scoutingProfile);
    expect(updateData.scoutingUpdatedAt).toBeInstanceOf(Date);
  });

  it("la scheda ha la sua voce nel registro, senza i testi delle note", async () => {
    mockIsStaff.mockResolvedValue(true);
    (auth as Mock).mockResolvedValue({ user: { id: "coach-1" } });
    p.opposingTeam.findUnique.mockResolvedValueOnce({
      name: "Basket Vicenza",
      ratingMu: null,
      scoutingProfile: null,
    });
    const scoutingProfile = {
      categories: {
        "4": {
          strength: "STRONG",
          physicality: "HIGH",
          players: [{ number: "14", initials: "T.C.", note: "Cerca il contatto" }],
        },
      },
      notes: "Pressano a tutto campo",
    };
    p.opposingTeam.update.mockResolvedValueOnce({ ...baseTeam, ratingMu: 32.5, scoutingProfile });
    await putSheet({ ratingMu: 32.5, scoutingProfile });

    // Solo la scheda: nessuna "modifica squadra" vuota accanto.
    const calls = (logAudit as Mock).mock.calls.map((c) => c[0]);
    expect(calls.map((c) => c.action)).toEqual(["UPDATE_OPPONENT_SHEET"]);
    expect(calls[0]).toMatchObject({
      actorId: "coach-1",
      targetType: "OpposingTeam",
      targetId: "opp-1",
      before: { forza: "Non impostata", ruoli: {}, giocatoriSegnalati: 0, notaSullaSquadra: false },
      after: {
        forza: "Forte",
        ruoli: { "4": "Forte, fisicità alta" },
        giocatoriSegnalati: 1,
        notaSullaSquadra: true,
      },
    });
    const logged = JSON.stringify(calls[0]);
    expect(logged).not.toContain("Cerca il contatto");
    expect(logged).not.toContain("T.C.");
    expect(logged).not.toContain("Pressano");
  });

  it("l'anagrafica resta una voce a parte", async () => {
    mockIsStaff.mockResolvedValue(true);
    (auth as Mock).mockResolvedValue({ user: { id: "coach-1" } });
    await putSheet({ city: "Vicenza" });
    expect((logAudit as Mock).mock.calls.map((c) => c[0].action)).toEqual(["UPDATE_OPPOSING_TEAM"]);
  });

  it("una scheda svuotata torna null sul DB, non un JSON null", async () => {
    mockIsStaff.mockResolvedValue(true);
    await putSheet({ ratingMu: null, scoutingProfile: null });
    const updateData = p.opposingTeam.update.mock.calls[0][0].data;
    expect(updateData.ratingMu).toBeNull();
    expect(updateData.scoutingProfile).toBe(Prisma.DbNull);
    expect(updateData.scoutingUpdatedAt).toBeInstanceOf(Date);
  });

  it("rifiuta una scheda con un ruolo o un valore che non esiste", async () => {
    mockIsStaff.mockResolvedValue(true);
    const bad = [
      { categories: { "6": { strength: "STRONG", physicality: "HIGH" } } },
      { categories: { "5": { strength: "ENORME", physicality: "HIGH" } } },
      // Giocatori segnalati: mai un nome intero, mai una nota senza di chi si parla.
      {
        categories: {
          "4": {
            strength: "STRONG",
            physicality: "HIGH",
            players: [{ initials: "Tizio Caio", note: "Provoca" }],
          },
        },
      },
      {
        categories: {
          "4": { strength: "STRONG", physicality: "HIGH", players: [{ note: "Provoca" }] },
        },
      },
    ];
    for (const scoutingProfile of bad) {
      expect((await putSheet({ scoutingProfile })).status).toBe(400);
    }
    expect(p.opposingTeam.update).not.toHaveBeenCalled();
  });

  it("restituisce 404 se la squadra non esiste più", async () => {
    mockIsStaff.mockResolvedValue(true);
    p.opposingTeam.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      })
    );
    expect((await putSheet({ ratingMu: 25 })).status).toBe(404);
  });
});

describe("DELETE /api/opposing-teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStaff.mockResolvedValue(false);
    p.opposingTeam.delete.mockResolvedValue(baseTeam);
    p.match.count.mockResolvedValue(0);
    p.groupMatch.count.mockResolvedValue(0);
  });

  it("restituisce 409 e non elimina se la squadra compare in partite del club", async () => {
    // Sul DB la FK delle partite del club è ON DELETE SET NULL: la delete
    // riuscirebbe lasciando partite senza avversario.
    mockIsStaff.mockResolvedValue(true);
    p.opposingTeam.findUnique.mockResolvedValueOnce({ name: "Basket Vicenza", city: null });
    p.match.count.mockResolvedValueOnce(2);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Basket Vicenza");
    expect(p.match.count).toHaveBeenCalledWith({ where: { opponentId: "opp-1" } });
    expect(p.opposingTeam.delete).not.toHaveBeenCalled();
  });

  it("restituisce 409 e non elimina se la squadra compare in partite di girone", async () => {
    mockIsStaff.mockResolvedValue(true);
    p.groupMatch.count.mockResolvedValueOnce(1);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(409);
    expect(p.groupMatch.count).toHaveBeenCalledWith({
      where: { OR: [{ homeTeamId: "opp-1" }, { awayTeamId: "opp-1" }] },
    });
    expect(p.opposingTeam.delete).not.toHaveBeenCalled();
  });

  it("restituisce 403 per utente non staff", async () => {
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(403);
  });

  it("elimina la squadra avversaria e restituisce 204", async () => {
    mockIsStaff.mockResolvedValue(true);
    const req = new Request("http://localhost/api/opposing-teams/opp-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(204);
    expect(p.opposingTeam.delete).toHaveBeenCalledWith({ where: { id: "opp-1" } });
  });

  it("restituisce 409 con un messaggio se la squadra ha partite collegate (P2003)", async () => {
    mockIsStaff.mockResolvedValue(true);
    p.opposingTeam.findUnique.mockResolvedValueOnce({ name: "Basket Vicenza", city: null });
    p.opposingTeam.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "test",
      })
    );
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Basket Vicenza");
    expect(body.error).toContain("partite");
  });

  it("restituisce 404 se la squadra non esiste più (P2025)", async () => {
    mockIsStaff.mockResolvedValue(true);
    p.opposingTeam.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      })
    );
    const req = new Request("http://localhost/api/opposing-teams/opp-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("opp-1"));
    expect(res.status).toBe(404);
  });
});
