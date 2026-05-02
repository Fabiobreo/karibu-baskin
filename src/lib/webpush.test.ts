import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    pushSubscription: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { sendPushToAll, sendPushToUsers, sendPushToUser } from "./webpush";
import { prisma } from "@/lib/db";
import webpush from "web-push";

type PrismaMock = {
  pushSubscription: { findMany: Mock; deleteMany: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockSend = (webpush as unknown as { sendNotification: Mock }).sendNotification;

function sub(endpoint: string, opts: { userId?: string; appRole?: string; notifPrefs?: unknown } = {}) {
  return {
    endpoint,
    p256dh: "p256dh-key",
    auth: "auth-key",
    userId: opts.userId ?? null,
    user: opts.appRole !== undefined || opts.notifPrefs !== undefined
      ? { appRole: opts.appRole ?? "ATHLETE", notifPrefs: opts.notifPrefs ?? null }
      : null,
  };
}

describe("sendPushToAll()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ statusCode: 201 });
    p.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("invia a tutti i subscriber quando adminOnly=false", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      sub("ep1", { userId: "u1", appRole: "ATHLETE" }),
      sub("ep2", { userId: "u2", appRole: "ADMIN" }),
    ]);

    const result = await sendPushToAll({ title: "Test", body: "Corpo" });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 2, removed: 0 });
  });

  it("filtra solo ADMIN quando adminOnly=true", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      sub("ep1", { userId: "u1", appRole: "ATHLETE" }),
      sub("ep2", { userId: "u2", appRole: "ADMIN" }),
    ]);

    await sendPushToAll({ title: "Test", body: "Corpo" }, true);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "ep2" }),
      expect.any(String),
    );
  });

  it("rispetta le preferenze utente per notifType", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      sub("ep1", { userId: "u1", appRole: "ATHLETE", notifPrefs: { push: { NEW_TRAINING: false } } }),
      sub("ep2", { userId: "u2", appRole: "ATHLETE", notifPrefs: { push: { NEW_TRAINING: true } } }),
    ]);

    await sendPushToAll({ title: "Test", body: "Corpo" }, false, "NEW_TRAINING");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "ep2" }),
      expect.any(String),
    );
  });

  it("subscription anonima (no userId) sempre inviata anche con notifType", async () => {
    p.pushSubscription.findMany.mockResolvedValue([sub("ep-anon")]);

    await sendPushToAll({ title: "Test", body: "Corpo" }, false, "NEW_TRAINING");

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("rimuove le subscription scadute (410/404) dal DB", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      sub("ep-valid", { userId: "u1", appRole: "ATHLETE" }),
      sub("ep-gone", { userId: "u2", appRole: "ATHLETE" }),
    ]);
    mockSend
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce({ statusCode: 410 });

    const result = await sendPushToAll({ title: "Test", body: "Corpo" });

    expect(p.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: { in: ["ep-gone"] } },
    });
    expect(result).toEqual({ sent: 1, removed: 1 });
  });

  it("gestisce 404 come subscription scaduta", async () => {
    p.pushSubscription.findMany.mockResolvedValue([sub("ep-404", { userId: "u1", appRole: "ATHLETE" })]);
    mockSend.mockRejectedValue({ statusCode: 404 });

    const result = await sendPushToAll({ title: "Test", body: "Corpo" });

    expect(p.pushSubscription.deleteMany).toHaveBeenCalled();
    expect(result.removed).toBe(1);
  });

  it("non chiama deleteMany se non ci sono subscription scadute", async () => {
    p.pushSubscription.findMany.mockResolvedValue([sub("ep1", { userId: "u1", appRole: "ATHLETE" })]);

    await sendPushToAll({ title: "Test", body: "Corpo" });

    expect(p.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it("include url, icon e type nel payload JSON inviato", async () => {
    p.pushSubscription.findMany.mockResolvedValue([sub("ep1", { appRole: "ATHLETE" })]);

    await sendPushToAll({ title: "Titolo", body: "Corpo", url: "/notifiche", icon: "/icon.png", type: "NEW_TRAINING" });

    const data = JSON.parse(mockSend.mock.calls[0][1] as string);
    expect(data).toMatchObject({ title: "Titolo", body: "Corpo", url: "/notifiche", icon: "/icon.png", type: "NEW_TRAINING" });
  });

  it("usa url=/ e icon=/logo.png come default", async () => {
    p.pushSubscription.findMany.mockResolvedValue([sub("ep1", { appRole: "ATHLETE" })]);

    await sendPushToAll({ title: "T", body: "B" });

    const data = JSON.parse(mockSend.mock.calls[0][1] as string);
    expect(data.url).toBe("/");
    expect(data.icon).toBe("/logo.png");
    expect(data.type).toBe("");
  });

  it("non invia nulla se non ci sono subscriber", async () => {
    p.pushSubscription.findMany.mockResolvedValue([]);

    const result = await sendPushToAll({ title: "T", body: "B" });

    expect(mockSend).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, removed: 0 });
  });
});

