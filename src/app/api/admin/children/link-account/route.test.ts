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

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = { user: { findUnique: Mock; update: Mock }; child: { create: Mock } };
const p = prisma as unknown as PrismaMock;

const PARENT = { id: "p1", name: "Anna Rossi", appRole: "ATHLETE" };
const ACCOUNT = {
  id: "u9",
  name: "Luca Rossi",
  email: "luca@x.it",
  sportRole: 3,
  sportRoleVariant: "S",
  gender: "MALE",
  birthDate: new Date("2010-05-01"),
  childAccount: null,
};

const call = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/admin/children/link-account", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );

describe("POST /api/admin/children/link-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: "coach1", appRole: "COACH" } });
    (isCoachOrAdmin as Mock).mockResolvedValue(true);
    p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "p1" ? PARENT : where.id === "u9" ? ACCOUNT : null)
    );
    p.child.create.mockResolvedValue({ id: "c1", name: "Luca Rossi" });
  });

  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await call({ parentId: "p1", userId: "u9" })).status).toBe(403);
  });

  it("crea la scheda figlio legata all'account, coi dati del profilo e senza slug", async () => {
    const res = await call({ parentId: "p1", userId: "u9" });
    expect(res.status).toBe(201);
    const data = p.child.create.mock.calls[0][0].data;
    expect(data).toEqual({
      name: "Luca Rossi",
      userId: "u9",
      sportRole: 3,
      sportRoleVariant: "S",
      gender: "MALE",
      birthDate: ACCOUNT.birthDate,
      guardians: { create: { userId: "p1" } },
    });
    expect(data.slug).toBeUndefined();
    // Il ruolo del genitore ATHLETE non cambia, quello dell'account nemmeno.
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("un account che ha già una scheda figlio: 409", async () => {
    p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "p1" ? PARENT : { ...ACCOUNT, childAccount: { id: "existing" } })
    );
    expect((await call({ parentId: "p1", userId: "u9" })).status).toBe(409);
    expect(p.child.create).not.toHaveBeenCalled();
  });

  it("genitore e figlio non possono coincidere", async () => {
    expect((await call({ parentId: "p1", userId: "p1" })).status).toBe(400);
  });

  it("promuove a PARENT un genitore GUEST quando richiesto", async () => {
    p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "p1" ? { ...PARENT, appRole: "GUEST" } : ACCOUNT)
    );
    const res = await call({ parentId: "p1", userId: "u9", promoteParent: true });
    expect((await res.json()).parentPromoted).toBe(true);
    expect(p.user.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { appRole: "PARENT" },
    });
  });

  it("persone inesistenti: 404", async () => {
    expect((await call({ parentId: "nope", userId: "u9" })).status).toBe(404);
    expect((await call({ parentId: "p1", userId: "nope" })).status).toBe(404);
  });
});
