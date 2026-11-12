import { describe, it, expect } from "vitest";
import type { TrainingRecord } from "@/lib/rating/badges";
import {
  attendanceReminderDue,
  buildSeasonRecap,
  badgesOfSeason,
  mergePersonStats,
  nextSeasonLabel,
  recapAccess,
  seasonTrainings,
  type RecapInput,
  type RecapMatchStat,
} from "./seasonRecap";

const CLUB = { trainings: 70, matches: 19, points: 612 };

let seq = 0;
const stat = (over: Partial<RecapMatchStat> = {}): RecapMatchStat => ({
  matchId: `m${++seq}`,
  slug: null,
  opponentName: "Thiene",
  points: 0,
  twoPointers: 0,
  threePointers: 0,
  freeThrows: 0,
  shotsAttempted: 0,
  fouls: 0,
  illegalFouls: 0,
  isLoan: false,
  won: false,
  date: new Date("2027-01-10T18:00:00Z"),
  season: "2026-27",
  ...over,
});

/** `n` allenamenti della stagione, uno a settimana da settembre; i primi `attended` con la presenza. */
function trainings(n: number, attended: number, season = "2026-27"): TrainingRecord[] {
  const startYear = Number(season.slice(0, 4));
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(Date.UTC(startYear, 8, 7 + i * 7, 18)),
    season,
    attended: i < attended,
  }));
}

const input = (over: Partial<RecapInput> = {}): RecapInput => ({
  trainings: [],
  matchStats: [],
  mvpSeasons: [],
  topScorerSeasons: [],
  sportRole: 3,
  teams: [{ name: "Kapuleti", color: "violet" }],
  ...over,
});

describe("nextSeasonLabel", () => {
  it("passa alla stagione dopo", () => {
    expect(nextSeasonLabel("2026-27")).toBe("2027-28");
    expect(nextSeasonLabel("2099-00")).toBe("2100-01");
  });
});

describe("seasonTrainings", () => {
  it("niente presenze, niente voce", () => {
    expect(seasonTrainings(trainings(12, 0), "2026-27")).toBeNull();
  });

  it("conta dal primo allenamento a cui è venuto", () => {
    // Arriva al quinto allenamento e non ne salta nessuno.
    const list = trainings(14, 14).map((t, i) => ({ ...t, attended: i >= 4 }));
    const r = seasonTrainings(list, "2026-27");
    expect(r?.attended).toBe(10);
    expect(r?.share).toEqual({ attended: 10, total: 10 });
    expect(r?.tone).toBe("always");
  });

  it("la quota bassa non si mostra", () => {
    const list = trainings(20, 20).map((t, i) => ({ ...t, attended: i % 2 === 0 }));
    const r = seasonTrainings(list, "2026-27");
    expect(r?.attended).toBe(10);
    expect(r?.share).toBeNull();
    expect(r?.tone).toBe("some");
  });

  it("su pochi allenamenti segnati la quota non si mostra", () => {
    const r = seasonTrainings(trainings(6, 6), "2026-27");
    expect(r?.share).toBeNull();
  });

  it("guarda solo la stagione chiesta", () => {
    const r = seasonTrainings([...trainings(30, 30, "2025-26"), ...trainings(3, 3)], "2026-27");
    expect(r?.attended).toBe(3);
  });
});

