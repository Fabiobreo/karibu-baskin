import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { moveChildHistoryToUser, movedTotal, rewriteSnapshotRefs } from "./childHistory";

describe("rewriteSnapshotRefs", () => {
  const snap = {
    teamA: [
      { childId: "c1", name: "Luca" },
      { userId: "u2", name: "Anna" },
    ],
    teamB: [{ childId: "c7", name: "Sara" }],
  };

  it("mette l'account al posto della scheda, senza toccare gli altri", () => {
    expect(rewriteSnapshotRefs(snap, "c1", "u9")).toEqual({
      teamA: [
        { userId: "u9", childId: null, name: "Luca" },
        { userId: "u2", name: "Anna" },
      ],
      teamB: [{ childId: "c7", name: "Sara" }],
    });
  });

  it("niente da cambiare: null (lo snapshot non si riscrive)", () => {
    expect(rewriteSnapshotRefs(snap, "c-altro", "u9")).toBeNull();
    expect(rewriteSnapshotRefs(null, "c1", "u9")).toBeNull();
    expect(rewriteSnapshotRefs({ teamA: "x" }, "c1", "u9")).toBeNull();
  });

  it("account già nello snapshot: la scheda si toglie, la persona non conta due volte", () => {
    const twice = {
      teamA: [{ childId: "c1", name: "Luca" }],
      teamB: [{ userId: "u9", name: "Luca" }],
    };
    expect(rewriteSnapshotRefs(twice, "c1", "u9")).toEqual({
      teamA: [],
      teamB: [{ userId: "u9", name: "Luca" }],
    });
  });
});

function fakeTx() {
  const table = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    update: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue(null),
  });
  return {
    registration: table(),
    teamMembership: table(),
    playerMatchStats: table(),
    matchCallup: table(),
    matchMvp: table(),
    matchAvailability: table(),
    earnedBadge: table(),
    sportRoleHistory: table(),
    ratingUpdate: table(),
    trainingMatchResult: table(),
    child: table(),
    user: table(),
  };
}
const run = (tx: ReturnType<typeof fakeTx>) =>
  moveChildHistoryToUser(tx as unknown as Prisma.TransactionClient, "c1", "u9");

describe("moveChildHistoryToUser", () => {
  it("sposta ogni tabella dalla scheda all'account", async () => {
    const tx = fakeTx();
    const moved = await run(tx);
    for (const t of [
      tx.registration,
      tx.teamMembership,
      tx.playerMatchStats,
      tx.matchCallup,
      tx.matchMvp,
      tx.matchAvailability,
      tx.earnedBadge,
      tx.sportRoleHistory,
      tx.ratingUpdate,
    ]) {
      expect(t.updateMany).toHaveBeenCalledWith({
        where: { childId: "c1" },
        data: { childId: null, userId: "u9" },
      });
    }
    expect(movedTotal(moved)).toBe(7);
  });

  it("stessa riga su entrambi: resta quella della scheda", async () => {
    const tx = fakeTx();
    tx.playerMatchStats.findMany.mockResolvedValue([{ matchId: "m1" }]);
    tx.teamMembership.findMany.mockResolvedValue([{ team: { season: "2026-27" } }]);
    await run(tx);
    expect(tx.playerMatchStats.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u9", matchId: { in: ["m1"] } },
    });
    // Una squadra per stagione: il doppione si cerca sulla stagione.
    expect(tx.teamMembership.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u9", team: { season: { in: ["2026-27"] } } },
    });
    // Prima si toglie la riga dell'account, poi si sposta quella della scheda.
    expect(tx.playerMatchStats.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.playerMatchStats.updateMany.mock.invocationCallOrder[0]
    );
  });

  it("riscrive solo gli snapshot delle partitelle in cui c'era la scheda", async () => {
    const tx = fakeTx();
    tx.trainingMatchResult.findMany.mockResolvedValue([
      { id: "r1", rostersSnapshot: { teamA: [{ childId: "c1", name: "L" }], teamB: [] } },
      { id: "r2", rostersSnapshot: { teamA: [{ childId: "c7", name: "S" }], teamB: [] } },
    ]);
    const moved = await run(tx);
    expect(tx.trainingMatchResult.update).toHaveBeenCalledTimes(1);
    expect(tx.trainingMatchResult.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { rostersSnapshot: { teamA: [{ userId: "u9", childId: null, name: "L" }], teamB: [] } },
    });
    expect(moved.snapshots).toBe(1);
  });

  it("indirizzo del profilo e livello passano all'account, la scheda li perde", async () => {
    const tx = fakeTx();
    tx.child.findUnique.mockResolvedValue({ slug: "luca-rossi", ratingMu: 27, ratingSigma: 6 });
    tx.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(where.id === "u9" ? { slug: "luca-rossi-2", ratingMu: null } : null)
    );
    await run(tx);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u9" },
      data: { slug: "luca-rossi", ratingMu: 27, ratingSigma: 6 },
    });
    expect(tx.child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { slug: null, ratingMu: null, ratingSigma: null },
    });
  });

  it("indirizzo già di un altro account: l'account tiene il suo", async () => {
    const tx = fakeTx();
    tx.child.findUnique.mockResolvedValue({
      slug: "luca-rossi",
      ratingMu: null,
      ratingSigma: null,
    });
    tx.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(where.id === "u9" ? { slug: "luca-r", ratingMu: 25 } : { id: "altro" })
    );
    await run(tx);
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: "u9" }, data: {} });
  });
});
