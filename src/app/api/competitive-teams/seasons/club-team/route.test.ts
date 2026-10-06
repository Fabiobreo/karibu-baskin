import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    competitiveTeam: { update: vi.fn() },
    match: { count: vi.fn() },
    groupCompetitiveTeam: { count: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "staff-1" } }),
}));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/lib/matches/mixedTeam", () => ({
  ensureClubTeam: vi.fn().mockResolvedValue("karibu-2026-27"),
}));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { ensureClubTeam } from "@/lib/matches/mixedTeam";

const p = prisma as unknown as {
  competitiveTeam: { update: Mock };
  match: { count: Mock };
  groupCompetitiveTeam: { count: Mock };
};

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/competitive-teams/seasons/club-team", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PUT /api/competitive-teams/seasons/club-team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isCoachOrAdmin as Mock).mockResolvedValue(true);
    (ensureClubTeam as Mock).mockResolvedValue("karibu-2026-27");
    p.match.count.mockResolvedValue(0);
    p.groupCompetitiveTeam.count.mockResolvedValue(0);
    p.competitiveTeam.update.mockImplementation(({ data }: { data: { playsLeague: boolean } }) =>
      Promise.resolve({ id: "karibu-2026-27", name: "Karibu", season: "2026-27", ...data })
    );
  });

  it("restituisce 401 a chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    const res = await PUT(makeRequest({ season: "2026-27", playsLeague: true }));
    expect(res.status).toBe(401);
    expect(p.competitiveTeam.update).not.toHaveBeenCalled();
  });

  it("restituisce 400 con una stagione non valida", async () => {
    const res = await PUT(makeRequest({ season: "2026", playsLeague: true }));
    expect(res.status).toBe(400);
  });

  it("iscrive la Karibu al campionato, creandola se la stagione non l'ha ancora", async () => {
    const res = await PUT(makeRequest({ season: "2026-27", playsLeague: true }));
    expect(res.status).toBe(200);
    expect(ensureClubTeam).toHaveBeenCalledWith("2026-27");
    expect(p.competitiveTeam.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "karibu-2026-27" }, data: { playsLeague: true } })
    );
    // Per attivarla non serve nessun controllo sulle partite.
    expect(p.match.count).not.toHaveBeenCalled();
  });

  it("la riporta nascosta se non ha partite di campionato né gironi", async () => {
    const res = await PUT(makeRequest({ season: "2026-27", playsLeague: false }));
    expect(res.status).toBe(200);
    expect((await res.json()).playsLeague).toBe(false);
  });

  it("restituisce 409 se ha partite di campionato", async () => {
    p.match.count.mockResolvedValue(2);
    const res = await PUT(makeRequest({ season: "2026-27", playsLeague: false }));
    expect(res.status).toBe(409);
    expect(p.competitiveTeam.update).not.toHaveBeenCalled();
  });

  it("restituisce 409 se è iscritta a un girone", async () => {
    p.groupCompetitiveTeam.count.mockResolvedValue(1);
    const res = await PUT(makeRequest({ season: "2026-27", playsLeague: false }));
    expect(res.status).toBe(409);
    expect(p.competitiveTeam.update).not.toHaveBeenCalled();
  });
});
