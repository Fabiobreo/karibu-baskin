import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/webpush", () => ({
  sendPushToAll:    vi.fn().mockResolvedValue({ sent: 5, removed: 0 }),
  sendPushToFilter: vi.fn().mockResolvedValue({ sent: 2, removed: 0 }),
}));
vi.mock("@/lib/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { sendPushToAll, sendPushToFilter } from "@/lib/webpush";

const mockIsCoach    = isCoachOrAdmin as Mock;
const mockToAll      = sendPushToAll as Mock;
const mockToFilter   = sendPushToFilter as Mock;

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
    mockToFilter.mockResolvedValue({ sent: 2, removed: 0 });
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

  it("usa sendPushToAll con targetAll: true", async () => {
    const res = await POST(makeReq({ title: "Avviso", body: "Allenamento annullato", targetAll: true }));
    expect(res.status).toBe(200);
    expect(mockToAll).toHaveBeenCalledOnce();
    expect(mockToFilter).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.sent).toBe(5);
  });

  it("usa sendPushToFilter con teamId", async () => {
    const res = await POST(makeReq({ title: "Per la squadra", body: "Testo", teamId: "team-1" }));
    expect(res.status).toBe(200);
    expect(mockToFilter).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-1" }),
      expect.any(Object)
    );
    expect(mockToAll).not.toHaveBeenCalled();
  });

  it("usa sendPushToFilter con sportRole", async () => {
    const res = await POST(makeReq({ title: "Per Ruolo 2", body: "Testo", sportRole: 2 }));
    expect(res.status).toBe(200);
    expect(mockToFilter).toHaveBeenCalledWith(
      expect.objectContaining({ sportRole: 2 }),
      expect.any(Object)
    );
  });

  it("usa sendPushToFilter con teamId + sportRole combinati", async () => {
    const res = await POST(makeReq({ title: "Squadra + ruolo", body: "Testo", teamId: "team-1", sportRole: 3 }));
    expect(res.status).toBe(200);
    expect(mockToFilter).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-1", sportRole: 3 }),
      expect.any(Object)
    );
  });

  it("restituisce sent e removed nel body", async () => {
    mockToFilter.mockResolvedValue({ sent: 7, removed: 1 });
    const res = await POST(makeReq({ title: "X", body: "Y", teamId: "team-1" }));
    const json = await res.json();
    expect(json.sent).toBe(7);
    expect(json.removed).toBe(1);
  });
});
