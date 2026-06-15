import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    child: { findMany: vi.fn() },
    competitiveTeam: { findMany: vi.fn() },
    opposingTeam: { findMany: vi.fn() },
    post: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

type PrismaMock = {
  user: { findMany: Mock };
  child: { findMany: Mock };
  competitiveTeam: { findMany: Mock };
  opposingTeam: { findMany: Mock };
  post: { findMany: Mock };
  event: { findMany: Mock };
};
const p = prisma as unknown as PrismaMock;

const makeReq = (q: string) =>
  new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`);

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Mario Rossi",
        slug: "mario-rossi",
        image: null,
        customImage: null,
        sportRole: 3,
      },
    ]);
    p.child.findMany.mockResolvedValue([]);
    p.competitiveTeam.findMany.mockResolvedValue([
      { id: "t1", name: "Karibu A", season: "2025-26" },
    ]);
    p.opposingTeam.findMany.mockResolvedValue([]);
    p.post.findMany.mockResolvedValue([]);
    p.event.findMany.mockResolvedValue([]);
  });

  it("non interroga il DB con meno di 2 caratteri", async () => {
    const res = await GET(makeReq("a"));
    const json = await res.json();
    expect(json.players).toEqual([]);
    expect(p.user.findMany).not.toHaveBeenCalled();
  });

  it("raggruppa i risultati e costruisce gli href", async () => {
    const res = await GET(makeReq("mario"));
    const json = await res.json();
    expect(json.players[0]).toMatchObject({ name: "Mario Rossi", href: "/giocatori/mario-rossi" });
    expect(json.teams[0].href).toBe("/squadre/202526/karibu-a");
  });

  it("esclude GUEST e minorenni nella query utenti", async () => {
    await GET(makeReq("mario"));
    const where = p.user.findMany.mock.calls[0][0].where;
    const serialized = JSON.stringify(where);
    expect(serialized).toContain("GUEST");
    expect(serialized).toContain("birthDate");
  });
});
