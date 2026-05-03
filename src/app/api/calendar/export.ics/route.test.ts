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

const baseDate = new Date("2025-09-10T09:00:00Z");

describe("GET /api/calendar/export.ics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.trainingSession.findMany.mockResolvedValue([]);
    p.match.findMany.mockResolvedValue([]);
    p.event.findMany.mockResolvedValue([]);
  });

  it("restituisce Content-Type text/calendar", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
  });

  it("restituisce header Content-Disposition attachment", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Disposition")).toContain("karibu-baskin.ics");
  });

  it("restituisce header Cache-Control no-store", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("restituisce calendaro vuoto con struttura VCALENDAR", async () => {
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("include VEVENT per allenamento con endTime", async () => {
    p.trainingSession.findMany.mockResolvedValue([{
      id: "s-1",
      title: "Allenamento Martedì",
      date: baseDate,
      endTime: new Date("2025-09-10T10:30:00Z"),
    }]);
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:training-s-1@karibubaskin.it");
    expect(ics).toContain("SUMMARY:Allenamento Martedì");
    expect(ics).toContain("END:VEVENT");
  });

  it("usa endTime default (+90min) per allenamento senza endTime", async () => {
    p.trainingSession.findMany.mockResolvedValue([{
      id: "s-2",
      title: "Allenamento",
      date: new Date("2025-09-10T09:00:00Z"),
      endTime: null,
    }]);
    const res = await GET();
    const ics = await res.text();
    // 09:00 + 90min = 10:30 → DTEND:20250910T103000Z
    expect(ics).toContain("DTEND:20250910T103000Z");
  });

  it("include location di default per allenamento", async () => {
    p.trainingSession.findMany.mockResolvedValue([{
      id: "s-1",
      title: "Allenamento",
      date: baseDate,
      endTime: null,
    }]);
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("LOCATION:Polisportivo Gino Cosaro");
  });

  it("include VEVENT per partita in casa (vs)", async () => {
    p.match.findMany.mockResolvedValue([{
      id: "m-1",
      date: baseDate,
      isHome: true,
      venue: null,
      team: { name: "Karibu Baskin" },
      opponent: { name: "Team B" },
    }]);
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("UID:match-m-1@karibubaskin.it");
    expect(ics).toContain("SUMMARY:Karibu Baskin vs Team B");
  });

  it("include VEVENT per partita in trasferta (@)", async () => {
    p.match.findMany.mockResolvedValue([{
      id: "m-2",
      date: baseDate,
      isHome: false,
      venue: "Palazzetto Avversario",
      team: { name: "Karibu Baskin" },
      opponent: { name: "Team C" },
    }]);
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("SUMMARY:Karibu Baskin @ Team C");
    expect(ics).toContain("LOCATION:Palazzetto Avversario");
  });

  it("usa location di default per partita in casa", async () => {
    p.match.findMany.mockResolvedValue([{
      id: "m-3",
      date: baseDate,
      isHome: true,
      venue: null,
      team: { name: "Karibu Baskin" },
      opponent: { name: "Team D" },
    }]);
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("LOCATION:Polisportivo Gino Cosaro");
  });

  it("include VEVENT per evento generico con description e location", async () => {
    p.event.findMany.mockResolvedValue([{
      id: "e-1",
      title: "Torneo Estivo",
      date: baseDate,
      endDate: new Date("2025-09-10T18:00:00Z"),
      description: "Tornei con amici",
      location: "Palazzetto Nord",
    }]);
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("UID:event-e-1@karibubaskin.it");
    expect(ics).toContain("SUMMARY:Torneo Estivo");
    expect(ics).toContain("DESCRIPTION:Tornei con amici");
    expect(ics).toContain("LOCATION:Palazzetto Nord");
  });

  it("usa endDate default (+1h) per evento senza endDate", async () => {
    p.event.findMany.mockResolvedValue([{
      id: "e-2",
      title: "Evento",
      date: new Date("2025-09-10T09:00:00Z"),
      endDate: null,
      description: null,
      location: null,
    }]);
    const res = await GET();
    const ics = await res.text();
    // 09:00 + 60min = 10:00 → DTEND:20250910T100000Z
    expect(ics).toContain("DTEND:20250910T100000Z");
  });

  it("esegue escape corretto di virgole e punto-e-virgola nel SUMMARY", async () => {
    p.event.findMany.mockResolvedValue([{
      id: "e-3",
      title: "Evento, speciale; test",
      date: baseDate,
      endDate: null,
      description: null,
      location: null,
    }]);
    const res = await GET();
    const ics = await res.text();
    expect(ics).toContain("SUMMARY:Evento\\, speciale\\; test");
  });

  it("contiene tutti e tre i tipi di VEVENT (allenamento, partita, evento)", async () => {
    p.trainingSession.findMany.mockResolvedValue([{
      id: "s-1", title: "Allenamento", date: baseDate, endTime: null,
    }]);
    p.match.findMany.mockResolvedValue([{
      id: "m-1", date: baseDate, isHome: true, venue: null,
      team: { name: "Karibu" }, opponent: { name: "Team B" },
    }]);
    p.event.findMany.mockResolvedValue([{
      id: "e-1", title: "Torneo", date: baseDate, endDate: null,
      description: null, location: null,
    }]);
    const res = await GET();
    const ics = await res.text();
    const count = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(count).toBe(3);
    expect(ics).toContain("UID:training-s-1@karibubaskin.it");
    expect(ics).toContain("UID:match-m-1@karibubaskin.it");
    expect(ics).toContain("UID:event-e-1@karibubaskin.it");
  });
});
