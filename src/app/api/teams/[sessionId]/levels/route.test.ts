import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    registration: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    child: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/apiAuth", () => ({ staffGuard: vi.fn() }));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { staffGuard } from "@/lib/apiAuth";

const p = prisma as unknown as {
  registration: { findMany: Mock };
  user: { findMany: Mock };
  child: { findMany: Mock };
};
const mockGuard = staffGuard as Mock;
const params = { params: Promise.resolve({ sessionId: "s1" }) };
const call = () => GET(new Request("http://localhost/api/teams/s1/levels"), params);

describe("GET /api/teams/[sessionId]/levels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuard.mockResolvedValue(null);
    p.user.findMany.mockResolvedValue(
      [10, 20, 30, 40, 50, 60].map((mu) => ({ sportRole: 3, ratingMu: mu, ratingSigma: 0 }))
    );
    p.child.findMany.mockResolvedValue([]);
  });

  it("rifiuta chi non è allenatore o admin", async () => {
    mockGuard.mockResolvedValue(NextResponse.json({ error: "Non autorizzato" }, { status: 403 }));
    const res = await call();
    expect(res.status).toBe(403);
    expect(p.registration.findMany).not.toHaveBeenCalled();
  });

  it("dà la fascia per iscrizione e salta chi non ha un livello stimato", async () => {
    p.registration.findMany.mockResolvedValue([
      { id: "r1", role: 3, user: { sportRole: 3, ratingMu: 60, ratingSigma: 0 }, child: null },
      { id: "r2", role: 3, user: { sportRole: 3, ratingMu: 10, ratingSigma: 0 }, child: null },
      { id: "r3", role: 2, user: null, child: { sportRole: 2, ratingMu: null, ratingSigma: null } },
    ]);
    const { levels } = await (await call()).json();
    expect(levels.r1.band).toBe("alta");
    expect(levels.r2.band).toBe("bassa");
    expect(levels.r3).toBeUndefined();
  });
});
