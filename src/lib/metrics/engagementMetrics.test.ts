import { describe, expect, it } from "vitest";
import {
  activeUserIds,
  computeAvailabilityEngagement,
  computeFamilyActivity,
  computeGuestFunnel,
  computeNotificationOpens,
  computeRegistrationSource,
  overallPushOpenRate,
  summarizeShareVisits,
} from "./adminMetrics";
import { groupFamilies } from "@/lib/familyLinks";
import { countDelta, duration, durationDelta, rateDelta } from "./formatMetric";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MAX_AGE_S = 90 * 24 * 60 * 60;
const now = new Date("2026-11-11T12:00:00Z");
const at = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY);

describe("famiglie attive", () => {
  const familyOf = groupFamilies(
    ["mamma", "papa", "figlio", "solo", "altro"],
    [{ userId: "figlio", guardians: [{ userId: "mamma" }, { userId: "papa" }] }]
  );

  it("una famiglia con due genitori e un figlio con account conta una volta sola", () => {
    const active = new Set(["mamma", "papa", "figlio"]);
    expect(computeFamilyActivity(familyOf, active)).toEqual({
      families: 3,
      activeFamilies: 1,
      rate: 1 / 3,
    });
  });

  it("un ospite attivo non è una famiglia", () => {
    expect(computeFamilyActivity(familyOf, new Set(["ospite"])).activeFamilies).toBe(0);
  });

  it("senza tesserati la quota non è misurabile", () => {
    expect(computeFamilyActivity(new Map(), new Set()).rate).toBeNull();
  });

  it("attivo nella settimana = sessione rinnovata negli ultimi 7 giorni", () => {
    const exp = (daysAgo: number) => new Date(now.getTime() + MAX_AGE_S * 1000 - daysAgo * DAY);
    const ids = activeUserIds(
      [
        { userId: "mamma", expires: exp(2) },
        { userId: "solo", expires: exp(10) },
      ],
      now,
      7,
      MAX_AGE_S
    );
    expect([...ids]).toEqual(["mamma"]);
  });
});

describe("risposte alle disponibilità", () => {
  it("conta solo chi risponde prima della prima convocazione", () => {
    const r = computeAvailabilityEngagement([
      {
        date: at(-1),
        createdAt: at(-5),
        rosterSize: 4,
        firstCallupAt: at(-2),
        responses: [{ createdAt: at(-4) }, { createdAt: at(-3) }, { createdAt: at(-1.5) }],
      },
    ]);
    expect(r.answeredBeforeCallupRate).toBe(0.5);
    // Apertura 5 giorni prima: risposte dopo 24, 48 e 84 ore.
    expect(r.medianResponseHours).toBeCloseTo(48);
  });

  it("una partita inserita molto prima si apre 14 giorni prima", () => {
    const r = computeAvailabilityEngagement([
      {
        date: at(0),
        createdAt: at(-90),
        rosterSize: 1,
        firstCallupAt: null,
        responses: [{ createdAt: new Date(at(-14).getTime() + 6 * HOUR) }],
      },
    ]);
    expect(r.medianResponseHours).toBeCloseTo(6);
  });

  it("chi risponde prima dell'apertura conta zero, e mai oltre la rosa", () => {
    const r = computeAvailabilityEngagement([
      {
        date: at(0),
        createdAt: at(-90),
        rosterSize: 1,
        firstCallupAt: null,
        responses: [{ createdAt: at(-30) }, { createdAt: at(-20) }],
      },
    ]);
    expect(r.medianResponseHours).toBe(0);
    expect(r.answeredBeforeCallupRate).toBe(1);
  });

  it("senza partite è n.d.", () => {
    expect(computeAvailabilityEngagement([])).toEqual({
      matches: 0,
      answeredBeforeCallupRate: null,
      medianResponseHours: null,
    });
  });
});

describe("iscrizioni fatte dalle famiglie", () => {
  it("separa quelle aggiunte dallo staff", () => {
    expect(computeRegistrationSource(["a", "b", "c", "d"], new Set(["d", "x"]))).toEqual({
      total: 4,
      byStaff: 1,
      selfRate: 0.75,
    });
    expect(computeRegistrationSource([], new Set()).selfRate).toBeNull();
  });
});

