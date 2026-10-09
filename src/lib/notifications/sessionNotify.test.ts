import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToAll: vi.fn().mockResolvedValue({ sent: 0, removed: 0 }),
  sendPushToUsers: vi.fn().mockResolvedValue({ sent: 0, removed: 0 }),
}));
vi.mock("@/lib/notifications/sessionAudience", () => ({
  loadSessionAudience: vi.fn().mockResolvedValue(["u1", "u2"]),
}));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
  createTargetedAppNotifications: vi.fn().mockResolvedValue(undefined),
  removeAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { notifySessionOpen, type SessionNotifyInput } from "./sessionNotify";
import { sendPushToAll, sendPushToUsers } from "./webpush";
import { loadSessionAudience } from "./sessionAudience";
import {
  createAppNotification,
  createTargetedAppNotifications,
  removeAppNotifications,
} from "./appNotifications";

const mockAudience = loadSessionAudience as Mock;
const mockToAll = sendPushToAll as Mock;
const mockToUsers = sendPushToUsers as Mock;
const mockAppAll = createAppNotification as Mock;
const mockAppTargeted = createTargetedAppNotifications as Mock;

const base: SessionNotifyInput = {
  id: "s1",
  title: "Allenamento",
  date: new Date("2026-10-06T17:00:00Z"),
  endTime: null,
  dateSlug: "2026-10-06",
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
};

// La parte filtrata parte in una promise non attesa: aspettiamo che si svuoti.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("notifySessionOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudience.mockResolvedValue(["u1", "u2"]);
  });

  it("promemoria: titolo proprio, e in lista sostituisce l'avviso precedente", async () => {
    notifySessionOpen(base, "reminder");
    await flush();
    expect(mockToAll.mock.calls[0][0].title).toContain("Iscrizioni ancora aperte");
    expect(removeAppNotifications).toHaveBeenCalledWith("NEW_TRAINING", "/allenamento/2026-10-06");
    expect(mockAppAll.mock.calls[0][0].title).toBe("Iscrizioni ancora aperte");
  });

  it("il primo avviso non cancella niente", async () => {
    notifySessionOpen(base);
    await flush();
    expect(removeAppNotifications).not.toHaveBeenCalled();
  });

  it("allenamento aperto a tutti: push e notifica in-app a tutti", async () => {
    notifySessionOpen(base);
    await flush();
    expect(mockToAll).toHaveBeenCalledOnce();
    expect(mockAppAll).toHaveBeenCalledOnce();
    expect(mockAudience).not.toHaveBeenCalled();
    expect(mockAppTargeted).not.toHaveBeenCalled();
  });

  it("allenamento riservato: push e in-app a chi puo' iscriversi", async () => {
    notifySessionOpen({ ...base, restrictTeamId: "team-1", openRoles: [1] });
    await flush();
    expect(mockAudience).toHaveBeenCalledWith({
      allowedRoles: [],
      restrictTeamId: "team-1",
      openRoles: [1],
    });
    expect(mockToUsers).toHaveBeenCalledWith(["u1", "u2"], expect.any(Object), "NEW_TRAINING");
    expect(mockAppTargeted).toHaveBeenCalledWith(
      ["u1", "u2"],
      expect.objectContaining({ type: "NEW_TRAINING", title: "Nuovo allenamento" })
    );
    expect(mockToAll).not.toHaveBeenCalled();
    expect(mockAppAll).not.toHaveBeenCalled();
  });

  it("usa il titolo del tipo di avviso anche per i riservati", async () => {
    notifySessionOpen({ ...base, allowedRoles: [1, 2] }, "closed");
    await flush();
    expect(mockAppTargeted).toHaveBeenCalledWith(
      ["u1", "u2"],
      expect.objectContaining({ title: "Iscrizioni chiuse" })
    );
  });
});
