import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  prisma: {
    season: { findMany: vi.fn() },
    competitiveTeam: { findMany: vi.fn() },
    group: { findMany: vi.fn() },
  },
}));

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { getCurrentSeasonLabel } from "./activeSeason";
import { getCurrentSeason } from "./seasonUtils";
import { prisma } from "@/lib/db";

const seasonFindMany = (prisma as unknown as { season: { findMany: Mock } }).season.findMany;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentSeasonLabel — database irraggiungibile", () => {
  it("ricade sulla stagione del calendario invece di lanciare", async () => {
    // Il root layout esegue questa query a ogni richiesta: se lanciasse,
    // cadrebbe l'intero sito sulla pagina di errore critico.
    seasonFindMany.mockRejectedValue(
      new Prisma.PrismaClientInitializationError("Can't reach database server", "6.5.0", "P1001")
    );

    await expect(getCurrentSeasonLabel()).resolves.toBe(getCurrentSeason(new Date()));
    expect(seasonFindMany).toHaveBeenCalledTimes(2); // primo tentativo + un retry
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException.mock.calls[0][1]).toMatchObject({ level: "warning" });
  });

  it("un errore non di connessione si propaga, non viene mascherato", async () => {
    const boom = new Error("colonna inesistente");
    seasonFindMany.mockRejectedValue(boom);

    await expect(getCurrentSeasonLabel()).rejects.toBe(boom);
    expect(seasonFindMany).toHaveBeenCalledTimes(1);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("connessione che si riprende al secondo tentativo: nessuna ricaduta", async () => {
    seasonFindMany
      .mockRejectedValueOnce(
        new Prisma.PrismaClientInitializationError("Can't reach database server", "6.5.0", "P1001")
      )
      .mockResolvedValue([{ label: "2024-25" }]);

    await expect(getCurrentSeasonLabel()).resolves.toBe("2024-25");
    expect(captureException).not.toHaveBeenCalled();
  });
});