describe("buildSeasonRecap", () => {
  it("atleta con solo allenamenti: niente partite, niente MVP", () => {
    const r = buildSeasonRecap(input({ trainings: trainings(30, 25) }), "2026-27", CLUB);
    expect(r.hasData).toBe(true);
    expect(r.trainings?.attended).toBe(25);
    expect(r.trainings?.share).toEqual({ attended: 25, total: 30 });
    expect(r.trainings?.tone).toBe("steady");
    expect(r.matches).toBeNull();
    expect(r.mvp).toBeNull();
    // Primo allenamento, 10 e 25 presenze sono arrivati in questa stagione.
    expect(r.badges.map((b) => b.id)).toEqual(
      expect.arrayContaining(["primo_allenamento", "dieci_allenamenti", "venticinque_allenamenti"])
    );
    expect(r.highlights.map((h) => h.kind)).toEqual(["trainings", "badges"]);
    expect(r.club).toEqual(CLUB);
  });

  it("atleta con partite, MVP e traguardi", () => {
    const r = buildSeasonRecap(
      input({
        trainings: trainings(12, 12),
        matchStats: [
          stat({ points: 6, date: new Date("2026-11-01") }),
          stat({
            matchId: "best",
            slug: "karibu-thiene",
            points: 14,
            date: new Date("2027-03-12"),
          }),
          stat({ points: 14, date: new Date("2027-02-01") }),
          stat({ points: 4, season: "2025-26", date: new Date("2026-03-01") }),
        ],
        mvpSeasons: ["2026-27", "2026-27", "2025-26"],
      }),
      "2026-27",
      CLUB
    );
    expect(r.matches).toMatchObject({ played: 3, points: 34 });
    // A parità di punti vince la più recente.
    expect(r.matches?.best).toMatchObject({ matchId: "best", points: 14, slug: "karibu-thiene" });
    expect(r.mvp).toBe(2);
    const ids = r.badges.map((b) => b.id);
    expect(ids).toContain("doppia_cifra");
    // L'esordio è della stagione prima: non è un traguardo di questa.
    expect(ids).not.toContain("esordiente");
    expect(ids).not.toContain("primo_canestro");
    expect(r.highlights).toEqual([
      { kind: "points", value: 34 },
      { kind: "trainings", value: 12 },
      { kind: "badges", value: ids.length },
    ]);
  });

  it("con una partita sola niente 'partita migliore'", () => {
    const r = buildSeasonRecap(input({ matchStats: [stat({ points: 8 })] }), "2026-27", CLUB);
    expect(r.matches).toMatchObject({ played: 1, points: 8, best: null });
  });

  it("partite senza punti: niente partita migliore, e i punti non vanno sull'immagine", () => {
    const r = buildSeasonRecap(
      input({ matchStats: [stat(), stat()], sportRole: 1 }),
      "2026-27",
      CLUB
    );
    expect(r.matches).toMatchObject({ played: 2, points: 0, best: null });
    expect(r.highlights.map((h) => h.kind)).not.toContain("points");
  });

  it("le voci a zero non compaiono, e senza dati il riepilogo è vuoto", () => {
    const r = buildSeasonRecap(input({ trainings: trainings(20, 20, "2025-26") }), "2026-27", CLUB);
    expect(r.trainings).toBeNull();
    expect(r.matches).toBeNull();
    expect(r.mvp).toBeNull();
    expect(r.badges).toEqual([]);
    expect(r.hasData).toBe(false);
    expect(r.highlights).toEqual([]);
  });

  it("figlio con un account collegato: le partite delle due chiavi contano una volta", () => {
    const shared = stat({ matchId: "same", points: 10 });
    const merged = mergePersonStats([
      shared,
      { ...shared, points: 0 }, // riga rimasta sulla scheda per un collegamento a metà
      stat({ points: 3 }),
    ]);
    const r = buildSeasonRecap(input({ matchStats: merged }), "2026-27", CLUB);
    expect(r.matches).toMatchObject({ played: 2, points: 13 });
  });
});

describe("badgesOfSeason", () => {
  it("Stagione fedele cade nella stagione in cui è stata fatta", () => {
    const i = input({ trainings: trainings(20, 18) });
    expect(badgesOfSeason(i, "2026-27").map((b) => b.id)).toContain("stagione_fedele");
    expect(badgesOfSeason(i, "2027-28").map((b) => b.id)).not.toContain("stagione_fedele");
  });

  it("Top scorer cade nella sua stagione", () => {
    const i = input({ topScorerSeasons: ["2025-26"] });
    expect(badgesOfSeason(i, "2025-26").map((b) => b.id)).toContain("top_scorer");
    expect(badgesOfSeason(i, "2026-27").map((b) => b.id)).not.toContain("top_scorer");
  });
});

describe("recapAccess", () => {
  const base = { published: true, loggedIn: true, isStaff: false, relation: "self" } as const;

  it("chi non ha fatto l'accesso va al login", () => {
    expect(recapAccess({ ...base, loggedIn: false })).toBe("login");
  });

  it("prima della pubblicazione non esiste, salvo per lo staff", () => {
    expect(recapAccess({ ...base, published: false })).toBe("notFound");
    expect(recapAccess({ ...base, published: false, isStaff: true, relation: "other" })).toBe("ok");
  });

  it("dopo la pubblicazione: la persona e i genitori sì, gli altri no", () => {
    expect(recapAccess(base)).toBe("ok");
    expect(recapAccess({ ...base, relation: "guardian" })).toBe("ok");
    expect(recapAccess({ ...base, relation: "other" })).toBe("notFound");
  });
});

describe("attendanceReminderDue", () => {
  it("da aprile ad agosto, finché i riepiloghi non sono pubblicati", () => {
    expect(attendanceReminderDue(new Date("2027-03-31T12:00:00Z"), false)).toBe(false);
    expect(attendanceReminderDue(new Date("2027-04-01T12:00:00Z"), false)).toBe(true);
    expect(attendanceReminderDue(new Date("2027-05-20T12:00:00Z"), true)).toBe(false);
    expect(attendanceReminderDue(new Date("2027-09-01T12:00:00Z"), false)).toBe(false);
  });
});
