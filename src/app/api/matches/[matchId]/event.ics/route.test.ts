import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { match: { findFirst: vi.fn() } },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

const p = prisma as unknown as { match: { findFirst: Mock } };
const call = (id: string) =>
  GET(new NextRequest(`http://localhost/api/matches/${id}/event.ics`), {
    params: Promise.resolve({ matchId: id }),
  });

describe("GET /api/matches/[matchId]/event.ics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 se la partita non esiste", async () => {
    p.match.findFirst.mockResolvedValue(null);
    expect((await call("nope")).status).toBe(404);
  });

  it("scarica un solo impegno con UID del feed, UTC e indirizzo dell'avversaria", async () => {
    p.match.findFirst.mockResolvedValue({
      id: "m1",
      date: new Date("2026-10-04T13:00:00Z"),
      isHome: false,
      venue: null,
      opponentTeamId: null,
      team: { name: "Montekki" },
      opponent: { name: "Orsi", address: "Via Roma 1", city: "Bassano" },
      opponentTeam: null,
    });
    const res = await call("m1");
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="montekki-orsi\.ics"$/
    );
    const ics = await res.text();
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
    expect(ics).toContain("UID:match-m1@karibubaskin.it");
    expect(ics).toContain("DTSTART:20261004T130000Z");
    expect(ics).toContain("LOCATION:Via Roma 1\\, Bassano");
    expect(ics).not.toContain("DESCRIPTION:");
  });
});
