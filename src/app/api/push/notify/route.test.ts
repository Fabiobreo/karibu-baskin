import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "coach-1" } }),
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToAll: vi.fn().mockResolvedValue({ sent: 5, removed: 0 }),
  sendPushToUsers: vi.fn().mockResolvedValue({ sent: 2, removed: 0 }),
  resolveFilterUserIds: vi.fn().mockResolvedValue(["u1", "u2"]),
}));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
  createTargetedAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { resolveFilterUserIds, sendPushToAll, sendPushToUsers } from "@/lib/notifications/webpush";
import {
  createAppNotification,
  createTargetedAppNotifications,
} from "@/lib/notifications/appNotifications";

const mockIsCoach = isCoachOrAdmin as Mock;
const mockToAll = sendPushToAll as Mock;
const mockToUsers = sendPushToUsers as Mock;
const mockResolve = resolveFilterUserIds as Mock;
const mockAppAll = createAppNotification as Mock;
const mockAppTargeted = createTargetedAppNotifications as Mock;
const mockAudit = logAudit as Mock;

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/push/notify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/push/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoach.mockResolvedValue(true);
    mockToAll.mockResolvedValue({ sent: 5, removed: 0 });
    mockToUsers.mockResolvedValue({ sent: 2, removed: 0 });
    mockResolve.mockResolvedValue(["u1", "u2"]);
  });

  it("restituisce 403 se non staff", async () => {
    mockIsCoach.mockResolvedValue(false);
    const res = await POST(makeReq({ title: "Test", body: "Msg", targetAll: true }));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 senza destinatari", async () => {
    const res = await POST(makeReq({ title: "Test", body: "Msg" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/destinatario/i);
  });

  it("restituisce 400 se title o body mancano", async () => {
    const res = await POST(makeReq({ body: "Msg", targetAll: true }));
    expect(res.status).toBe(400);
  });

  it("con targetAll manda push e notifica in-app a tutti", async () => {
    const res = await POST(
      makeReq({ title: "Avviso", body: "Allenamento annullato", targetAll: true })
    );
    expect(res.status).toBe(200);
    expect(mockToAll).toHaveBeenCalledOnce();
    expect(mockAppAll).toHaveBeenCalledOnce();
    expect(mockToUsers).not.toHaveBeenCalled();
    expect(mockAppTargeted).not.toHaveBeenCalled();
    expect((await res.json()).sent).toBe(5);
  });

  it("con una squadra la notifica in-app va solo ai destinatari del push", async () => {
    const res = await POST(makeReq({ title: "Per la squadra", body: "Testo", teamId: "team-1" }));
    expect(res.status).toBe(200);
    expect(mockResolve).toHaveBeenCalledWith(expect.objectContaining({ teamId: "team-1" }));
    expect(mockToUsers).toHaveBeenCalledWith(["u1", "u2"], expect.any(Object));
    expect(mockAppTargeted).toHaveBeenCalledWith(["u1", "u2"], expect.any(Object));
    expect(mockAppAll).not.toHaveBeenCalled();
    expect(mockToAll).not.toHaveBeenCalled();
  });

  it("passa squadra e ruolo combinati al filtro", async () => {
    await POST(
      makeReq({ title: "Squadra + ruolo", body: "Testo", teamId: "team-1", sportRole: 3 })
    );
    expect(mockResolve).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-1", sportRole: 3 })
    );
  });

  it("con un filtro senza nessuno non manda niente a tutti", async () => {
    mockResolve.mockResolvedValue([]);
    mockToUsers.mockResolvedValue({ sent: 0, removed: 0 });
    const res = await POST(makeReq({ title: "X", body: "Y", sportRole: 1 }));
    expect(res.status).toBe(200);
    expect(mockToAll).not.toHaveBeenCalled();
    expect(mockAppAll).not.toHaveBeenCalled();
  });

  it("registra l'invio nel registro attività", async () => {
    await POST(makeReq({ title: "Palestra chiusa", body: "Stasera no", sportRole: 5 }));
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "coach-1",
        action: "SEND_NOTIFICATION",
        targetType: "Notification",
        targetId: "role-5",
        after: expect.objectContaining({ title: "Palestra chiusa", recipients: 2, devices: 2 }),
      })
    );
  });

  it("restituisce 500 in JSON se l'invio fallisce", async () => {
    mockToUsers.mockRejectedValue(new Error("boom"));
    const res = await POST(makeReq({ title: "X", body: "Y", teamId: "team-1" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeTruthy();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it("restituisce sent e removed nel body", async () => {
    mockToUsers.mockResolvedValue({ sent: 7, removed: 1 });
    const res = await POST(makeReq({ title: "X", body: "Y", teamId: "team-1" }));
    const json = await res.json();
    expect(json.sent).toBe(7);
    expect(json.removed).toBe(1);
  });
});
