import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    group: { findFirst: vi.fn() },
    competitiveTeam: { findMany: vi.fn() },
    opposingTeam: { findMany: vi.fn(), create: vi.fn() },
    match: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    groupMatch: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    groupCompetitiveTeam: { createMany: vi.fn() },
    groupTeam: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/apiAuth", () => ({ isAdminUser: vi.fn() }));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "admin-1" } }) }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/rating/recompute", () => ({ recomputeRatingsSafely: vi.fn() }));
vi.mock("@/lib/rating/matchBadges", () => ({ reconcileMatchBadges: vi.fn() }));
vi.mock("@/lib/slugUtils", () => ({
  generateMatchSlug: vi.fn(async (t: string, o: string) => `${t}-vs-${o}`),
  generateOpposingTeamSlug: vi.fn(async (n: string) => n.toLowerCase()),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

const p = prisma as any;
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHiNph1vXnCLjsnOKU1Ssra_xWjYhMWPevm_xgjyuKwt_EAThzAaIUAsKQEuUCYLKFd42WhU0GCXU_/pubhtml?gid=1396820745&single=true";
const CSV = readFileSync(
  join(__dirname, "../../../../../lib/groups/fixtures/eisi-silver-ovest-2025-26.csv"),
  "utf-8"
);

const params = { params: Promise.resolve({ groupId: "g-silver" }) };
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/groups/g-silver/sheet-import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params
  );

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(
    new Response(CSV, { status: 200, headers: { "content-type": "text/csv" } })
  );
  (isAdminUser as Mock).mockResolvedValue(true);
  p.group.findFirst.mockResolvedValue({
    id: "g-silver",
    season: "2025-26",
    competitiveTeams: [{ competitiveTeamId: "mon" }],
  });
  p.competitiveTeam.findMany.mockResolvedValue([{ id: "mon", name: "Montekki", color: null }]);
  p.opposingTeam.findMany.mockResolvedValue([{ id: "cus", name: "CUS Verona Baskin" }]);
  p.opposingTeam.create.mockImplementation(async ({ data }: any) => ({ id: `id-${data.name}` }));
  p.match.findMany.mockResolvedValue([
    {
      id: "m-cus",
      teamId: "mon",
      opponentId: "cus",
      date: new Date("2026-01-18T10:30:00Z"),
      isHome: true,
      ourScore: 40,
      theirScore: 57,
      matchday: null,
      venue: null,
      groupId: null,
    },
  ]);
  p.groupMatch.findMany.mockResolvedValue([]);
  p.$transaction.mockResolvedValue([]);
});

describe("POST /api/groups/[groupId]/sheet-import", () => {
  it("è solo per gli admin", async () => {
    (isAdminUser as Mock).mockResolvedValue(false);
    expect((await post({ url: SHEET_URL })).status).toBe(403);
  });

  it("rifiuta un link che non è un foglio pubblicato", async () => {
    const res = await post({ url: "https://example.com/foglio.csv" });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("legge il CSV dall'URL ricostruito e in anteprima non scrive niente", async () => {
    const res = await post({ url: SHEET_URL });
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHiNph1vXnCLjsnOKU1Ssra_xWjYhMWPevm_xgjyuKwt_EAThzAaIUAsKQEuUCYLKFd42WhU0GCXU_/pub?gid=1396820745&single=true&output=csv"
    );
    const body = await res.json();
    expect(body.names.find((n: any) => n.name === "Karibù Baskin").target).toEqual({
      kind: "ours",
      teamId: "mon",
    });
    // La partita con il CUS c'era già con un altro punteggio: conflitto, non sovrascritta.
    const cus = body.rows.find((r: any) => r.number === 35);
    expect(cus).toMatchObject({ action: "conflict", existingId: "m-cus", existingScore: "40–57" });
    expect(body.summary).toMatchObject({ create: 35, conflict: 1 });
    expect(p.$transaction).not.toHaveBeenCalled();
    expect(p.opposingTeam.create).not.toHaveBeenCalled();
  });

  it("al salvataggio crea avversarie e partite e aggancia la nostra al girone", async () => {
    const res = await post({ url: SHEET_URL, apply: true, useSheetScore: [35] });
    expect(res.status).toBe(200);
    // 9 squadre nel foglio: la nostra, il CUS già in anagrafica e 7 nuove.
    expect(p.opposingTeam.create).toHaveBeenCalledTimes(7);
    expect(p.match.create).toHaveBeenCalledTimes(7);
    expect(p.groupMatch.create).toHaveBeenCalledTimes(28);
    expect(p.match.update).toHaveBeenCalledWith({
      where: { id: "m-cus" },
      data: expect.objectContaining({
        groupId: "g-silver",
        ourScore: 42,
        theirScore: 57,
        result: "LOSS",
        venue: "Campo MM di Via del Vigo, Montecchio Maggiore (VI)",
      }),
    });
    const created = p.match.create.mock.calls.map((c: any) => c[0].data);
    expect(created.every((d: any) => d.groupId === "g-silver" && d.matchType === "LEAGUE")).toBe(
      true
    );
    expect(p.$transaction).toHaveBeenCalledTimes(1);
  });

  it("legge un girone dal sito EISI e riconosce Kapuleti", async () => {
    const site = JSON.parse(
      readFileSync(
        join(__dirname, "../../../../../lib/groups/fixtures/eisi-site-veneto-gold-a-2026-27.json"),
        "utf-8"
      )
    );
    fetchMock.mockImplementation(async (input: string) => {
      const path = new URL(input).pathname.split("/").pop();
      const data = path === "events" ? site.events : site[path as keyof typeof site];
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "content-type": "application/json", "x-wp-totalpages": "1" },
      });
    });
    p.group.findFirst.mockResolvedValue({
      id: "g-gold",
      season: "2026-27",
      competitiveTeams: [{ competitiveTeamId: "kap" }],
    });
    p.competitiveTeam.findMany.mockResolvedValue([{ id: "kap", name: "Kapuleti", color: null }]);
    p.opposingTeam.findMany.mockResolvedValue([]);
    p.match.findMany.mockResolvedValue([]);

    const res = await post({ eisiLeagueId: 444 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("VENETO - Girone Gold A · 2026/2027");
    expect(body.names.find((n: any) => n.name === "Karibù Kapuleti").target).toEqual({
      kind: "ours",
      teamId: "kap",
    });
    expect(body.rows.filter((r: any) => r.kind === "ours")).toHaveLength(10);
    expect(body.summary.create).toBe(55);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("leagues=444&seasons=393"))).toBe(
      true
    );
  });

  it("senza foglio né girone del sito risponde 400", async () => {
    expect((await post({})).status).toBe(400);
  });
});
