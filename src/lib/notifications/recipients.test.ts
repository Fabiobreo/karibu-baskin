import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findMany: vi.fn() }, child: { findMany: vi.fn() } },
}));

import { playerRecipientIds, staffUserIds } from "./recipients";
import { prisma } from "@/lib/db";

const p = prisma as unknown as { user: { findMany: Mock }; child: { findMany: Mock } };

describe("playerRecipientIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("account senza scheda figlio: solo loro", async () => {
    p.child.findMany.mockResolvedValue([]);
    expect(await playerRecipientIds([{ userId: "u1" }, { userId: "u2", childId: null }])).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("account con una scheda figlio: anche i suoi genitori", async () => {
    p.child.findMany.mockResolvedValue([{ guardians: [{ userId: "mamma" }, { userId: "papà" }] }]);
    const ids = await playerRecipientIds([{ userId: "kid-account" }]);
    expect(ids.sort()).toEqual(["kid-account", "mamma", "papà"]);
    expect(p.child.findMany.mock.calls[0][0].where).toEqual({ userId: { in: ["kid-account"] } });
  });

  it("per un figlio avvisa tutti i genitori e il suo account, senza doppioni", async () => {
    p.child.findMany.mockResolvedValue([
      { userId: "kid-account", guardians: [{ userId: "mamma" }, { userId: "u1" }] },
    ]);
    const ids = await playerRecipientIds([{ userId: "u1" }, { childId: "c1" }, { childId: "c1" }]);
    expect(ids.sort()).toEqual(["kid-account", "mamma", "u1"]);
    expect(p.child.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["c1"] } });
  });

  it("le iscrizioni anonime non hanno nessuno da avvisare", async () => {
    expect(await playerRecipientIds([{ userId: null, childId: null }])).toEqual([]);
  });
});

describe("staffUserIds", () => {
  it("allenatori e admin", async () => {
    p.user.findMany.mockResolvedValue([{ id: "coach" }, { id: "admin" }]);
    expect(await staffUserIds()).toEqual(["coach", "admin"]);
    expect(p.user.findMany.mock.calls[0][0].where).toEqual({
      appRole: { in: ["COACH", "ADMIN"] },
    });
  });
});
