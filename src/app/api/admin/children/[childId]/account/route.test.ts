import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => {
  const many = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  });
  const tx = {
    child: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    sportRoleHistory: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    registration: many(),
    teamMembership: many(),
    linkRequest: many(),
  };
  return {
    prisma: { ...tx, $transaction: vi.fn((cb: (t: unknown) => unknown) => cb(tx)) },
  };
});
// Il passaggio dello storico ha i suoi test (@/lib/childHistory.test.ts).
vi.mock("@/lib/childHistory", () => ({
  moveChildHistoryToUser: vi.fn().mockResolvedValue({ registrations: 3, teamMemberships: 1 }),
}));
vi.mock("@/lib/rating/ratingEngine", () => ({
  recomputeRatings: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createTargetedAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { PUT, DELETE } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { moveChildHistoryToUser } from "@/lib/childHistory";
import { recomputeRatings } from "@/lib/rating/ratingEngine";

type Many = { findMany: Mock; updateMany: Mock; deleteMany: Mock };
const p = prisma as unknown as {
  child: { findUnique: Mock; update: Mock };
  user: { findUnique: Mock; update: Mock };
  sportRoleHistory: { create: Mock; findFirst: Mock };
  registration: Many;
  teamMembership: Many;
  linkRequest: Many;
};
const ctx = { params: Promise.resolve({ childId: "c1" }) };

const CHILD = {
  id: "c1",
  name: "Luca Rossi",
  userId: null,
  sportRole: 3,
  sportRoleVariant: null,
  gender: "MALE",
  birthDate: new Date("2011-03-02"),
  height: 150,
  athleteStatus: null,
  guardians: [{ userId: "p1" }],
};
const ACCOUNT = {
  id: "u9",
  name: "Luca",
  email: "luca@x.it",
  appRole: "GUEST",
  sportRole: null,
  gender: null,
  birthDate: null,
  height: null,
  athleteStatus: null,
  childAccount: null,
};

const put = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/admin/children/c1/account", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    ctx
  );
const del = () =>
  DELETE(
    new NextRequest("http://localhost/api/admin/children/c1/account", { method: "DELETE" }),
    ctx
  );

beforeEach(() => {
  vi.clearAllMocks();
  (auth as Mock).mockResolvedValue({ user: { id: "coach1", appRole: "COACH" } });
  (isCoachOrAdmin as Mock).mockResolvedValue(true);
  p.child.findUnique.mockResolvedValue(CHILD);
  p.user.findUnique.mockResolvedValue(ACCOUNT);
  p.child.update.mockResolvedValue({});
  p.sportRoleHistory.findFirst.mockResolvedValue(null);
  (moveChildHistoryToUser as Mock).mockResolvedValue({ registrations: 3, teamMemberships: 1 });
});

describe("PUT /api/admin/children/[childId]/account", () => {
  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await put({ userId: "u9" })).status).toBe(403);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("collega la scheda, promuove l'ospite e gli copia i dati che non ha", async () => {
    const res = await put({ userId: "u9" });
    expect(res.status).toBe(200);
    expect((await res.json()).promoted).toBe(true);
    expect(p.child.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { userId: "u9" } });
    expect(p.user.update).toHaveBeenCalledWith({
      where: { id: "u9" },
      data: {
        appRole: "ATHLETE",
        sportRole: 3,
        sportRoleVariant: null,
        sportRoleSuggested: null,
        sportRoleSuggestedVariant: null,
        gender: "MALE",
        birthDate: CHILD.birthDate,
        height: 150,
      },
    });
    expect(p.sportRoleHistory.create).toHaveBeenCalledWith({
      data: { userId: "u9", sportRole: 3 },
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LINK_CHILD_ACCOUNT" })
    );
    // Avvisati il ragazzo e i genitori.
    expect(createTargetedAppNotifications).toHaveBeenCalledWith(["u9", "p1"], expect.anything());
  });

  it("non sovrascrive ruolo e dati che l'account ha già, né il ruolo di un tesserato", async () => {
    p.user.findUnique.mockResolvedValue({
      ...ACCOUNT,
      appRole: "PARENT",
      sportRole: 4,
      gender: "FEMALE",
      birthDate: new Date("2010-01-01"),
      height: 170,
    });
    const res = await put({ userId: "u9" });
    expect((await res.json()).promoted).toBe(false);
    expect(p.user.update).not.toHaveBeenCalled();
    expect(p.sportRoleHistory.create).not.toHaveBeenCalled();
  });

  it("passa tutto lo storico all'account e ricalcola il livello", async () => {
    const res = await put({ userId: "u9" });
    expect(moveChildHistoryToUser).toHaveBeenCalledWith(expect.anything(), "c1", "u9");
    expect((await res.json()).moved).toEqual({ registrations: 3, teamMemberships: 1 });
    expect(recomputeRatings).toHaveBeenCalled();
  });

  it("la scheda aveva già uno storico del ruolo: non se ne crea un altro", async () => {
    p.sportRoleHistory.findFirst.mockResolvedValue({ id: "h1" });
    await put({ userId: "u9" });
    expect(p.sportRoleHistory.create).not.toHaveBeenCalled();
  });

  it("account già legato a un'altra scheda: 409", async () => {
    p.user.findUnique.mockResolvedValue({
      ...ACCOUNT,
      childAccount: { id: "c2", name: "Anna Bianchi" },
    });
    const res = await put({ userId: "u9" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Anna Bianchi");
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("scheda già legata a un altro account: 409", async () => {
    p.child.findUnique.mockResolvedValue({ ...CHILD, userId: "altro" });
    expect((await put({ userId: "u9" })).status).toBe(409);
    expect(moveChildHistoryToUser).not.toHaveBeenCalled();
  });

  it("già legata allo stesso account: completa il passaggio dello storico, senza riavvisare", async () => {
    p.child.findUnique.mockResolvedValue({ ...CHILD, userId: "u9" });
    p.user.findUnique.mockResolvedValue({
      ...ACCOUNT,
      childAccount: { id: "c1", name: "Luca Rossi" },
    });
    expect((await put({ userId: "u9" })).status).toBe(200);
    expect(moveChildHistoryToUser).toHaveBeenCalledWith(expect.anything(), "c1", "u9");
    expect(createTargetedAppNotifications).not.toHaveBeenCalled();
  });

  it("un genitore del figlio non può essere il suo account", async () => {
    p.user.findUnique.mockResolvedValue({ ...ACCOUNT, id: "p1" });
    expect((await put({ userId: "p1" })).status).toBe(409);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("due richieste insieme (P2002): 409", async () => {
    p.child.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
    );
    expect((await put({ userId: "u9" })).status).toBe(409);
  });

  it("figlio o account inesistenti: 404; corpo non valido: 400", async () => {
    expect((await put({})).status).toBe(400);
    p.user.findUnique.mockResolvedValue(null);
    expect((await put({ userId: "u9" })).status).toBe(404);
    p.child.findUnique.mockResolvedValue(null);
    expect((await put({ userId: "u9" })).status).toBe(404);
  });
});

describe("DELETE /api/admin/children/[childId]/account", () => {
  it("scollega senza toccare lo storico e lo registra", async () => {
    p.child.findUnique.mockResolvedValue({ name: "Luca Rossi", userId: "u9" });
    const res = await del();
    expect(res.status).toBe(204);
    expect(p.child.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { userId: null } });
    expect(p.registration.deleteMany).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "UNLINK_CHILD_ACCOUNT", before: expect.anything() })
    );
  });

  it("scheda senza account: niente da fare", async () => {
    p.child.findUnique.mockResolvedValue({ name: "Luca Rossi", userId: null });
    expect((await del()).status).toBe(204);
    expect(p.child.update).not.toHaveBeenCalled();
  });

  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await del()).status).toBe(403);
  });
});
