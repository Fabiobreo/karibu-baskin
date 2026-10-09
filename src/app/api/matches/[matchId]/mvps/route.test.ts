import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findUnique: vi.fn() },
    matchCallup: { findMany: vi.fn() },
    matchMvp: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
  isMember: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rating/badgeService", () => ({
  reconcilePlayerBadges: vi.fn().mockResolvedValue([]),
}));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { reconcilePlayerBadges } from "@/lib/rating/badgeService";

type PrismaMock = {
  match: { findUnique: Mock };
  matchCallup: { findMany: Mock };
  matchMvp: { findMany: Mock; deleteMany: Mock; createMany: Mock };
  $transaction: Mock;
};
const p = prisma as unknown as PrismaMock;
const mockIsCoach = isCoachOrAdmin as Mock;

const DAY = 24 * 60 * 60 * 1000;
const makeParams = (matchId: string) =>
  ({ params: Promise.resolve({ matchId }) }) as { params: Promise<{ matchId: string }> };

const putMvps = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/matches/match-1/mvps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    makeParams("match-1")
  );

describe("PUT /api/matches/[matchId]/mvps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(true);
    p.match.findUnique.mockResolvedValue({ id: "match-1", date: new Date(Date.now() - 2 * DAY) });
    p.matchCallup.findMany.mockResolvedValue([
      { userId: "user-1", childId: null },
      { userId: null, childId: "child-1" },
    ]);
    p.matchMvp.findMany.mockResolvedValue([]);
    p.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  it("restituisce 403 per chi non è staff", async () => {
    mockIsCoach.mockResolvedValue(false);
    expect((await putMvps({ userIds: ["user-1"], childIds: [] })).status).toBe(403);
  });

  it("rifiuta un MVP che non è tra i convocati", async () => {
    const res = await putMvps({ userIds: ["user-9"], childIds: [] });
    expect(res.status).toBe(400);
    expect(p.$transaction).not.toHaveBeenCalled();
  });

  it("partita recente: i badge si sbloccano con la notifica", async () => {
    const res = await putMvps({ userIds: ["user-1"], childIds: ["child-1"] });
    expect(res.status).toBe(200);
    expect(reconcilePlayerBadges).toHaveBeenCalledWith({ userId: "user-1" }, { notify: true });
    expect(reconcilePlayerBadges).toHaveBeenCalledWith({ childId: "child-1" }, { notify: true });
  });

  it("partita di oltre un mese fa: i badge si sbloccano in silenzio", async () => {
    p.match.findUnique.mockResolvedValue({ id: "match-1", date: new Date(Date.now() - 200 * DAY) });
    const res = await putMvps({ userIds: ["user-1"], childIds: ["child-1"] });
    expect(res.status).toBe(200);
    expect(reconcilePlayerBadges).toHaveBeenCalledWith({ userId: "user-1" }, { notify: false });
    expect(reconcilePlayerBadges).toHaveBeenCalledWith({ childId: "child-1" }, { notify: false });
  });
});
