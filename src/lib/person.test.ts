import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { child: { findMany: vi.fn() } } }));

import { personRows, withGuardians } from "./person";
import { prisma } from "@/lib/db";

const p = prisma as unknown as { child: { findMany: Mock } };

describe("personRows", () => {
  it("scheda senza account: solo la scheda", () => {
    expect(personRows({ id: "c1", userId: null })).toEqual([{ childId: "c1" }]);
  });

  it("scheda con un account: tutte e due le chiavi", () => {
    expect(personRows({ id: "c1", userId: "u9" })).toEqual([{ childId: "c1" }, { userId: "u9" }]);
  });
});

describe("withGuardians", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aggiunge i genitori delle schede collegate, senza doppioni", async () => {
    p.child.findMany.mockResolvedValue([
      { guardians: [{ userId: "mamma" }, { userId: "papà" }] },
      { guardians: [{ userId: "mamma" }] },
    ]);
    const ids = await withGuardians(["kid1", "kid2", "adulto"]);
    expect(ids.sort()).toEqual(["adulto", "kid1", "kid2", "mamma", "papà"]);
    expect(p.child.findMany.mock.calls[0][0].where).toEqual({
      userId: { in: ["kid1", "kid2", "adulto"] },
    });
  });

  it("nessun account: nessuna query", async () => {
    expect(await withGuardians([])).toEqual([]);
    expect(p.child.findMany).not.toHaveBeenCalled();
  });
});
