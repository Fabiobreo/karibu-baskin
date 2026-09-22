import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => {
  const tx = {
    childGuardian: { findMany: vi.fn() },
    child: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  };
  return {
    prisma: {
      ...tx,
      childGuardian: { ...tx.childGuardian, findUnique: vi.fn() },
      $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
      __tx: tx,
    },
  };
});

import { prisma } from "@/lib/db";
import {
  deleteUserAndOrphanedChildren,
  guardianNames,
  guardianOf,
  isGuardian,
} from "@/lib/guardians";

type Tx = {
  childGuardian: { findMany: Mock };
  child: { deleteMany: Mock };
  user: { delete: Mock };
};
const p = prisma as unknown as { childGuardian: { findUnique: Mock }; __tx: Tx };
const tx = p.__tx;

describe("guardianOf / isGuardian", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtra i figli su uno qualsiasi dei genitori", () => {
    expect(guardianOf("u1")).toEqual({ guardians: { some: { userId: "u1" } } });
  });

  it("isGuardian legge il collegamento sulla chiave composta", async () => {
    p.childGuardian.findUnique.mockResolvedValue({ childId: "c1" });
    expect(await isGuardian("u1", "c1")).toBe(true);
    expect(p.childGuardian.findUnique).toHaveBeenCalledWith({
      where: { childId_userId: { childId: "c1", userId: "u1" } },
      select: { childId: true },
    });
    p.childGuardian.findUnique.mockResolvedValue(null);
    expect(await isGuardian("u2", "c1")).toBe(false);
  });
});

describe("guardianNames", () => {
  it("unisce i nomi, con l'email come ripiego", () => {
    expect(guardianNames([{ name: "Anna", email: "a@x.it" }])).toBe("Anna");
    expect(
      guardianNames([
        { name: "Anna", email: "a@x.it" },
        { name: null, email: "m@x.it" },
      ])
    ).toBe("Anna e m@x.it");
    expect(
      guardianNames([
        { name: "A", email: "" },
        { name: "B", email: "" },
        { name: "C", email: "" },
      ])
    ).toBe("A, B e C");
  });
});

describe("deleteUserAndOrphanedChildren", () => {
  beforeEach(() => vi.clearAllMocks());

  it("elimina i figli di cui era l'unico genitore, non quelli condivisi", async () => {
    tx.childGuardian.findMany.mockResolvedValue([
      { childId: "solo", child: { _count: { guardians: 1 } } },
      { childId: "condiviso", child: { _count: { guardians: 2 } } },
    ]);
    await deleteUserAndOrphanedChildren("u1");
    expect(tx.child.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["solo"] } } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("senza figli orfani elimina solo l'utente", async () => {
    tx.childGuardian.findMany.mockResolvedValue([
      { childId: "condiviso", child: { _count: { guardians: 2 } } },
    ]);
    await deleteUserAndOrphanedChildren("u1");
    expect(tx.child.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.delete).toHaveBeenCalled();
  });
});
