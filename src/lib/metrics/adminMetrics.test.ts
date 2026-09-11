import { describe, it, expect } from "vitest";
import {
  computeMatchMetrics,
  computeTrainingMetrics,
  countActiveUsers,
  median,
  ratio,
  type TrainingRegistrationRow,
} from "./adminMetrics";

const DAY = 24 * 60 * 60 * 1000;
const MAX_AGE_S = 90 * 24 * 60 * 60;
const now = new Date("2026-09-12T12:00:00Z");
const at = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY);

describe("ratio e median", () => {
  it("un denominatore zero non è 0% ma non misurabile", () => {
    expect(ratio(0, 0)).toBeNull();
    expect(ratio(1, 4)).toBe(0.25);
  });

  it("mediana su valori pari e dispari", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("countActiveUsers", () => {
  it("conta chi ha usato l'app nella finestra, una volta per utente", () => {
    const sessions = [
      // usata oggi: scade fra 90 giorni
      { userId: "a", expires: at(90) },
      // stesso utente, secondo dispositivo usato 10 giorni fa
      { userId: "a", expires: at(80) },
      // usata 20 giorni fa
      { userId: "b", expires: at(70) },
      // usata 40 giorni fa: fuori da una finestra di 30
      { userId: "c", expires: at(50) },
    ];
    expect(countActiveUsers(sessions, now, 30, MAX_AGE_S)).toBe(2);
    expect(countActiveUsers(sessions, now, 60, MAX_AGE_S)).toBe(3);
  });

  it("esclude le sessioni del vecchio regime da un anno", () => {
    // Scadenza fra 300 giorni: sessione da un anno, ultimo uso sconosciuto.
    expect(countActiveUsers([{ userId: "x", expires: at(300) }], now, 30, MAX_AGE_S)).toBe(0);
  });
});

const reg = (over: Partial<TrainingRegistrationRow> = {}): TrainingRegistrationRow => ({
  createdAt: at(-3),
  attended: null,
  userId: "u",
  childId: null,
  registeredAsCoach: false,
  ...over,
});

describe("computeTrainingMetrics", () => {
  it("calcola media iscritti, presenze, tempestività e iscrizioni anonime", () => {
    const opened = at(-5);
    const m = computeTrainingMetrics([
      {
        date: at(-2),
        registrationOpenedAt: opened,
        managedAt: at(-1), // chiuso il giorno dopo
        registrations: [
          reg({ createdAt: new Date(opened.getTime() + 60 * 60 * 1000), attended: true }),
          reg({ createdAt: at(-3), attended: false }),
          reg({ userId: null, childId: null, attended: true }), // anonimo
          reg({ registeredAsCoach: true, attended: true }), // allenatore: non conta
        ],
      },
      {
        date: at(-10),
        registrationOpenedAt: null,
        managedAt: at(-2), // chiuso dopo 8 giorni
        registrations: [reg()],
      },
    ]);
    expect(m.sessions).toBe(2);
    expect(m.avgAthletes).toBe(2); // (3 + 1) / 2
    expect(m.attendanceRate).toBeCloseTo(2 / 3); // l'iscritto non segnato non entra
    expect(m.within24hRate).toBeCloseTo(1 / 3); // solo la sessione con apertura nota
    expect(m.anonymousRate).toBe(0.25);
    expect(m.concludedWithin48hRate).toBe(0.5);
  });

  it("senza dati restituisce non misurabile, non zero", () => {
    const m = computeTrainingMetrics([]);
    expect(m.sessions).toBe(0);
    expect(m.avgAthletes).toBeNull();
    expect(m.attendanceRate).toBeNull();
  });
});

describe("computeMatchMetrics", () => {
  it("tasso di risposta sui membri della squadra e anticipo mediano", () => {
    const m = computeMatchMetrics([
      {
        date: at(0),
        teamMembers: 10,
        availabilities: [{ createdAt: at(-6) }, { createdAt: at(-2) }, { createdAt: at(-1) }],
      },
      { date: at(-7), teamMembers: 10, availabilities: [{ createdAt: at(-9) }] },
    ]);
    expect(m.matches).toBe(2);
    expect(m.responseRate).toBe(0.2); // 4 su 20
    expect(m.medianLeadDays).toBe(2); // anticipi 6, 2, 1, 2
  });

  it("non supera il 100% se hanno risposto giocatori usciti dalla rosa", () => {
    const m = computeMatchMetrics([
      {
        date: at(0),
        teamMembers: 1,
        availabilities: [{ createdAt: at(-1) }, { createdAt: at(-1) }],
      },
    ]);
    expect(m.responseRate).toBe(1);
  });
});