describe("sendPushToUsers()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ statusCode: 201 });
    p.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("ritorna { sent: 0, removed: 0 } e non interroga il DB se userIds è vuoto", async () => {
    const result = await sendPushToUsers([], { title: "T", body: "B" });

    expect(result).toEqual({ sent: 0, removed: 0 });
    expect(p.pushSubscription.findMany).not.toHaveBeenCalled();
  });

  it("filtra per userId in query Prisma", async () => {
    p.pushSubscription.findMany.mockResolvedValue([]);

    await sendPushToUsers(["u1", "u2"], { title: "T", body: "B" });

    expect(p.pushSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: ["u1", "u2"] } } }),
    );
  });

  it("rispetta le preferenze utente per notifType", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      { endpoint: "ep1", p256dh: "k", auth: "a", userId: "u1", user: { notifPrefs: { push: { TEAMS_READY: false } } } },
      { endpoint: "ep2", p256dh: "k", auth: "a", userId: "u2", user: { notifPrefs: null } },
    ]);

    await sendPushToUsers(["u1", "u2"], { title: "T", body: "B" }, "TEAMS_READY");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "ep2" }), expect.any(String));
  });

  it("invia a tutti senza filtro se notifType non è fornito", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      { endpoint: "ep1", p256dh: "k", auth: "a", userId: "u1", user: { notifPrefs: { push: { NEW_TRAINING: false } } } },
      { endpoint: "ep2", p256dh: "k", auth: "a", userId: "u2", user: { notifPrefs: null } },
    ]);

    await sendPushToUsers(["u1", "u2"], { title: "T", body: "B" });

    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

describe("sendPushToUser()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ statusCode: 201 });
    p.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("ritorna { sent: 0, removed: 0 } se l'utente non ha subscription", async () => {
    p.pushSubscription.findMany.mockResolvedValue([]);

    const result = await sendPushToUser("u1", { title: "T", body: "B" });

    expect(result).toEqual({ sent: 0, removed: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("invia a tutte le subscription dell'utente senza notifType", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      { endpoint: "ep1", p256dh: "k", auth: "a", userId: "u1" },
      { endpoint: "ep2", p256dh: "k", auth: "a", userId: "u1" },
    ]);

    await sendPushToUser("u1", { title: "T", body: "B" });

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("rispetta le preferenze utente per notifType", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      { endpoint: "ep1", p256dh: "k", auth: "a", userId: "u1", user: { notifPrefs: { push: { MATCH_RESULT: false } } } },
    ]);

    const result = await sendPushToUser("u1", { title: "T", body: "B" }, "MATCH_RESULT");

    expect(mockSend).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, removed: 0 });
  });

  it("include user nella query solo se notifType è fornito", async () => {
    p.pushSubscription.findMany.mockResolvedValue([]);

    await sendPushToUser("u1", { title: "T", body: "B" });
    expect(p.pushSubscription.findMany).toHaveBeenCalledWith({ where: { userId: "u1" }, include: undefined });

    vi.clearAllMocks();
    p.pushSubscription.findMany.mockResolvedValue([]);

    await sendPushToUser("u1", { title: "T", body: "B" }, "NEW_TRAINING");
    expect(p.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { user: { select: { notifPrefs: true } } },
    });
  });

  it("rimuove subscription scadute (410) per singolo utente", async () => {
    p.pushSubscription.findMany.mockResolvedValue([
      { endpoint: "ep-ok", p256dh: "k", auth: "a", userId: "u1" },
      { endpoint: "ep-410", p256dh: "k", auth: "a", userId: "u1" },
    ]);
    mockSend
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce({ statusCode: 410 });

    const result = await sendPushToUser("u1", { title: "T", body: "B" });

    expect(p.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: { in: ["ep-410"] } },
    });
    expect(result).toEqual({ sent: 1, removed: 1 });
  });
});
