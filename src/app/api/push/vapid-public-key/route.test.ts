import { vi, describe, it, expect, afterEach } from "vitest";

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("GET /api/push/vapid-public-key", () => {
  it("restituisce la chiave VAPID quando configurata", async () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BFake_vapid_key_abc123" };
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ key: "BFake_vapid_key_abc123" });
  });

  it("restituisce 500 se VAPID non configurato", async () => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });
});
