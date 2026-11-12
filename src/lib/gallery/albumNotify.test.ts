import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));
vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToUsers: vi.fn().mockResolvedValue({ sent: 0, removed: 0 }),
  sendPushToAll: vi.fn(),
}));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createTargetedAppNotifications: vi.fn().mockResolvedValue(undefined),
  removeAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/db";
import { MEMBER_APP_ROLES } from "@/lib/authRoles";
import { sendPushToAll, sendPushToUsers } from "@/lib/notifications/webpush";
import {
  createTargetedAppNotifications,
  removeAppNotifications,
} from "@/lib/notifications/appNotifications";
import { albumAnnouncement, announceAlbum, ALBUM_NOTIFY_TITLE } from "./albumNotify";
import { canNotifyAlbum } from "@/lib/notifications/renotifyRules";

const album = { slug: "karibu-thiene", title: "Karibu – Thiene", photoCount: 84 };
const DAY = 24 * 60 * 60 * 1000;

describe("albumAnnouncement", () => {
  it("titolo del tipo, album e numero di foto nel testo, pagina dell'album", () => {
    expect(albumAnnouncement(album, "new")).toEqual({
      type: "ALBUM_PUBLISHED",
      title: ALBUM_NOTIFY_TITLE,
      body: "Karibu – Thiene · 84 foto",
      url: "/gallery/karibu-thiene",
    });
  });

  it("il promemoria ha un titolo suo", () => {
    expect(albumAnnouncement(album, "reminder").title).not.toBe(ALBUM_NOTIFY_TITLE);
  });
});

describe("announceAlbum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findMany as Mock).mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
  });

  it("push e in-app ai soli tesserati, con la preferenza 'Nuove foto'; mai a tutti", async () => {
    await announceAlbum(album, "new");
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { appRole: { in: MEMBER_APP_ROLES } } })
    );
    expect(sendPushToUsers).toHaveBeenCalledWith(
      ["u1", "u2"],
      expect.objectContaining({ type: "ALBUM_PUBLISHED" }),
      "ALBUM_PUBLISHED"
    );
    expect(createTargetedAppNotifications).toHaveBeenCalledWith(
      ["u1", "u2"],
      expect.objectContaining({ url: "/gallery/karibu-thiene" })
    );
    expect(sendPushToAll).not.toHaveBeenCalled();
    expect(removeAppNotifications).not.toHaveBeenCalled();
  });

  it("il promemoria sostituisce in lista l'avviso precedente", async () => {
    await announceAlbum(album, "reminder");
    expect(removeAppNotifications).toHaveBeenCalledWith(
      "ALBUM_PUBLISHED",
      "/gallery/karibu-thiene"
    );
  });
});

describe("canNotifyAlbum", () => {
  const now = Date.UTC(2026, 10, 11);
  const base = { unreachableAt: null, photoCount: 10 };

  it("album dell'ultimo mese sì, più vecchio no", () => {
    expect(canNotifyAlbum({ ...base, date: new Date(now - 29 * DAY) }, now)).toBe(true);
    expect(canNotifyAlbum({ ...base, date: new Date(now - 31 * DAY) }, now)).toBe(false);
  });

  it("non per un album fuori dal sito", () => {
    expect(canNotifyAlbum({ ...base, date: new Date(now), photoCount: 0 }, now)).toBe(false);
    expect(
      canNotifyAlbum({ ...base, date: new Date(now), unreachableAt: new Date(now) }, now)
    ).toBe(false);
  });
});
