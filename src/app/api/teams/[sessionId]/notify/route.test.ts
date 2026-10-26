import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    trainingSession: { findUnique: vi.fn(), update: vi.fn() },
    registration: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/apiAuth", () => ({ isCoachOrAdmin: vi.fn() }));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/notifications/teamsNotify", () => ({ notifyTeamChanges: vi.fn() }));

import { POST } from "./route";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { notifyTeamChanges } from "@/lib/notifications/teamsNotify";

const p = prisma as unknown as {
  trainingSession: { findUnique: Mock; update: Mock };
  registration: { findMany: Mock };
};
const params = { params: Promise.resolve({ sessionId: "s1" }) };
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/teams/s1/notify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params
  );

describe("POST /api/teams/[sessionId]/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isCoachOrAdmin as Mock).mockResolvedValue(true);
    p.registration.findMany.mockResolvedValue([]);
    p.trainingSession.findUnique.mockResolvedValue({
      teams: { teamA: [{ id: "a" }, { id: "n" }], teamB: [{ id: "b" }] },
    });
  });

  it("rifiuta chi non è staff", async () => {
    (isCoachOrAdmin as Mock).mockResolvedValue(false);
    expect((await post({ before: {} })).status).toBe(401);
  });

  it("rifiuta un'assegnazione non valida", async () => {
    expect((await post({ before: { a: "teamZ" } })).status).toBe(400);
  });

  it("confronta con le squadre di quando l'editor è stato aperto", async () => {
    const res = await post({ before: { a: "teamA", b: "teamA" } });
    expect(await res.json()).toEqual({ added: 1, moved: 1 });
    const [, changes] = (notifyTeamChanges as Mock).mock.calls[0];
    expect(changes).toEqual({
      initial: false,
      added: [{ id: "n", key: "teamA" }],
      moved: [{ id: "b", key: "teamB" }],
    });
    // L'avviso resta scritto nelle squadre: la prossima volta si parte da qui.
    expect(p.trainingSession.update.mock.calls[0][0].data.teams.notified).toEqual({
      a: "teamA",
      n: "teamA",
      b: "teamB",
    });
  });

  it("parte dall'ultimo avviso salvato, non da quello che manda il browser", async () => {
    p.trainingSession.findUnique.mockResolvedValue({
      teams: {
        teamA: [{ id: "a" }, { id: "n" }],
        teamB: [{ id: "b" }],
        notified: { a: "teamA", n: "teamA", b: "teamB" },
      },
    });
    // Un `before` vuoto farebbe credere a una prima volta: "Squadre pronte!" a tutti.
    const res = await post({ before: {} });
    expect(await res.json()).toEqual({ added: 0, moved: 0 });
    expect(notifyTeamChanges).not.toHaveBeenCalled();
    expect(p.trainingSession.update).not.toHaveBeenCalled();
  });
});
