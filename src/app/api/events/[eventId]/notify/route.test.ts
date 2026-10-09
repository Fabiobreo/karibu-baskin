import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: { event: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/authjs", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToAll: vi.fn().mockResolvedValue({ sent: 0, removed: 0 }),
}));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
  removeAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToAll } from "@/lib/notifications/webpush";
import {
  createAppNotification,
  removeAppNotifications,
} from "@/lib/notifications/appNotifications";
import { RENOTIFY_COOLDOWN_MS } from "@/lib/notifications/renotifyRules";

const p = prisma as unknown as { event: { findUnique: Mock; updateMany: Mock } };
const mockPush = sendPushToAll as Mock;

const DAY = 24 * 60 * 60 * 1000;
const event = (overrides: object = {}) => ({
  id: "evt-1",
  slug: "cena-sociale",
  title: "Cena sociale",
  date: new Date(Date.now() + 3 * DAY),
  endDate: null,
  lastNotifiedAt: new Date(Date.now() - 2 * DAY),
  ...overrides,
});

const call = () =>
  POST(new NextRequest("http://localhost/api/events/evt-1/notify", { method: "POST" }), {
    params: Promise.resolve({ eventId: "evt-1" }),
  });

describe("POST /api/events/[eventId]/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isCoachOrAdmin as Mock).mockResolvedValue(true);
    p.event.findUnique.mockResolvedValue(event());
    p.event.updateMany.mockResolvedValue({ count: 1 });
  });

  it("403 a chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await call()).status).toBe(403);
    expect(p.event.updateMany).not.toHaveBeenCalled();
  });

  it("404 se l'evento non esiste", async () => {
    p.event.findUnique.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it("un evento passato non si avvisa", async () => {
    p.event.findUnique.mockResolvedValue(event({ date: new Date(Date.now() - DAY) }));
    expect((await call()).status).toBe(400);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("già avvisato: parte un promemoria che sostituisce l'avviso in lista", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).lastNotifiedAt).toBeTruthy();
    await vi.waitFor(() => expect(createAppNotification).toHaveBeenCalledOnce());
    expect(mockPush.mock.calls[0][0].title).toBe("Promemoria evento");
    expect(mockPush.mock.calls[0][0].body).toContain("Cena sociale · ");
    expect(removeAppNotifications).toHaveBeenCalledWith("NEW_EVENT", "/eventi/cena-sociale");
  });

  it("mai avvisato (spunta spenta alla creazione): parte l'avviso normale", async () => {
    p.event.findUnique.mockResolvedValue(event({ lastNotifiedAt: null }));
    expect((await call()).status).toBe(200);
    await vi.waitFor(() => expect(createAppNotification).toHaveBeenCalledOnce());
    expect(mockPush.mock.calls[0][0]).toMatchObject({
      title: "Nuovo evento",
      body: "Cena sociale",
    });
    expect(removeAppNotifications).not.toHaveBeenCalled();
  });

  it("due avvisi in dieci minuti: il secondo è rifiutato e non parte niente", async () => {
    // La finestra sta nella condizione della scrittura: nessuna riga aggiornata.
    p.event.updateMany.mockResolvedValue({ count: 0 });
    const res = await call();
    expect(res.status).toBe(409);
    expect(mockPush).not.toHaveBeenCalled();
    const where = p.event.updateMany.mock.calls[0][0].where;
    const cutoff = where.OR[1].lastNotifiedAt.lt as Date;
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(RENOTIFY_COOLDOWN_MS);
    expect(where.OR[0]).toEqual({ lastNotifiedAt: null });
  });
});
