import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => {
  const many = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  });
  const tx = {
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    account: many(),
    session: many(),
    pushSubscription: many(),
    registration: many(),
    eventAttendance: many(),
    eventOptionSelection: many(),
    eventGuest: many(),
  };
  return {
    prisma: { ...tx, $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)) },
  };
});
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/apiAuth", () => ({ isAdminUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isAdminUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

type Many = { findMany: Mock; updateMany: Mock; deleteMany: Mock };
const p = prisma as unknown as {
  user: { findUnique: Mock; update: Mock; delete: Mock };
  account: Many;
  session: Many;
  registration: Many;
};

const NO_TRACES = {
  guardianOf: 0,
  sentLinkRequests: 0,
  receivedLinkRequests: 0,
  teamMemberships: 0,
  matchStats: 0,
  callups: 0,
  matchMvps: 0,
};
const GUEST = {
  id: "g1",
  name: "Mario Rossi",
  email: "mario@giusta.it",
  emailVerified: new Date("2026-10-01"),
  image: "https://img/g1",
  appRole: "GUEST",
  childAccount: null,
  _count: NO_TRACES,
};
const CARD = { id: "u1", name: "Mario Rossi", email: "mario@sbagliata.it", image: null };

function setUsers(source: unknown = GUEST, target: unknown = CARD) {
  p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(where.id === "g1" ? source : where.id === "u1" ? target : null)
  );
}

const call = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/admin/users/merge", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
const BODY = { sourceId: "g1", targetId: "u1" };

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "admin1", appRole: "ADMIN" } });
  (isAdminUser as Mock).mockResolvedValue(true);
  setUsers();
  p.registration.findMany.mockResolvedValue([]);
  p.registration.updateMany.mockResolvedValue({ count: 2 });
  p.user.update.mockResolvedValue({ ...CARD, email: GUEST.email, image: GUEST.image });
});

describe("POST /api/admin/users/merge", () => {
  it("è solo dell'admin", async () => {
    (isAdminUser as Mock).mockResolvedValue(false);
    expect((await call(BODY)).status).toBe(403);
    expect(p.user.delete).not.toHaveBeenCalled();
  });

  it("sposta accessi e iscrizioni, elimina l'ospite e dà la sua email alla scheda", async () => {
    const res = await call(BODY);
    expect(res.status).toBe(200);
    expect(p.account.updateMany).toHaveBeenCalledWith({
      where: { userId: "g1" },
      data: { userId: "u1" },
    });
    expect(p.session.updateMany).toHaveBeenCalledWith({
      where: { userId: "g1" },
      data: { userId: "u1" },
    });
    expect(p.registration.updateMany).toHaveBeenCalledWith({
      where: { userId: "g1" },
      data: { userId: "u1" },
    });
    expect(p.user.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(p.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: {
          email: "mario@giusta.it",
          emailVerified: GUEST.emailVerified,
          image: "https://img/g1",
        },
      })
    );
    expect((await res.json()).registrationsMoved).toBe(2);
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "MERGE_USER" }));
  });

  it("l'email si libera prima di assegnarla: l'ospite si elimina prima dell'update", async () => {
    await call(BODY);
    expect(p.user.delete.mock.invocationCallOrder[0]).toBeLessThan(
      p.user.update.mock.invocationCallOrder[0]
    );
    // E le iscrizioni si spostano prima dell'eliminazione, o diventerebbero anonime.
    expect(p.registration.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      p.user.delete.mock.invocationCallOrder[0]
    );
  });

  it("stesso allenamento su entrambi: resta l'iscrizione della scheda", async () => {
    p.registration.findMany.mockResolvedValue([{ sessionId: "s1" }]);
    await call(BODY);
    expect(p.registration.deleteMany).toHaveBeenCalledWith({
      where: { userId: "g1", sessionId: { in: ["s1"] } },
    });
  });

  it("nome e foto della scheda non si toccano", async () => {
    setUsers(GUEST, { ...CARD, image: "https://img/u1" });
    await call(BODY);
    const data = p.user.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("name");
  });

  it.each([
    ["non è più un ospite", { appRole: "ATHLETE" }],
    ["è genitore", { _count: { ...NO_TRACES, guardianOf: 1 } }],
    ["ha una scheda figlio", { childAccount: { id: "c1" } }],
    ["ha una squadra", { _count: { ...NO_TRACES, teamMemberships: 1 } }],
    ["ha giocato", { _count: { ...NO_TRACES, matchStats: 3 } }],
  ])("non unisce un account che %s", async (_label, patch) => {
    setUsers({ ...GUEST, ...patch });
    const res = await call(BODY);
    expect(res.status).toBe(409);
    expect(p.user.delete).not.toHaveBeenCalled();
    expect(p.account.updateMany).not.toHaveBeenCalled();
  });

  it("mai su sé stessi, mai lo stesso account due volte", async () => {
    expect((await call({ sourceId: "admin1", targetId: "u1" })).status).toBe(400);
    expect((await call({ sourceId: "g1", targetId: "admin1" })).status).toBe(400);
    expect((await call({ sourceId: "g1", targetId: "g1" })).status).toBe(400);
  });

  it("account o scheda inesistenti: 404; corpo non valido: 400", async () => {
    expect((await call({ sourceId: "zzz", targetId: "u1" })).status).toBe(404);
    expect((await call({ sourceId: "g1", targetId: "zzz" })).status).toBe(404);
    expect((await call({ sourceId: "g1" })).status).toBe(400);
  });
});