describe("da contatto a tesserato", () => {
  const rows = [
    // Si allena dopo 2 giorni, tesserato 5 giorni dopo l'allenamento.
    { createdAt: at(-30), firstTrainingAt: at(-28), convertedAt: at(-23) },
    // Mai venuto.
    { createdAt: at(-20), firstTrainingAt: null, convertedAt: null },
    // Tesserato prima di allenarsi: l'allenamento non è un passo da ospite.
    { createdAt: at(-10), firstTrainingAt: at(-2), convertedAt: at(-5) },
    // Fuori finestra.
    { createdAt: at(-400), firstTrainingAt: at(-399), convertedAt: at(-398) },
  ];

  it("tre numeri in fila con i giorni mediani", () => {
    expect(computeGuestFunnel(rows, now, 182)).toEqual({
      created: 3,
      trained: 1,
      converted: 2,
      medianDaysToTraining: 2,
      medianDaysToConversion: 5,
    });
  });

  it("quattro settimane fa conta solo quello che era successo allora", () => {
    const r = computeGuestFunnel(rows, at(-25), 182);
    expect(r).toMatchObject({ created: 1, trained: 1, converted: 0 });
  });
});

describe("aperture delle notifiche", () => {
  const rows = [
    { type: "NEW_POST", pushSent: 10, pushOpened: 1, inAppSent: 0, inAppRead: 0 },
    { type: "MATCH_CALLUP", pushSent: 10, pushOpened: 6, inAppSent: 4, inAppRead: 3 },
    { type: "SUGGESTION", pushSent: 0, pushOpened: 0, inAppSent: 2, inAppRead: 1 },
    { type: "BIRTHDAY", pushSent: 20, pushOpened: 1, inAppSent: 0, inAppRead: 0 },
  ];

  it("dalla quota più bassa, i tipi senza push in fondo", () => {
    const out = computeNotificationOpens(rows);
    expect(out.map((r) => r.type)).toEqual(["BIRTHDAY", "NEW_POST", "MATCH_CALLUP", "SUGGESTION"]);
    expect(out[2].inAppRate).toBe(0.75);
    expect(out[3].pushRate).toBeNull();
  });

  it("quota complessiva", () => {
    expect(overallPushOpenRate(rows)).toBe(8 / 40);
    expect(overallPushOpenRate([])).toBeNull();
  });
});

describe("confronto con il mese scorso", () => {
  it("testo neutro, n.d. senza dati", () => {
    expect(countDelta(5, 2)).toBe("+3 rispetto al mese scorso");
    expect(countDelta(2, 2)).toBe("Uguale al mese scorso");
    expect(rateDelta(0.5, 0.45)).toBe("+5 punti rispetto al mese scorso");
    expect(rateDelta(0.4, 0.41)).toBe("-1 punto rispetto al mese scorso");
    expect(rateDelta(null, 0.4)).toBe("Nessun confronto con il mese scorso");
    expect(durationDelta(30, 24)).toBe("+6 ore rispetto al mese scorso");
    expect(duration(null)).toBe("n.d.");
    expect(duration(72)).toBe("3 gg");
  });
});

describe("visite dalle condivisioni", () => {
  it("divide i due periodi e somma per campagna e fonte", () => {
    const split = at(-28);
    const rows = [
      { day: at(-1), campaign: "tabellino", source: "whatsapp", visits: 5 },
      { day: at(-2), campaign: "tabellino", source: "link", visits: 1 },
      { day: at(-3), campaign: "news", source: "qr", visits: 7 },
      { day: at(-30), campaign: "news", source: "whatsapp", visits: 4 },
    ];
    expect(summarizeShareVisits(rows, split)).toEqual({
      total: 13,
      previousTotal: 4,
      byCampaign: [
        { campaign: "news", total: 7, whatsapp: 0, link: 0, qr: 7 },
        { campaign: "tabellino", total: 6, whatsapp: 5, link: 1, qr: 0 },
      ],
    });
  });

  it("senza righe è tutto zero", () => {
    expect(summarizeShareVisits([], now)).toEqual({ total: 0, previousTotal: 0, byCampaign: [] });
  });
});
