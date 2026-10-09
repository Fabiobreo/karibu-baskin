import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { photoAlbum: { findMany: vi.fn() } },
}));

import { syncRecentAlbums } from "./albums";
import { prisma } from "@/lib/db";

const findMany = (prisma.photoAlbum as unknown as { findMany: Mock }).findMany;
const albums = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, title: `Album ${i + 1}` }));
const synced = (added = 0, removed = 0) => ({ ok: true as const, added, removed, photoCount: 10 });

describe("syncRecentAlbums", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("guarda solo gli album degli ultimi 30 giorni, dal meno aggiornato", async () => {
    findMany.mockResolvedValue([]);
    const now = new Date("2026-10-07T06:00:00Z").getTime();
    await syncRecentAlbums({ now: () => now, syncOne: vi.fn() });

    const since = new Date("2026-09-07T06:00:00Z");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ date: { gte: since } }, { createdAt: { gte: since } }] },
        orderBy: { syncedAt: "asc" },
      })
    );
  });

  it("somma foto nuove e tolte e conta le cartelle non raggiungibili", async () => {
    findMany.mockResolvedValue(albums(3));
    const syncOne = vi
      .fn()
      .mockResolvedValueOnce(synced(3, 1))
      .mockResolvedValueOnce({ ok: false, unreachable: true })
      .mockResolvedValueOnce(synced(2, 0));

    expect(await syncRecentAlbums({ syncOne })).toEqual({
      total: 3,
      synced: 2,
      added: 5,
      removed: 1,
      unreachable: 1,
      failed: 0,
      skipped: 0,
    });
  });

  it("un album che fallisce non ferma gli altri", async () => {
    findMany.mockResolvedValue(albums(3));
    const syncOne = vi
      .fn()
      .mockResolvedValueOnce(synced())
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce(synced(1));

    const result = await syncRecentAlbums({ syncOne });
    expect(syncOne).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ synced: 2, failed: 1, added: 1 });
  });

  it("finito il tempo non ne inizia altri e li conta come saltati", async () => {
    findMany.mockResolvedValue(albums(4));
    // Ogni album "dura" 8 secondi: con 20 secondi ne partono tre.
    let clock = 0;
    const syncOne = vi.fn().mockImplementation(async () => {
      clock += 8_000;
      return synced();
    });

    const result = await syncRecentAlbums({ budgetMs: 20_000, now: () => clock, syncOne });
    expect(syncOne).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ total: 4, synced: 3, skipped: 1 });
  });
});
