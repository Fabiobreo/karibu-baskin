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
  team: { name: "Karibu A", color: "#FF6D00" },
};

const matchStub = {
  id: "match-1",
  slug: "karibu-vs-avversario-2025-07-14",
  date: new Date("2025-07-14T15:00:00Z"),
  isHome: true,
  venue: "Palazzetto",
  result: "52-48",
  team: { name: "Karibu A", color: "#FF6D00" },
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
    expect(item.color).toBe("#FF6D00");
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

  it("usa il colore di default #FF6D00 per allenamenti senza squadra", async () => {
    p.trainingSession.findMany.mockResolvedValue([{ ...trainingStub, team: null }]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].color).toBe("#FF6D00");
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

  it("usa il colore di default #F44336 per partite senza squadra", async () => {
    p.match.findMany.mockResolvedValue([{ ...matchStub, team: null }]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json[0].color).toBe("#F44336");
  });

  it("mappa correttamente un evento", async () => {
    p.event.findMany.mockResolvedValue([eventStub]);
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json).toHaveLength(1);
    const item = json[0];
    expect(item.type).toBe("event");
    expect(item.title).toBe("Torneo Estivo");
    expect(item.color).toBe("#039BE5");
    expect(item.location).toBe("Vicenza");
    expect(item.endDate).toBe(eventStub.endDate.toISOString());
  });

  it("ordina gli eventi per data crescente", async () => {
    p.trainingSession.findMany.mockResolvedValue([trainingStub]); // July 7
    p.match.findMany.mockResolvedValue([matchStub]);               // July 14
    p.event.findMany.mockResolvedValue([eventStub]);               // July 20
    const res = await GET(makeRequest("?month=2025-07"));
    const json = await res.json();
    expect(json).toHaveLength(3);
    expect(json[0].type).toBe("training");
    expect(json[1].type).toBe("match");
    expect(json[2].type).toBe("event");
  });

  it("passa il filtro di data corretto per il mese specificato", async () => {
    await GET(makeRequest("?month=2025-07"));
    expect(p.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: new Date(2025, 6, 1), lt: new Date(2025, 7, 1) } },
      })
    );
  });

  it("usa il mese corrente se il parametro month è assente", async () => {
    const now = new Date();
    const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await GET(makeRequest());
    expect(p.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: expectedStart, lt: expectedEnd } },
      })
    );
  });

  it("usa il mese corrente se il parametro month ha formato non valido", async () => {
    const now = new Date();
    const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
    await GET(makeRequest("?month=luglio"));
    expect(p.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: expectedStart, lt: expect.any(Date) } },
      })
    );
  });
});
