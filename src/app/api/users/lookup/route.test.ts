import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn(),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = { user: { findUnique: Mock; findMany: Mock } };
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const authedSession = { user: { id: "u-self" } };

function makeReq(qs: string): NextRequest {
  return new NextRequest(`http://localhost/api/users/lookup${qs}`);
}

describe("GET /api/users/lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authedSession);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeReq("?email=a@b.com"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no email or name param", async () => {
    const res = await GET(makeReq(""));
    expect(res.status).toBe(400);
  });

  describe("email lookup", () => {
    it("returns 404 when user not found", async () => {
      p.user.findUnique.mockResolvedValue(null);
      const res = await GET(makeReq("?email=nobody@example.com"));
      expect(res.status).toBe(404);
    });

    it("returns user when found", async () => {
      const user = { id: "u-2", name: "Mario Rossi", gender: "MALE", birthDate: null, image: null };
      p.user.findUnique.mockResolvedValue(user);
      const res = await GET(makeReq("?email=mario@example.com"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe("u-2");
    });

    it("normalises email to lowercase before query", async () => {
      p.user.findUnique.mockResolvedValue({ id: "u-2", name: "X", gender: null, birthDate: null, image: null });
      await GET(makeReq("?email=MARIO%40Example.COM"));
      expect(p.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "mario@example.com" } })
      );
    });
  });

  describe("name lookup", () => {
    it("returns empty array when no match", async () => {
      p.user.findMany.mockResolvedValue([]);
      const res = await GET(makeReq("?name=Inesistente"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    it("returns matching users array", async () => {
      const users = [
        { id: "u-3", name: "Mario Bianchi", gender: null, birthDate: null, image: null },
        { id: "u-4", name: "Mario Rossi", gender: null, birthDate: null, image: null },
      ];
      p.user.findMany.mockResolvedValue(users);
      const res = await GET(makeReq("?name=Mario"));
      const data = await res.json();
      expect(data).toHaveLength(2);
    });

    it("excludes the current user from results", async () => {
      p.user.findMany.mockResolvedValue([]);
      await GET(makeReq("?name=Mario"));
      expect(p.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: "u-self" } }),
        })
      );
    });

    it("limits results to 5", async () => {
      p.user.findMany.mockResolvedValue([]);
      await GET(makeReq("?name=Mario"));
      expect(p.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it("uses case-insensitive contains query", async () => {
      p.user.findMany.mockResolvedValue([]);
      await GET(makeReq("?name=mario"));
      expect(p.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: "mario", mode: "insensitive" },
          }),
        })
      );
    });
  });
});
