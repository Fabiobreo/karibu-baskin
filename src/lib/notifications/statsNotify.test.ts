import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/notifications/webpush", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createTargetedAppNotifications: vi.fn(),
}));

import { buildStatsNotices, type StatsNoticePlayer } from "./statsNotify";

const marco: StatsNoticePlayer = {
  name: "Marco",
  points: 6,
  badgeIds: [],
  selfId: null,
  guardianIds: ["mamma", "papa"],
};

describe("buildStatsNotices", () => {
  it("un figlio: i genitori ricevono lo stesso avviso, in un invio solo", () => {
    expect(buildStatsNotices([marco], "Thiene")).toEqual([
      {
        userIds: ["mamma", "papa"],
        title: "Marco ha segnato 6 punti contro Thiene",
        body: "Le statistiche della partita sono online.",
      },
    ]);
  });

  it("con un traguardo nuovo, il traguardo entra nello stesso avviso", () => {
    const [notice] = buildStatsNotices([{ ...marco, badgeIds: ["dieci_partite"] }], "Thiene");
    expect(notice.title).toBe("Marco ha segnato 6 punti contro Thiene");
    expect(notice.body).toBe("Un traguardo nuovo: 10 partite 🔟");
  });

  it("l'atleta con l'account legge in seconda persona, i genitori in terza", () => {
    const notices = buildStatsNotices([{ ...marco, selfId: "marco" }], "Thiene");
    expect(notices.find((n) => n.userIds.includes("marco"))?.title).toBe(
      "Hai segnato 6 punti contro Thiene"
    );
    expect(notices.find((n) => n.userIds.includes("mamma"))?.title).toBe(
      "Marco ha segnato 6 punti contro Thiene"
    );
  });

  it("senza punti: ha giocato, mai 0 punti", () => {
    const [notice] = buildStatsNotices([{ ...marco, points: 0 }], "Thiene");
    expect(notice.title).toBe("Marco ha giocato contro Thiene");
  });

  it("due figli nella stessa partita: un avviso solo che li nomina tutti", () => {
    const sara = { ...marco, name: "Sara", points: 1, badgeIds: ["esordiente"] };
    const notices = buildStatsNotices([marco, sara], "Thiene");
    expect(notices).toHaveLength(1);
    expect(notices[0].title).toBe("Marco 6 punti, Sara 1 punto contro Thiene");
    expect(notices[0].body).toBe("Traguardi nuovi per Sara: Esordiente 🏀");
  });
});
