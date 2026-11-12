import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: { season: { updateMany: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/season/recapNotify", () => ({
  announceSeasonRecaps: vi.fn().mockResolvedValue(0),
}));

import { POST, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { announceSeasonRecaps } from "@/lib/season/recapNotify";

const p = prisma as unknown as { season: { updateMany: Mock; findUnique: Mock } };
const mockAuth = auth as unknown as Mock;
const mockAnnounce = announceSeasonRecaps as Mock;

const asRole = (appRole: string) => mockAuth.mockResolvedValue({ user: { id: "u1", appRole } });

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/competitive-teams/seasons/recap", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/competitive-teams/seasons/recap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.season.updateMany.mockResolvedValue({ count: 1 });
  });

  it("solo l'admin pubblica", async () => {
    asRole("COACH");
    expect((await post({ season: "2026-27" })).status).toBe(403);
    mockAuth.mockResolvedValue(null);
    expect((await post({ season: "2026-27" })).status).toBe(403);
    expect(p.season.updateMany).not.toHaveBeenCalled();
  });

  it("rifiuta una stagione scritta male", async () => {
    asRole("ADMIN");
    expect((await post({ season: "2026-28" })).status).toBe(400);
  });

  it("pubblica e avvisa", async () => {
    asRole("ADMIN");
    const res = await post({ season: "2026-27" });
    expect(res.status).toBe(200);
    expect(p.season.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { label: "2026-27", recapPublishedAt: null } })
    );
    expect(mockAnnounce).toHaveBeenCalledWith("2026-27");
  });

  it("senza la spunta non avvisa", async () => {
    asRole("ADMIN");
    await post({ season: "2026-27", notify: false });
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it("già pubblicata: 409 e nessun secondo avviso", async () => {
    asRole("ADMIN");
    p.season.updateMany.mockResolvedValue({ count: 0 });
    p.season.findUnique.mockResolvedValue({ label: "2026-27" });
    expect((await post({ season: "2026-27" })).status).toBe(409);
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it("stagione che non c'è: 404", async () => {
    asRole("ADMIN");
    p.season.updateMany.mockResolvedValue({ count: 0 });
    p.season.findUnique.mockResolvedValue(null);
    expect((await post({ season: "2030-31" })).status).toBe(404);
  });
});

describe("DELETE /api/competitive-teams/seasons/recap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ritira la pubblicazione", async () => {
    asRole("ADMIN");
    p.season.updateMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(
      new NextRequest("http://localhost/api/competitive-teams/seasons/recap?season=2026-27", {
        method: "DELETE",
      })
    );
    expect(res.status).toBe(200);
    expect(p.season.updateMany).toHaveBeenCalledWith({
      where: { label: "2026-27", recapPublishedAt: { not: null } },
      data: { recapPublishedAt: null },
    });
  });
});
