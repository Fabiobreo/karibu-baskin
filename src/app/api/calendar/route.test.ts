import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: { findMany: vi.fn() },
    match: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

type PrismaMock = {
  trainingSession: { findMany: Mock };
  match: { findMany: Mock };
  event: { findMany: Mock };
};
const p = prisma as unknown as PrismaMock;

const trainingStub = {
  id: "sess-1",
  title: "Allenamento Lunedì",
  date: new Date("2025-07-07T17:00:00Z"),
  endTime: new Date("2025-07-07T19:00:00Z"),
  dateSlug: "2025-07-07",
  team: { id: "team-a", name: "Karibu A", color: "#FF6D00" },
  restrictTeam: null,
};

const matchStub = {
  id: "match-1",
  slug: "karibu-vs-avversario-2025-07-14",
  date: new Date("2025-07-14T15:00:00Z"),
  isHome: true,
  venue: "Palazzetto",
  result: "52-48",
  team: { id: "team-a", name: "Karibu A", color: "#FF6D00" },
  opponent: { name: "Avversario FC" },
};

const eventStub = {
  id: "evt-1",
  title: "Torneo Estivo",
  date: new Date("2025-07-20T09:00:00Z"),
  endDate: new Date("2025-07-21T18:00:00Z"),
  location: "Vicenza",
  description: null,
};

function makeRequest(search = ""): Request {
  return new Request(`http://localhost/api/calendar${search}`);
}

describe("GET /api/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.trainingSession.findMany.mockResolvedValue([]);
    p.match.findMany.mockResolvedValue([]);
    p.event.findMany.mockResolvedValue([]);
  });

  it("restituisce 200 con array vuoto se non ci sono dati", async () => {
    const res = await GET(makeRequest("?month=2025-07"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("mappa correttamente un allenamento", async () => {
    p.trainingSession.findMany.mockResolvedValue([trainingStub]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json).toHaveLength(1);
    const item = json[0];
    expect(item.type).toBe("training");
    expect(item.title).toBe("Allenamento Lunedì");
    expect(item.teamId).toBe("team-a");
    expect(item.teamColor).toBe("#FF6D00");
    expect(item.teamName).toBe("Karibu A");
    expect(item.href).toBe("/allenamento/2025-07-07");
    expect(item.endDate).toBe(trainingStub.endTime.toISOString());
  });

  it("usa l'id come href quando dateSlug è null", async () => {
    p.trainingSession.findMany.mockResolvedValue([{ ...trainingStub, dateSlug: null }]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].href).toBe("/allenamento/sess-1");
  });

  it("non inventa un colore per allenamenti senza squadra", async () => {
    // Il colore dello sfondo lo decide il tipo di evento, lato client, dal tema:
    // qui esce solo l'accento squadra, che senza squadra non c'e'.
    p.trainingSession.findMany.mockResolvedValue([
      { ...trainingStub, team: null, restrictTeam: null },
    ]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].teamColor).toBeNull();
    expect(json[0].teamId).toBeUndefined();
  });

  it("ricade su restrictTeam quando l'allenamento non ha teamId", async () => {
    // Il caso reale: `teamId` non e' scrivibile da nessuna parte dell'app,
    // quindi in produzione e' sempre null e la squadra sta su `restrictTeamId`.
    p.trainingSession.findMany.mockResolvedValue([
      {
        ...trainingStub,
        team: null,
        restrictTeam: { id: "karigin", name: "KariGin", color: "#8E24AA" },
      },
    ]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].teamId).toBe("karigin");
    expect(json[0].teamColor).toBe("#8E24AA");
    expect(json[0].teamName).toBe("KariGin");
  });

  it("preferisce teamId a restrictTeam quando ci sono entrambi", async () => {
    p.trainingSession.findMany.mockResolvedValue([
      {
        ...trainingStub,
        restrictTeam: { id: "karigin", name: "KariGin", color: "#8E24AA" },
      },
    ]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].teamId).toBe("team-a");
  });

  it("mappa correttamente una partita in casa", async () => {
    p.match.findMany.mockResolvedValue([matchStub]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json).toHaveLength(1);
    const item = json[0];
    expect(item.type).toBe("match");
    expect(item.title).toBe("vs Avversario FC");
    expect(item.isHome).toBe(true);
    expect(item.result).toBe("52-48");
    expect(item.location).toBe("Palazzetto");
    expect(item.href).toBe("/partite/karibu-vs-avversario-2025-07-14");
  });

  it("mappa correttamente una partita in trasferta", async () => {
    p.match.findMany.mockResolvedValue([{ ...matchStub, isHome: false }]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].title).toBe("@ Avversario FC");
    expect(json[0].isHome).toBe(false);
  });

  it("usa l'id come href per partite senza slug", async () => {
    p.match.findMany.mockResolvedValue([{ ...matchStub, slug: null }]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].href).toBe("/partite/match-1");
  });

  it("non inventa un colore per partite senza squadra", async () => {
    p.match.findMany.mockResolvedValue([{ ...matchStub, team: null }]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].teamColor).toBeNull();
    expect(json[0].teamId).toBeUndefined();
  });

  it("mappa correttamente un evento", async () => {
    p.event.findMany.mockResolvedValue([eventStub]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json).toHaveLength(1);
    const item = json[0];
    expect(item.type).toBe("event");
    expect(item.title).toBe("Torneo Estivo");
    expect(item.teamColor).toBeUndefined();
    expect(item.location).toBe("Vicenza");
    expect(item.endDate).toBe(eventStub.endDate.toISOString());
  });

  it("ordina gli eventi per data crescente", async () => {
    p.trainingSession.findMany.mockResolvedValue([trainingStub]); // July 7
    p.match.findMany.mockResolvedValue([matchStub]); // July 14
    p.event.findMany.mockResolvedValue([eventStub]); // July 20
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json).toHaveLength(3);
    expect(json[0].type).toBe("training");
    expect(json[1].type).toBe("match");
    expect(json[2].type).toBe("event");
  });

  it("passa il filtro di data del mese nel fuso di Roma", async () => {
    await GET(makeRequest("?month=2025-07"));
    expect(p.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: {
            gte: new Date("2025-06-30T22:00:00.000Z"),
            lt: new Date("2025-07-31T22:00:00.000Z"),
          },
        },
      })
    );
  });

  it("usa l'intervallo from/to della griglia, giorni fuori mese compresi", async () => {
    const from = "2026-09-27T22:00:00.000Z";
    const to = "2026-11-08T23:00:00.000Z";
    await GET(makeRequest(`?from=${from}&to=${to}`));
    const range = { gte: new Date(from), lt: new Date(to) };
    expect(p.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { date: range } })
    );
    expect(p.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { date: range } })
    );
    expect(p.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: { lt: new Date(to) },
          OR: [
            { endDate: { gte: new Date(from) } },
            { endDate: null, date: { gte: new Date(from) } },
          ],
        },
      })
    );
  });

  it("usa il mese corrente se i parametri sono assenti o non validi", async () => {
    await GET(makeRequest("?month=luglio"));
    expect(p.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: expect.any(Date), lt: expect.any(Date) } },
      })
    );
  });
});
