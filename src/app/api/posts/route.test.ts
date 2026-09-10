import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db", () => ({
  prisma: {
    post: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToAll: vi.fn().mockResolvedValue({ sent: 0, removed: 0 }),
}));

vi.mock("@/lib/notifications/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 59 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "coach-1", appRole: "COACH" } }),
}));

vi.mock("@/lib/slugUtils", () => ({
  generatePostSlug: vi.fn().mockResolvedValue("un-titolo"),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = { post: { findMany: Mock; create: Mock } };
const p = prisma as unknown as PrismaMock;

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const basePost = {
  title: "Un titolo",
  body: "<p>Contenuto della news</p>",
  publish: true,
};

const poll = {
  question: "Ci sarai?",
  multiSelect: false,
  options: [
    { text: "Sì", order: 0 },
    { text: "No", order: 1 },
  ],
};

/** Il record che Prisma restituirebbe: al test serve solo che sia serializzabile. */
function createdPost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    slug: "un-titolo",
    title: basePost.title,
    body: basePost.body,
    publishedAt: new Date("2026-09-01T10:00:00.000Z"),
    author: { name: "Coach" },
    poll: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (isCoachOrAdmin as Mock).mockResolvedValue(true);
  p.post.create.mockResolvedValue(createdPost());
});

describe("POST /api/posts", () => {
  it("crea un post con sondaggio senza data di chiusura", async () => {
    const res = await POST(makePost({ ...basePost, poll: { ...poll, closesAt: null } }));
    expect(res.status).toBe(201);
    const data = p.post.create.mock.calls[0][0].data;
    expect(data.poll.create.question).toBe("Ci sarai?");
    expect(data.poll.create.closesAt).toBeNull();
    expect(data.poll.create.options.create).toHaveLength(2);
  });

  it("crea un post con sondaggio e data di chiusura, convertita in Date", async () => {
    const closesAt = "2026-09-14T18:23:00.000Z";
    const res = await POST(makePost({ ...basePost, poll: { ...poll, closesAt } }));
    expect(res.status).toBe(201);
    const data = p.post.create.mock.calls[0][0].data;
    expect(data.poll.create.closesAt).toBeInstanceOf(Date);
    expect((data.poll.create.closesAt as Date).toISOString()).toBe(closesAt);
  });

  it("rifiuta una data di chiusura senza fuso, come la manda un input datetime-local grezzo", async () => {
    // È il caso che rompeva la creazione: il client ora converte prima di inviare.
    const res = await POST(
      makePost({ ...basePost, poll: { ...poll, closesAt: "2026-09-14T20:23" } })
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toHaveProperty("error");
  });

  it("crea un post senza sondaggio", async () => {
    const res = await POST(makePost({ ...basePost, poll: null }));
    expect(res.status).toBe(201);
    expect(p.post.create.mock.calls[0][0].data.poll).toBeUndefined();
  });

  it("traduce un vincolo di unicità in 409 JSON, non in un 500 con pagina HTML", async () => {
    p.post.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.0.0",
      })
    );
    const res = await POST(makePost({ ...basePost, poll: null }));
    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("traduce un errore Prisma qualsiasi in JSON con il codice", async () => {
    p.post.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Foreign key failed", {
        code: "P2003",
        clientVersion: "6.0.0",
      })
    );
    const res = await POST(makePost({ ...basePost, poll: null }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: expect.stringContaining("P2003"),
    });
  });

  it("non lascia sfuggire un errore inatteso come 500 senza corpo JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    p.post.create.mockRejectedValue(new Error("connessione persa"));
    const res = await POST(makePost({ ...basePost, poll: null }));
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toHaveProperty("error");
  });

  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    const res = await POST(makePost({ ...basePost, poll: null }));
    expect(res.status).toBe(401);
  });
});
