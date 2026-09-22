import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    child: { findUnique: vi.fn() },
    registration: { findFirst: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";

type PrismaMock = {
  trainingSession: { findUnique: Mock };
  user: { findUnique: Mock };
  child: { findUnique: Mock };
  registration: { findFirst: Mock; create: Mock };
};
const p = prisma as unknown as PrismaMock;

const call = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/sessions/s1/registrations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ sessionId: "s1" }) }
  );

describe("POST /api/sessions/[sessionId]/registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: "coach1", appRole: "COACH" } });
    (isCoachOrAdmin as Mock).mockResolvedValue(true);
    p.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    p.registration.findFirst.mockResolvedValue(null);
    p.registration.create.mockImplementation(({ data }) => Promise.resolve({ id: "r1", ...data }));
  });

  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    const res = await call({ userId: "u1" });
    expect(res.status).toBe(403);
    expect(p.registration.create).not.toHaveBeenCalled();
  });

  it("chiede una sola persona", async () => {
    expect((await call({})).status).toBe(400);
    expect((await call({ userId: "u1", childId: "c1" })).status).toBe(400);
  });

  it("iscrive un utente col ruolo del profilo e la presenza indicata", async () => {
    p.user.findUnique.mockResolvedValue({
      name: "Mario Rossi",
      email: "m@x.it",
      sportRole: 3,
      childAccount: null,
    });
    const res = await call({ userId: "u1", role: 5, attended: true });
    expect(res.status).toBe(201);
    expect(p.registration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          sessionId: "s1",
          name: "Mario Rossi",
          role: 3,
          userId: "u1",
          childId: null,
          attended: true,
        },
      })
    );
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ADD_REGISTRATION" }));
  });

  it("non guarda date né apertura: legge solo che l'allenamento esista", async () => {
    p.child.findUnique.mockResolvedValue({ name: "Luca", sportRole: 2, userId: null });
    await call({ childId: "c1" });
    expect(p.trainingSession.findUnique).toHaveBeenCalledWith({
      where: { id: "s1" },
      select: { id: true },
    });
  });

  it("senza ruolo a profilo usa quello scelto, e senza nessuno risponde 400", async () => {
    p.child.findUnique.mockResolvedValue({ name: "Luca", sportRole: null, userId: null });
    expect((await call({ childId: "c1" })).status).toBe(400);
    const res = await call({ childId: "c1", role: 2 });
    expect(res.status).toBe(201);
    expect(p.registration.create.mock.calls[0][0].data.role).toBe(2);
  });

  it("riconosce il doppione anche tra il figlio e il suo account", async () => {
    p.child.findUnique.mockResolvedValue({ name: "Luca", sportRole: 2, userId: "u9" });
    p.registration.findFirst.mockResolvedValue({ id: "old" });
    const res = await call({ childId: "c1" });
    expect(res.status).toBe(409);
    expect(p.registration.findFirst).toHaveBeenCalledWith({
      where: { sessionId: "s1", OR: [{ childId: "c1" }, { userId: "u9" }] },
      select: { id: true },
    });
  });

  it("allenamento o persona inesistenti: 404", async () => {
    p.trainingSession.findUnique.mockResolvedValue(null);
    expect((await call({ userId: "u1" })).status).toBe(404);
    p.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    p.user.findUnique.mockResolvedValue(null);
    expect((await call({ userId: "u1" })).status).toBe(404);
  });

  it("gara sul vincolo unico: 409 in JSON, non 500", async () => {
    p.user.findUnique.mockResolvedValue({
      name: "Mario",
      email: "m@x.it",
      sportRole: 1,
      childAccount: null,
    });
    p.registration.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "6" })
    );
    const res = await call({ userId: "u1" });
    expect(res.status).toBe(409);
  });
});
