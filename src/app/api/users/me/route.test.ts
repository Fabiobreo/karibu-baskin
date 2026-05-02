import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";

type PrismaMock = { user: { findUnique: Mock } };
const p = prisma as unknown as PrismaMock;
const mockAuth = auth as Mock;

const baseUser = {
  id: "user-1",
  name: "Mario Rossi",
  email: "mario@example.com",
  image: "https://example.com/img.jpg",
  appRole: "ATHLETE",
  createdAt: new Date("2025-01-01"),
  sportRole: 2,
  sportRoleVariant: null,
  sportRoleSuggested: null,
  sportRoleSuggestedVariant: null,
  childAccount: null,
  teamMemberships: [],
};

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    p.user.findUnique.mockResolvedValue(baseUser);
  });

  it("restituisce 401 se non autenticato", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("autenticato");
  });

  it("restituisce null se l'utente non è nel DB", async () => {
    p.user.findUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toBeNull();
  });

  it("restituisce il profilo base con linkedChildId null", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("user-1");
    expect(json.name).toBe("Mario Rossi");
    expect(json.linkedChildId).toBeNull();
    expect(json.teamMemberships).toEqual([]);
    expect(json.childAccount).toBeUndefined();
  });

  it("mappa childAccount.id su linkedChildId", async () => {
    p.user.findUnique.mockResolvedValue({
      ...baseUser,
      childAccount: { id: "child-99" },
    });
    const res = await GET();
    const json = await res.json();
    expect(json.linkedChildId).toBe("child-99");
    expect(json.childAccount).toBeUndefined();
  });

  it("trasforma teamMemberships nel formato atteso", async () => {
    p.user.findUnique.mockResolvedValue({
      ...baseUser,
      teamMemberships: [
        {
          teamId: "team-1",
          team: { name: "Gialli", color: "#FFD700", season: "2025-26" },
        },
      ],
    });
    const res = await GET();
    const json = await res.json();
    expect(json.teamMemberships).toHaveLength(1);
    expect(json.teamMemberships[0]).toEqual({
      teamId: "team-1",
      teamName: "Gialli",
      teamColor: "#FFD700",
      teamSeason: "2025-26",
    });
  });

  it("interroga il DB con l'id dell'utente in sessione", async () => {
    await GET();
    expect(p.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    );
  });
});
