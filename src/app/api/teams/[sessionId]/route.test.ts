import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    registration: {
      findMany: vi.fn(),
    },
    trainingSession: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/apiAuth", () => ({
  isCoachOrAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/webpush", () => ({
  sendPushToUsers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/appNotifications", () => ({
  createAppNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type PrismaMock = {
  registration: { findMany: Mock };
  trainingSession: { update: Mock; findUnique: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsCoachOrAdmin = isCoachOrAdmin as Mock;

function makePost(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teams/sess-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

const mockParams = { params: Promise.resolve({ sessionId: "sess-1" }) };

const athletes = [
  { id: "r1", name: "Alice", role: 1, registeredAsCoach: false, userId: "u1", sessionId: "sess-1", createdAt: new Date(), childId: null },
  { id: "r2", name: "Bob", role: 2, registeredAsCoach: false, userId: "u2", sessionId: "sess-1", createdAt: new Date(), childId: null },
  { id: "r3", name: "Carlo", role: 3, registeredAsCoach: false, userId: "u3", sessionId: "sess-1", createdAt: new Date(), childId: null },
  { id: "r4", name: "Diana", role: 4, registeredAsCoach: false, userId: "u4", sessionId: "sess-1", createdAt: new Date(), childId: null },
  { id: "r5", name: "Eva", role: 5, registeredAsCoach: false, userId: "u5", sessionId: "sess-1", createdAt: new Date(), childId: null },
  { id: "r6", name: "Franco", role: 1, registeredAsCoach: false, userId: "u6", sessionId: "sess-1", createdAt: new Date(), childId: null },
];

describe("POST /api/teams/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCoachOrAdmin.mockResolvedValue(false);
    p.registration.findMany.mockResolvedValue([]);
    p.trainingSession.update.mockResolvedValue({});
    p.trainingSession.findUnique.mockResolvedValue({ title: "Allenamento Test", dateSlug: "2025-01-15" });
  });

  it("restituisce 401 se l'utente non è coach/admin", async () => {
    const res = await POST(makePost(), mockParams);
    expect(res.status).toBe(401);
  });

  it("restituisce 400 se non ci sono iscritti", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const res = await POST(makePost(), mockParams);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Nessun atleta");
  });

  it("genera 2 squadre, salva nel DB e restituisce i dati", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.registration.findMany.mockResolvedValue(athletes);
    const res = await POST(makePost(), mockParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.generated).toBe(true);
    expect(json.teamA).toBeInstanceOf(Array);
    expect(json.teamB).toBeInstanceOf(Array);
    expect(json.teamA.length + json.teamB.length).toBe(athletes.length);
    expect(p.trainingSession.update).toHaveBeenCalledOnce();
  });

  it("genera 3 squadre quando numTeams=3", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    p.registration.findMany.mockResolvedValue(athletes);
    const res = await POST(makePost({ numTeams: 3 }), mockParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.teamC).toBeInstanceOf(Array);
    expect(json.teamA.length + json.teamB.length + json.teamC.length).toBe(athletes.length);
  });

  it("esclude dall'algoritmo gli iscritti come allenatori", async () => {
    mockIsCoachOrAdmin.mockResolvedValue(true);
    const withCoach = [
      ...athletes,
      { id: "r7", name: "Coach", role: 3, registeredAsCoach: true, userId: "u7", sessionId: "sess-1", createdAt: new Date(), childId: null },
    ];
    p.registration.findMany.mockResolvedValue(withCoach);
    const res = await POST(makePost(), mockParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    // L'allenatore non deve comparire in nessuna squadra
    const allPlayers = [...json.teamA, ...json.teamB];
    expect(allPlayers.find((a: { id: string }) => a.id === "r7")).toBeUndefined();
    expect(allPlayers.length).toBe(athletes.length);
  });
});
