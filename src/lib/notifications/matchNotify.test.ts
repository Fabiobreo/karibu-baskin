import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/notifications/webpush", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("@/lib/notifications/appNotifications", () => ({
  createTargetedAppNotifications: vi.fn(),
}));

import {
  callupDeclinedNotice,
  callupNotices,
  staffAvailabilityNotices,
  type MatchLabelInput,
} from "./matchNotify";

// Domenica 25 ottobre 2026, 15:00 a Roma.
const MATCH: MatchLabelInput = {
  id: "m1",
  slug: "arancioni-nove",
  date: new Date("2026-10-25T14:00:00Z"),
  teamName: "Arancioni",
  opponentName: "Nove",
};

const marco = { name: "Marco Rossi", selfIds: ["u-marco"], guardianIds: ["u-mamma"] };
const bimbo = { name: "Luca Bianchi", selfIds: [], guardianIds: ["u-papa", "u-mamma2"] };

describe("callupNotices", () => {
  it("convocazione: 'Sei' al giocatore, il nome ai genitori, link alla partita", () => {
    const notices = callupNotices(MATCH, [marco, bimbo], "added");
    expect(notices).toHaveLength(3);
    const [self, mum, parents] = notices;
    expect(self.ids).toEqual(["u-marco"]);
    expect(self.body).toBe(
      "Sei fra i convocati di Arancioni vs Nove, domenica 25 ottobre alle 15:00."
    );
    expect(mum.ids).toEqual(["u-mamma"]);
    expect(mum.body).toMatch(/^Marco è fra i convocati di Arancioni vs Nove/);
    expect(parents.ids).toEqual(["u-papa", "u-mamma2"]);
    expect(parents.body).toMatch(/^Luca è fra i convocati/);
    for (const n of notices) {
      expect(n.type).toBe("MATCH_CALLUP");
      expect(n.title).toBe("Convocazione");
      expect(n.url).toBe("/partite/arancioni-nove");
    }
  });

  it("ritiro: testo proprio, stesso tipo", () => {
    const [self, mum] = callupNotices(MATCH, [marco], "removed");
    expect(self.title).toBe("Convocazione ritirata");
    expect(self.body).toMatch(/^Non sei più fra i convocati/);
    expect(mum.body).toMatch(/^Marco non è più fra i convocati/);
  });

  it("promemoria: titolo proprio, stesso testo della convocazione", () => {
    const [self, mum] = callupNotices(MATCH, [marco], "reminder");
    expect(self.title).toBe("Promemoria convocazione");
    expect(self.body).toMatch(/^Sei fra i convocati di Arancioni vs Nove/);
    expect(mum.body).toMatch(/^Marco è fra i convocati/);
    expect(self.type).toBe("MATCH_CALLUP");
  });

  it("niente em dash nei testi", () => {
    const all = [
      ...callupNotices(MATCH, [marco], "added"),
      ...callupNotices(MATCH, [marco], "removed"),
      ...staffAvailabilityNotices(MATCH, marco, true),
    ];
    for (const n of all) expect(`${n.title} ${n.body}`).not.toContain("—");
  });
});

describe("staffAvailabilityNotices", () => {
  it("dice alla famiglia che ha risposto lo staff e dove correggere", () => {
    const [self, mum] = staffAvailabilityNotices(MATCH, marco, true);
    expect(self.type).toBe("MATCH_AVAILABILITY");
    expect(self.url).toBe("/profilo/disponibilita");
    expect(self.body).toMatch(/^Lo staff ti ha segnato disponibile per Arancioni vs Nove/);
    expect(self.body).toContain("«Le mie disponibilità»");
    expect(mum.body).toMatch(/^Lo staff ha segnato Marco disponibile/);
  });
});

describe("callupDeclinedNotice", () => {
  it("avvisa lo staff e porta alle convocazioni", () => {
    const n = callupDeclinedNotice(MATCH, "Marco Rossi", ["coach"]);
    expect(n?.ids).toEqual(["coach"]);
    expect(n?.body).toMatch(/^Marco Rossi ha detto che non c'è per Arancioni vs Nove/);
    expect(n?.url).toBe("/admin/partite/m1/convocazioni");
  });

  it("senza staff non c'è niente da mandare", () => {
    expect(callupDeclinedNotice(MATCH, "Marco Rossi", [])).toBeNull();
  });
});
