import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("web-push", () => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "fake-public-key";
  process.env.VAPID_PRIVATE_KEY = "fake-private-key";
  return { default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    pushSubscription: { findMany: vi.fn(), deleteMany: vi.fn() },
    appNotification: { create: vi.fn(), createMany: vi.fn() },
  },
}));

import { notificationsDisabled } from "./devSwitch";
import { sendPushToAll } from "./webpush";
import { createAppNotification, createTargetedAppNotifications } from "./appNotifications";
import { prisma } from "@/lib/db";
import webpush from "web-push";

const p = prisma as unknown as {
  pushSubscription: { findMany: Mock };
  appNotification: { create: Mock; createMany: Mock };
};
const mockSend = (webpush as unknown as { sendNotification: Mock }).sendNotification;

describe("notificationsDisabled()", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("è spento di default", () => {
    vi.stubEnv("DISABLE_NOTIFICATIONS", "");
    expect(notificationsDisabled()).toBe(false);
  });

  it("si accende con DISABLE_NOTIFICATIONS=true fuori produzione", () => {
    vi.stubEnv("DISABLE_NOTIFICATIONS", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(notificationsDisabled()).toBe(true);
  });

  it("non si accende mai in produzione", () => {
    vi.stubEnv("DISABLE_NOTIFICATIONS", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(notificationsDisabled()).toBe(false);
  });
});

describe("con le notifiche spente", () => {
  beforeEach(() => {
    vi.stubEnv("DISABLE_NOTIFICATIONS", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "info").mockImplementation(() => {});
    mockSend.mockReset();
    p.appNotification.create.mockReset();
    p.appNotification.createMany.mockReset();
    p.pushSubscription.findMany.mockResolvedValue([
      { endpoint: "https://push/1", p256dh: "k", auth: "a", userId: null, user: null },
    ]);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("le push non partono", async () => {
    const res = await sendPushToAll({ title: "Nuovo allenamento", body: "x" });
    expect(res).toEqual({ sent: 0, removed: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("le notifiche in-app non vengono scritte", async () => {
    await createAppNotification({ type: "NEW_TRAINING", title: "t", body: "b" });
    await createTargetedAppNotifications(["u1"], { type: "TEAMS_READY", title: "t", body: "b" });
    expect(p.appNotification.create).not.toHaveBeenCalled();
    expect(p.appNotification.createMany).not.toHaveBeenCalled();
  });
});
