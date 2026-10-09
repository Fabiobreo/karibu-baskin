import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    playerMatchStats: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    match: {
      findUnique: vi.fn().mockResolvedValue({ teamId: "team-1", team: { season: "2025-26" } }),
    },
    teamMembership: {
      findMany: vi.fn().mockResolvedValue([{ userId: "user-1", childId: null }]),
    },
    child: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications/webpush", () => ({
  sendPushToUsers: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createTargetedAppNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rating/badgeService", () => ({
  reconcilePlayerBadges: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/apiAuth", () => ({
  isAdminUser: vi.fn().mockResolvedValue(false),
  isMember: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/authjs", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { GET, PUT } from "./route";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { reconcilePlayerBadges } from "@/lib/rating/badgeService";

type PrismaMock = {
  playerMatchStats: { findMany: Mock; upsert: Mock };
};
const p = prisma as unknown as PrismaMock;
const mockIsAdmin = isAdminUser as Mock;

const makeParams = (matchId: string) =>
  ({ params: Promise.resolve({ matchId }) }) as { params: Promise<{ matchId: string }> };

const stat1 = {
  id: "stat-1",
  matchId: "match-1",
  userId: "user-1",
  childId: null,
  points: 10,
  twoPointers: 2,
  threePointers: 2,
  freeThrows: 0,
  fouls: 2,
  illegalFouls: 0,
  shotsAttempted: 0,
  notes: null,
  user: { id: "user-1", name: "Mario Rossi", image: null, sportRole: 3, sportRoleVariant: null },
  child: null,
};

describe("GET /api/matches/[matchId]/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    p.playerMatchStats.findMany.mockResolvedValue([stat1]);
  });

  it("restituisce le statistiche per la partita", async () => {
    const req = new Request("http://localhost/api/matches/match-1/stats");
    const res = await GET(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].points).toBe(10);
    expect(p.playerMatchStats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { matchId: "match-1" } })
    );
  });

  it("restituisce array vuoto se nessuna statistica", async () => {
    p.playerMatchStats.findMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/matches/match-1/stats");
    const res = await GET(req, makeParams("match-1"));
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe("PUT /api/matches/[matchId]/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(false);
    p.playerMatchStats.upsert.mockResolvedValue(stat1);
  });

  it("restituisce 403 per utente non admin", async () => {
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ userId: "user-1", twoPointers: 3 }]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(403);
  });

  it("restituisce 400 per payload non valido (non array)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-1" }),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(400);
  });

  it("restituisce 400 per JSON non valido", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "BAD_JSON",
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(400);
  });

  it("calcola points dai tiri e fa upsert per userId", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          userId: "user-1",
          twoPointers: 3,
          threePointers: 2,
          freeThrows: 1,
          fouls: 2,
          illegalFouls: 0,
          shotsAttempted: 0,
        },
      ]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.where).toHaveProperty("matchId_userId");
    // 3*2 + 2*3 + 1 = 13
    expect(upsertCall.create.points).toBe(13);
    expect(upsertCall.create.twoPointers).toBe(3);
    expect(upsertCall.create.threePointers).toBe(2);
    expect(upsertCall.create.freeThrows).toBe(1);
  });

  it("esegue upsert per childId", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const childStat = { ...stat1, userId: null, childId: "child-1" };
    p.playerMatchStats.upsert.mockResolvedValue(childStat);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ childId: "child-1", twoPointers: 2, freeThrows: 1 }]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.where).toHaveProperty("matchId_childId");
    expect(upsertCall.create.childId).toBe("child-1");
    expect(upsertCall.create.points).toBe(5); // 2*2 + 1
  });

  it("usa 0 come default per campi numerici non forniti", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ userId: "user-1" }]),
    });
    await PUT(req, makeParams("match-1"));
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.create.points).toBe(0);
    expect(upsertCall.create.twoPointers).toBe(0);
    expect(upsertCall.create.threePointers).toBe(0);
    expect(upsertCall.create.freeThrows).toBe(0);
    expect(upsertCall.create.fouls).toBe(0);
    expect(upsertCall.create.illegalFouls).toBe(0);
    expect(upsertCall.create.shotsAttempted).toBe(0);
  });

  it("trimma le note e le imposta a null se stringa vuota", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ userId: "user-1", notes: "  " }]),
    });
    await PUT(req, makeParams("match-1"));
    const upsertCall = p.playerMatchStats.upsert.mock.calls[0][0];
    expect(upsertCall.create.notes).toBeNull();
  });

  it("accetta array vuoto e restituisce array vuoto", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const req = new Request("http://localhost/api/matches/match-1/stats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const res = await PUT(req, makeParams("match-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
    expect(p.playerMatchStats.upsert).not.toHaveBeenCalled();
  });
});

