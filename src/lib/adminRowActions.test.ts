import { describe, expect, it } from "vitest";
import {
  eventDeleteMessage,
  newsMenuEntries,
  notifyActionLabel,
  notifyConfirm,
  teamMenuEntries,
} from "./adminRowActions";

describe("eventDeleteMessage", () => {
  it("nomina l'evento e dice quante risposte si perdono", () => {
    const msg = eventDeleteMessage("Torneo di Natale", 18);
    expect(msg).toContain('"Torneo di Natale"');
    expect(msg).toContain("18 risposte");
  });

  it("al singolare con una risposta, e senza numeri quando nessuno ha risposto", () => {
    expect(eventDeleteMessage("Cena", 1)).toContain("l'unica risposta");
    expect(eventDeleteMessage("Cena", 0)).toContain("Nessuno ha ancora risposto");
  });
});

describe("newsMenuEntries", () => {
  it("una bozza si pubblica avvisando tutti o in silenzio, e non ha pagina pubblica", () => {
    const keys = newsMenuEntries(false).map((e) => e.key);
    expect(keys).toEqual(["publish", "publishSilent"]);
    expect(newsMenuEntries(false)[0].label).toMatch(/avvisa tutti/);
    expect(newsMenuEntries(false)[1].label).toMatch(/senza avvisare/);
  });

  it("una news uscita si può avvisare finché l'API lo accetta", () => {
    const entries = newsMenuEntries(true, { canNotify: true, notified: true });
    expect(entries.map((e) => e.key)).toEqual(["notify", "unpublish", "public"]);
    expect(entries[0].label).toBe("Avvisa di nuovo…");
    expect(newsMenuEntries(true, { canNotify: true, notified: false })[0].label).toBe(
      "Avvisa tutti…"
    );
    expect(newsMenuEntries(true, { canNotify: false }).map((e) => e.key)).not.toContain("notify");
  });

  it("una news pubblicata si rimette in bozza e ha la pagina pubblica", () => {
    expect(newsMenuEntries(true).map((e) => e.key)).toEqual(["unpublish", "public"]);
  });
});

describe("notifyConfirm", () => {
  const now = new Date("2026-10-09T12:00:00").getTime();

  it("mai avvisato: lo dice, e il bottone non parla di 'nuovo'", () => {
    const c = notifyConfirm({ title: "Cena", lastNotifiedAt: null, now });
    expect(notifyActionLabel(null)).toBe("Avvisa tutti…");
    expect(c.title).toBe("Avvisare tutti?");
    expect(c.confirmLabel).toBe("Avvisa");
    expect(c.message).toContain('a tutti per "Cena"');
    expect(c.message).toContain("nessun avviso");
    expect(c.message).toContain("non si può ritirare");
  });

  it("già avvisato: dice quando", () => {
    const c = notifyConfirm({ title: "Cena", lastNotifiedAt: "2026-10-05T18:40:00", now });
    expect(c.title).toBe("Avvisare di nuovo?");
    expect(c.confirmLabel).toBe("Avvisa di nuovo");
    expect(c.message).toContain("Ultimo avviso: ");
    expect(c.message).toContain("18:40");
    expect(c.message).not.toContain("Nelle ultime 24 ore");
  });

  it("avviso partito da meno di un giorno: lo dice per primo", () => {
    const c = notifyConfirm({ title: "Cena", lastNotifiedAt: "2026-10-09T09:00:00", now });
    expect(c.message.startsWith("Nelle ultime 24 ore è già partito un avviso.")).toBe(true);
  });

  it("allenamento riservato: non dice 'a tutti'", () => {
    const c = notifyConfirm({
      title: "Allenamento",
      lastNotifiedAt: "2026-10-05T18:40:00",
      now,
      audience: "a chi può iscriversi",
    });
    expect(c.message).toContain("a chi può iscriversi");
    expect(c.message).not.toContain("a tutti");
  });
});

describe("teamMenuEntries", () => {
  it("all'allenatore niente di ciò che l'API gli rifiuta (modifica, eliminazione)", () => {
    const coach = teamMenuEntries(false);
    expect(coach.keys).not.toContain("edit");
    expect(coach.canDelete).toBe(false);
  });

  it("l'allenatore ha un sottoinsieme delle voci dell'admin, e la pagina pubblica resta a tutti", () => {
    const admin = teamMenuEntries(true);
    const coach = teamMenuEntries(false);
    expect(coach.keys.every((k) => admin.keys.includes(k))).toBe(true);
    expect(admin.keys).toContain("public");
    expect(coach.keys).toContain("public");
    expect(admin.canDelete).toBe(true);
  });
});
