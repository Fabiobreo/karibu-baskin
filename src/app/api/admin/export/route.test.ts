import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    trainingSession: { findMany: vi.fn() },
    playerMatchStats: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  user: { findMany: Mock };
  trainingSession: { findMany: Mock };
  playerMatchStats: { findMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

function makeGet(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/admin/export");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe("GET /api/admin/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
  });

  it("restituisce 403 per utente non staff", async () => {
    const res = await GET(makeGet({ type: "rosa" }));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per formato stagione non valido", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await GET(makeGet({ type: "rosa", season: "2025-2026" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("stagione");
  });

  it("restituisce 400 per tipo export non valido", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await GET(makeGet({ type: "unknown" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Tipo di export");
  });

  describe("type=rosa", () => {
    beforeEach(() => {
      mockIsCoachOrAdmin.mockResolvedValue(true);
      p.user.findMany.mockResolvedValue([
        {
          name: "Mario Rossi",
          email: "mario@example.com",
          appRole: "ATHLETE",
          sportRole: 3,
          sportRoleVariant: null,
          gender: "MALE",
          birthDate: new Date("1990-05-15"),
          teamMemberships: [{ team: { name: "Arancioni", season: "2025-26" }, isCaptain: true }],
          _count: { registrations: 10 },
        },
      ]);
    });

    it("restituisce CSV con header corretto", async () => {
      const res = await GET(makeGet({ type: "rosa" }));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      const text = await res.text();
      expect(text).toContain("Nome");
      expect(text).toContain("Email");
      expect(text).toContain("Ruolo Baskin");
    });

    it("include i dati dell'atleta nella riga CSV", async () => {
      const res = await GET(makeGet({ type: "rosa" }));
      const text = await res.text();
      expect(text).toContain("Mario Rossi");
      expect(text).toContain("mario@example.com");
      expect(text).toContain("Atleta");
      expect(text).toContain("1990-05-15");
    });

    it("usa filename con stagione se season è fornita", async () => {
      const res = await GET(makeGet({ type: "rosa", season: "2025-26" }));
      expect(res.headers.get("Content-Disposition")).toContain("rosa-2025-26.csv");
    });

    it("usa filename senza stagione se season non è fornita", async () => {
      const res = await GET(makeGet({ type: "rosa" }));
      expect(res.headers.get("Content-Disposition")).toContain("rosa.csv");
    });

    it("protegge i valori che iniziano con = dalla formula injection", async () => {
      p.user.findMany.mockResolvedValue([
        {
          name: "=CMD|'/c calc'!A0",
          email: "safe@example.com",
          appRole: "ATHLETE",
          sportRole: null,
          sportRoleVariant: null,
          gender: null,
          birthDate: null,
          teamMemberships: [],
          _count: { registrations: 0 },
        },
      ]);
      const res = await GET(makeGet({ type: "rosa" }));
      const text = await res.text();
      // The value must be prefixed with ' to neutralize the formula
      expect(text).toContain("'=CMD");
      expect(text).not.toContain('"=CMD');
    });

    it("protegge i valori che iniziano con + o - dalla formula injection", async () => {
      p.user.findMany.mockResolvedValue([
        {
          name: "+1234",
          email: "-ROUND(A1)",
          appRole: "ATHLETE",
          sportRole: null,
          sportRoleVariant: null,
          gender: null,
          birthDate: null,
          teamMemberships: [],
          _count: { registrations: 0 },
        },
      ]);
      const res = await GET(makeGet({ type: "rosa" }));
      const text = await res.text();
      expect(text).toContain("'+1234");
      expect(text).toContain("'-ROUND");
    });
  });

  describe("type=presenze", () => {
    beforeEach(() => {
      mockIsCoachOrAdmin.mockResolvedValue(true);
      p.trainingSession.findMany.mockResolvedValue([
        {
          title: "Allenamento lunedì",
          date: new Date("2025-11-10"),
          registrations: [
            { name: "Mario", role: 3, registeredAsCoach: false, user: { email: "mario@example.com" } },
            { name: "Coach", role: 1, registeredAsCoach: true, user: null },
          ],
        },
      ]);
    });

    it("restituisce CSV con header corretto per presenze", async () => {
      const res = await GET(makeGet({ type: "presenze" }));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Data");
      expect(text).toContain("Allenamento");
      expect(text).toContain("Atleta");
    });

    it("include le righe di presenza con data e nome allenamento", async () => {
      const res = await GET(makeGet({ type: "presenze" }));
      const text = await res.text();
      expect(text).toContain("2025-11-10");
      expect(text).toContain("Allenamento lunedì");
      expect(text).toContain("Mario");
    });

    it("distingue Coach da Atleta nel campo Tipo", async () => {
      const res = await GET(makeGet({ type: "presenze" }));
      const text = await res.text();
      expect(text).toContain("Coach");
      expect(text).toContain("Atleta");
    });

    it("usa filename con stagione se season è fornita", async () => {
      const res = await GET(makeGet({ type: "presenze", season: "2025-26" }));
      expect(res.headers.get("Content-Disposition")).toContain("presenze-2025-26.csv");
    });
  });

  describe("type=stats", () => {
    beforeEach(() => {
      mockIsCoachOrAdmin.mockResolvedValue(true);
      p.playerMatchStats.findMany.mockResolvedValue([
        {
          user: { name: "Luca", email: "luca@example.com", sportRole: 2, sportRoleVariant: null },
          match: {
            date: new Date("2025-12-01"),
            team: { name: "Arancioni" },
            opponent: { name: "Verona" },
            result: "WIN",
            ourScore: 60,
            theirScore: 45,
          },
          points: 12,
          baskets: 4,
          assists: 3,
          rebounds: 5,
          fouls: 2,
        },
      ]);
    });

    it("restituisce CSV con header statistiche corretto", async () => {
      const res = await GET(makeGet({ type: "stats" }));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Punti");
      expect(text).toContain("Canestri");
      expect(text).toContain("Assist");
    });

    it("include dati giocatore e partita nelle righe", async () => {
      const res = await GET(makeGet({ type: "stats" }));
      const text = await res.text();
      expect(text).toContain("Luca");
      expect(text).toContain("Verona");
      expect(text).toContain("2025-12-01");
    });

    it("usa filename con stagione e teamId se forniti", async () => {
      const res = await GET(makeGet({ type: "stats", season: "2025-26" }));
      expect(res.headers.get("Content-Disposition")).toContain("statistiche-2025-26.csv");
    });

    it("restituisce CSV vuoto (solo header) se non ci sono statistiche", async () => {
      p.playerMatchStats.findMany.mockResolvedValue([]);
      const res = await GET(makeGet({ type: "stats" }));
      expect(res.status).toBe(200);
      const text = await res.text();
      const lines = text.trim().split("\r\n");
      expect(lines).toHaveLength(1); // solo header
    });
  });
});