// Le statistiche di una partita di oltre un mese fa sono storico inserito a
// posteriori: si salvano, ma "Statistiche disponibili" non parte.
describe("PUT /api/matches/[matchId]/stats · notifiche", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const matchMock = (prisma as unknown as { match: { findUnique: Mock } }).match.findUnique;
  const matchOn = (date: Date) =>
    matchMock.mockResolvedValue({
      teamId: "team-1",
      date,
      slug: null,
      team: { id: "team-1", season: "2025-26", name: "Karibu A" },
      opponent: { name: "Avversari FC" },
      opponentTeam: null,
    });
  const putStats = (rows: object[] = [{ userId: "user-1", twoPointers: 3 }]) =>
    PUT(
      new Request("http://localhost/api/matches/match-1/stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      }),
      makeParams("match-1")
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockResolvedValue(true);
    p.playerMatchStats.upsert.mockResolvedValue(stat1);
  });

  it("partita recente: avvisa solo chi ha una riga, rispettando la preferenza", async () => {
    matchOn(new Date(Date.now() - 2 * DAY));
    expect((await putStats()).status).toBe(200);
    await vi.waitFor(() => expect(sendPushToUsers).toHaveBeenCalledOnce());
    const [ids, , notifType] = (sendPushToUsers as Mock).mock.calls[0];
    expect(ids).toEqual(["user-1"]);
    expect(notifType).toBe("MATCH_RESULT");
    expect((createTargetedAppNotifications as Mock).mock.calls[0][0]).toEqual(["user-1"]);
    expect(reconcilePlayerBadges).toHaveBeenCalledWith({ userId: "user-1" }, { notify: true });
  });

  it("per un figlio avvisa i genitori", async () => {
    matchOn(new Date(Date.now() - 2 * DAY));
    (prisma as unknown as { child: { findMany: Mock } }).child.findMany.mockResolvedValue([
      { userId: null, guardians: [{ userId: "mamma" }] },
    ]);
    expect((await putStats([{ childId: "child-1", twoPointers: 1 }])).status).toBe(200);
    await vi.waitFor(() => expect(sendPushToUsers).toHaveBeenCalledOnce());
    expect((sendPushToUsers as Mock).mock.calls[0][0]).toEqual(["mamma"]);
  });

  it("partita di oltre un mese fa: salva senza avvisare", async () => {
    matchOn(new Date(Date.now() - 200 * DAY));
    expect((await putStats()).status).toBe(200);
    expect(p.playerMatchStats.upsert).toHaveBeenCalledOnce();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sendPushToUsers).not.toHaveBeenCalled();
    expect(createTargetedAppNotifications).not.toHaveBeenCalled();
    // I badge si salvano comunque, ma in silenzio.
    expect(reconcilePlayerBadges).toHaveBeenCalledWith({ userId: "user-1" }, { notify: false });
  });
});

// Tutela dei minori: chi non è tesserato non li vede, e la data di nascita non
// esce mai dall'API, nemmeno per gli adulti (serve solo a decidere).
describe("GET /api/matches/[matchId]/stats · tutela dei minori", () => {
  const adult = {
    ...stat1,
    id: "s-adult",
    user: { ...stat1.user, birthDate: new Date("1990-01-01") },
  };
  const minor = {
    ...stat1,
    id: "s-minor",
    userId: "user-2",
    user: { ...stat1.user, id: "user-2", birthDate: new Date("2013-01-01") },
  };
  const childNoDate = {
    ...stat1,
    id: "s-child",
    userId: null,
    childId: "child-1",
    user: null,
    child: { id: "child-1", name: "Figlio", sportRole: 2, sportRoleVariant: null, birthDate: null },
  };

  async function getAs(member: boolean) {
    const { isMember } = await import("@/lib/apiAuth");
    (isMember as Mock).mockResolvedValue(member);
    p.playerMatchStats.findMany.mockResolvedValue([adult, minor, childNoDate]);
    const res = await GET(new Request("http://localhost"), makeParams("match-1"));
    return res.json();
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("per chi non è tesserato toglie i minori, figli senza data compresi", async () => {
    const json = await getAs(false);
    expect(json.map((s: { id: string }) => s.id)).toEqual(["s-adult"]);
  });

  it("per un tesserato restituisce tutti", async () => {
    expect(await getAs(true)).toHaveLength(3);
  });

  it("non restituisce mai la data di nascita", async () => {
    for (const member of [true, false]) {
      expect(JSON.stringify(await getAs(member))).not.toContain("birthDate");
    }
  });
});
