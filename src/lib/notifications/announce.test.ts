import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/notifications/webpush", () => ({ sendPushToAll: vi.fn() }));

import { eventAnnouncement, postAnnouncement } from "./announce";
import { canNotifyPost, POST_RENOTIFY_MAX_AGE_MS } from "./renotifyRules";

const event = {
  id: "e1",
  slug: null,
  title: "Torneo di Natale",
  date: new Date("2026-12-19T14:00:00Z"),
};

describe("eventAnnouncement", () => {
  it("primo avviso: etichetta e titolo dell'evento", () => {
    expect(eventAnnouncement(event, "new")).toEqual({
      type: "NEW_EVENT",
      title: "Nuovo evento",
      body: "Torneo di Natale",
      url: "/eventi/e1",
    });
  });

  it("promemoria: titolo diverso e data, nel fuso di Roma", () => {
    const a = eventAnnouncement(event, "reminder");
    expect(a.title).toBe("Promemoria evento");
    expect(a.body).toBe("Torneo di Natale · sabato 19 dicembre, 15:00");
  });
});

describe("postAnnouncement", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const post = { slug: "cena", title: "Cena sociale", poll: null };

  it("news: 'Nuova news', poi 'News da leggere'", () => {
    expect(postAnnouncement(post, "new", now)).toMatchObject({
      type: "NEW_POST",
      title: "Nuova news",
    });
    expect(postAnnouncement(post, "reminder", now).title).toBe("News da leggere");
  });

  it("sondaggio aperto: il promemoria dice che si può ancora votare", () => {
    const open = { ...post, poll: { closesAt: new Date("2026-10-20T12:00:00Z") } };
    const noEnd = { ...post, poll: { closesAt: null } };
    expect(postAnnouncement(open, "new", now)).toMatchObject({
      type: "NEW_POLL",
      title: "Nuovo sondaggio",
    });
    expect(postAnnouncement(open, "reminder", now).title).toBe("Sondaggio ancora aperto");
    expect(postAnnouncement(noEnd, "reminder", now).title).toBe("Sondaggio ancora aperto");
  });

  it("sondaggio chiuso: il promemoria vale come una news", () => {
    const closed = { ...post, poll: { closesAt: new Date("2026-10-01T12:00:00Z") } };
    expect(postAnnouncement(closed, "reminder", now).title).toBe("News da leggere");
  });
});

describe("canNotifyPost", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");

  it("una bozza no, un post recente sì, uno di oltre un mese fa no", () => {
    expect(canNotifyPost(null, now)).toBe(false);
    expect(canNotifyPost("2026-10-01T12:00:00Z", now)).toBe(true);
    expect(canNotifyPost(new Date(now - POST_RENOTIFY_MAX_AGE_MS - 1), now)).toBe(false);
  });
});
