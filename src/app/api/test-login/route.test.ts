import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = {
  user: { findUnique: Mock };
  session: { findUnique: Mock; findMany: Mock; create: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const baseUser = {
  id: "user-1",
  name: "Mario",
  email: "mario@example.com",
  appRole: "ATHLETE",
};

function makeGet(cookieHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  return new NextRequest("http://localhost/api/test-login", { headers });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/test-login", () => {
  const origEnv = process.env.ENABLE_TEST_LOGIN;

  beforeEach(() => {
    vi.clearAllMocks();
    p.session.findUnique.mockResolvedValue(null);
    p.session.findMany.mockResolvedValue([]);
    mockAuth.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env.ENABLE_TEST_LOGIN = origEnv;
  });

  it("restituisce 404 quando ENABLE_TEST_LOGIN non è 'true'", async () => {
    delete process.env.ENABLE_TEST_LOGIN;
    const res = await GET(makeGet());
    expect(res.status).toBe(404);
  });

  it("restituisce info di diagnostica quando abilitato", async () => {
    process.env.ENABLE_TEST_LOGIN = "true";
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.debug).toBe(true);
    expect(json).toHaveProperty("expectedCookieName");
    expect(json).toHaveProperty("allCookies");
    expect(json).toHaveProperty("recentDbSessions");
  });

  it("identifica sessioni Auth.js nei cookie della richiesta", async () => {
    process.env.ENABLE_TEST_LOGIN = "true";
    const token = "test-session-token-123";
    p.session.findUnique.mockResolvedValue({
      sessionToken: token,
      userId: "user-1",
      expires: new Date(Date.now() + 1000 * 60 * 60),
      user: { id: "user-1", name: "Mario", email: "mario@example.com", appRole: "ATHLETE" },
    });
    const res = await GET(makeGet(`authjs.session-token=${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.foundAuthCookies).toContain("authjs.session-token");
    expect(json.matchedSessions).toHaveLength(1);
  });

  it("include la sessione auth() corrente nel risultato", async () => {
    process.env.ENABLE_TEST_LOGIN = "true";
    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "mario@example.com", appRole: "ATHLETE" } });
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json.currentAuthSession).toMatchObject({ userId: "user-1", email: "mario@example.com" });
  });
});

describe("POST /api/test-login", () => {
  const origEnableTestLogin = process.env.ENABLE_TEST_LOGIN;
  const origNextauthUrl = process.env.NEXTAUTH_URL;
  const origTestPassword = process.env.TEST_PASSWORD;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENABLE_TEST_LOGIN = "true";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    delete process.env.TEST_PASSWORD;
    p.user.findUnique.mockResolvedValue(baseUser);
    p.session.create.mockResolvedValue({});
  });

  afterEach(() => {
    process.env.ENABLE_TEST_LOGIN = origEnableTestLogin;
    process.env.NEXTAUTH_URL = origNextauthUrl;
    process.env.TEST_PASSWORD = origTestPassword;
  });

  it("restituisce 404 quando ENABLE_TEST_LOGIN non è 'true'", async () => {
    delete process.env.ENABLE_TEST_LOGIN;
    const res = await POST(makePost({ email: "mario@example.com", password: "karibu-test" }));
    expect(res.status).toBe(404);
    expect(p.user.findUnique).not.toHaveBeenCalled();
  });

  it("restituisce 400 senza email", async () => {
    const res = await POST(makePost({ password: "karibu-test" }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 senza password", async () => {
    const res = await POST(makePost({ email: "mario@example.com" }));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 con body JSON non valido", async () => {
    const req = new NextRequest("http://localhost/api/test-login", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("restituisce 401 con password errata", async () => {
    const res = await POST(makePost({ email: "mario@example.com", password: "sbagliata" }));
    expect(res.status).toBe(401);
    expect(p.user.findUnique).not.toHaveBeenCalled();
  });

  it("usa la password di default 'karibu-test' quando TEST_PASSWORD non è impostata", async () => {
    const res = await POST(makePost({ email: "mario@example.com", password: "karibu-test" }));
    expect(res.status).toBe(200);
  });

  it("usa TEST_PASSWORD personalizzata quando impostata", async () => {
    process.env.TEST_PASSWORD = "custom-pass";
    const res = await POST(makePost({ email: "mario@example.com", password: "custom-pass" }));
    expect(res.status).toBe(200);
  });

  it("restituisce 404 se l'utente non esiste nel DB", async () => {
    p.user.findUnique.mockResolvedValue(null);
    const res = await POST(makePost({ email: "unknown@example.com", password: "karibu-test" }));
    expect(res.status).toBe(404);
  });

  it("crea una sessione nel DB per l'utente trovato", async () => {
    await POST(makePost({ email: "mario@example.com", password: "karibu-test" }));
    expect(p.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          sessionToken: expect.any(String),
          expires: expect.any(Date),
        }),
      })
    );
  });

  it("restituisce 200 con ok:true e imposta il cookie di sessione (HTTP)", async () => {
    const res = await POST(makePost({ email: "mario@example.com", password: "karibu-test" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("authjs.session-token=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("Secure");
  });

  it("imposta il cookie __Secure- e il flag Secure su HTTPS", async () => {
    process.env.NEXTAUTH_URL = "https://karibu-baskin.vercel.app";
    const res = await POST(makePost({ email: "mario@example.com", password: "karibu-test" }));
    expect(res.status).toBe(200);

    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("__Secure-authjs.session-token=");
    expect(cookie).toContain("Secure");
  });

  it("cerca l'utente per email esatta", async () => {
    await POST(makePost({ email: "mario@example.com", password: "karibu-test" }));
    expect(p.user.findUnique).toHaveBeenCalledWith({ where: { email: "mario@example.com" } });
  });
});
