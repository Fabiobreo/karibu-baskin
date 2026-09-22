import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => {
  const user = { findUnique: vi.fn(), update: vi.fn() };
  const child = { create: vi.fn() };
  return {
    prisma: {
      user,
      child,
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb({ user, child })),
    },
  };
});
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/slugUtils", () => ({ generateChildSlug: vi.fn().mockResolvedValue("luca-rossi") }));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  user: { findUnique: Mock; update: Mock };
  child: { create: Mock };
};
const p = prisma as unknown as PrismaMock;

const call = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/admin/children", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );

describe("POST /api/admin/children", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: "coach1", appRole: "COACH" } });
    (isCoachOrAdmin as Mock).mockResolvedValue(true);
    p.user.findUnique.mockResolvedValue({ id: "p1", name: "Anna Rossi", appRole: "PARENT" });
    p.child.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: "c1", name: data.name, slug: data.slug })
    );
  });

  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await call({ parentId: "p1", name: "Luca" })).status).toBe(403);
  });

  it("richiede genitore e nome", async () => {
    expect((await call({ name: "Luca" })).status).toBe(400);
    expect((await call({ parentId: "p1", name: "  " })).status).toBe(400);
  });

  it("crea il figlio collegato al genitore, senza consenso se non dichiarato", async () => {
    const res = await call({
      parentId: "p1",
      name: " Luca Rossi ",
      gender: "MALE",
      birthDate: "2015-03-02",
      sportRole: 2,
    });
    expect(res.status).toBe(201);
    const data = p.child.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      parentId: "p1",
      name: "Luca Rossi",
      slug: "luca-rossi",
      sportRole: 2,
      gender: "MALE",
      parentalConsentAt: null,
    });
    expect(data.birthDate.toISOString()).toBe("2015-03-02T00:00:00.000Z");
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("registra il consenso quando lo staff lo dichiara", async () => {
    await call({ parentId: "p1", name: "Luca", parentalConsent: true });
    expect(p.child.create.mock.calls[0][0].data.parentalConsentAt).toBeInstanceOf(Date);
  });

  it("promuove a PARENT solo un GUEST", async () => {
    p.user.findUnique.mockResolvedValue({ id: "p1", name: "Anna", appRole: "GUEST" });
    const res = await call({ parentId: "p1", name: "Luca", promoteParent: true });
    expect((await res.json()).parentPromoted).toBe(true);
    expect(p.user.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { appRole: "PARENT" },
    });

    p.user.update.mockClear();
    p.user.findUnique.mockResolvedValue({ id: "p1", name: "Anna", appRole: "ATHLETE" });
    const res2 = await call({ parentId: "p1", name: "Luca", promoteParent: true });
    expect((await res2.json()).parentPromoted).toBe(false);
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("genitore inesistente: 404", async () => {
    p.user.findUnique.mockResolvedValue(null);
    expect((await call({ parentId: "nope", name: "Luca" })).status).toBe(404);
  });
});
