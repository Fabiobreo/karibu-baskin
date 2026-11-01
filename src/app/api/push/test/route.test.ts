import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/authjs", () => ({ auth: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));
vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToEndpoint: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@/lib/authjs";
import { sendPushToEndpoint } from "@/lib/notifications/webpush";

const mockAuth = auth as unknown as Mock;
const mockSend = sendPushToEndpoint as unknown as Mock;
const endpoint = "https://fcm.googleapis.com/fcm/send/abc";

function makePost(body: unknown) {
  return new NextRequest("http://localhost/api/push/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/push/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ sent: 1, removed: 0 });
  });

  it("manda la prova solo all'iscrizione dell'utente collegato", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    const res = await POST(makePost({ endpoint }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1 });
    expect(mockSend).toHaveBeenCalledWith(endpoint, "u-1", expect.any(Object));
  });

  it("senza accesso cerca solo fra le iscrizioni anonime", async () => {
    mockAuth.mockResolvedValue(null);
    await POST(makePost({ endpoint }));
    expect(mockSend).toHaveBeenCalledWith(endpoint, null, expect.any(Object));
  });

  it("dice 0 se l'iscrizione non c'è", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    mockSend.mockResolvedValue({ sent: 0, removed: 0 });
    expect(await (await POST(makePost({ endpoint }))).json()).toEqual({ sent: 0 });
  });

  it("rifiuta un endpoint non valido", async () => {
    const res = await POST(makePost({ endpoint: "non-un-url" }));
    expect(res.status).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
