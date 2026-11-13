import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: { gameSetting: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));

import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { revalidateTag } from "next/cache";

const p = prisma as unknown as { gameSetting: { findUnique: Mock; upsert: Mock } };
const mockAuth = auth as Mock;

const put = (game: string, body: unknown) =>
  PUT(
    new NextRequest(`http://localhost/api/admin/games/${game}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ game }) }
  );

describe("PUT /api/admin/games/[game]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "a-1", appRole: "ADMIN" } });
    p.gameSetting.findUnique.mockResolvedValue(null);
    p.gameSetting.upsert.mockResolvedValue({});
  });

  it("è solo dell'admin", async () => {
    for (const appRole of ["COACH", "DIRECTOR", "ATHLETE"]) {
      mockAuth.mockResolvedValue({ user: { id: "u-1", appRole } });
      expect((await put("simulator", { visibility: "OFF" })).status).toBe(403);
    }
    mockAuth.mockResolvedValue(null);
    expect((await put("simulator", { visibility: "OFF" })).status).toBe(403);
    expect(p.gameSetting.upsert).not.toHaveBeenCalled();
  });

  it("spegne il pronostico e svuota la cache", async () => {
    const res = await put("prediction", { visibility: "OFF" });
    expect(res.status).toBe(200);
    expect(p.gameSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { game: "prediction" } })
    );
    expect(revalidateTag).toHaveBeenCalledWith("game-settings", { expire: 0 });
  });

  it("i quiz non passano da qui: si accendono uno per uno (UX-67)", async () => {
    expect((await put("quiz", { visibility: "PUBLIC" })).status).toBe(400);
    expect(p.gameSetting.upsert).not.toHaveBeenCalled();
  });

  it("pronostico e simulatore non sono mai per tutti", async () => {
    expect((await put("prediction", { visibility: "PUBLIC" })).status).toBe(400);
    expect((await put("simulator", { visibility: "PUBLIC" })).status).toBe(400);
    expect(p.gameSetting.upsert).not.toHaveBeenCalled();
  });

  it("rifiuta un gioco che non esiste e uno stato inventato", async () => {
    expect((await put("tombola", { visibility: "OFF" })).status).toBe(404);
    expect((await put("simulator", { visibility: "ON" })).status).toBe(400);
  });

  it("spegne il simulatore", async () => {
    expect((await put("simulator", { visibility: "OFF" })).status).toBe(200);
  });
});
