import { describe, it, expect } from "vitest";
import {
  MatchCreateSchema,
  MatchUpdateSchema,
  PlayerStatsEntrySchema,
  PlayerStatsBatchSchema,
  CallupsSchema,
  deriveResult,
} from "./match";

// ─── deriveResult ──────────────────────────────────────────────────────────────

describe("deriveResult()", () => {
  it("restituisce WIN se ourScore > theirScore", () => {
    expect(deriveResult(80, 60)).toBe("WIN");
    expect(deriveResult(1, 0)).toBe("WIN");
  });

  it("restituisce LOSS se ourScore < theirScore", () => {
    expect(deriveResult(40, 70)).toBe("LOSS");
    expect(deriveResult(0, 1)).toBe("LOSS");
  });

  it("restituisce DRAW se i punteggi sono uguali", () => {
    expect(deriveResult(60, 60)).toBe("DRAW");
    expect(deriveResult(0, 0)).toBe("DRAW");
  });
});

// ─── MatchCreateSchema ────────────────────────────────────────────────────────

describe("MatchCreateSchema", () => {
  const valid = {
    teamId: "team-1",
    opponentId: "opp-1",
    date: "2025-06-15T18:00",
  };

  it("accetta un payload minimo valido", () => {
    expect(MatchCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...valid,
      isHome: true,
      venue: "Palasport Montecchio",
      matchType: "LEAGUE",
      ourScore: 80,
      theirScore: 60,
      result: "WIN",
      notes: "Bella partita",
      matchday: 3,
      groupId: "group-1",
    };
    expect(MatchCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta teamId mancante", () => {
    const { teamId: _, ...rest } = valid;
    expect(MatchCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rifiuta opponentId mancante", () => {
    const { opponentId: _, ...rest } = valid;
    expect(MatchCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rifiuta date mancante", () => {
    const { date: _, ...rest } = valid;
    expect(MatchCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rifiuta matchType non riconosciuto", () => {
    expect(MatchCreateSchema.safeParse({ ...valid, matchType: "UNKNOWN" }).success).toBe(false);
  });

  it("rifiuta ourScore negativo", () => {
    expect(MatchCreateSchema.safeParse({ ...valid, ourScore: -1 }).success).toBe(false);
  });

  it("rifiuta result non riconosciuto", () => {
    expect(MatchCreateSchema.safeParse({ ...valid, result: "FORFEIT" }).success).toBe(false);
  });

  it("accetta result null", () => {
    expect(MatchCreateSchema.safeParse({ ...valid, result: null }).success).toBe(true);
  });

  it("rifiuta venue oltre 200 caratteri", () => {
    expect(MatchCreateSchema.safeParse({ ...valid, venue: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta matchday pari a 0 (min 1)", () => {
    expect(MatchCreateSchema.safeParse({ ...valid, matchday: 0 }).success).toBe(false);
  });
});

// ─── MatchUpdateSchema ────────────────────────────────────────────────────────

describe("MatchUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti i campi opzionali)", () => {
    expect(MatchUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accetta un aggiornamento parziale (solo punteggio)", () => {
    expect(MatchUpdateSchema.safeParse({ ourScore: 70, theirScore: 50 }).success).toBe(true);
  });

  it("accetta ourScore null (reset punteggio)", () => {
    expect(MatchUpdateSchema.safeParse({ ourScore: null }).success).toBe(true);
  });

  it("rifiuta matchType non riconosciuto", () => {
    expect(MatchUpdateSchema.safeParse({ matchType: "UNKNOWN" }).success).toBe(false);
  });

  it("rifiuta notes oltre 2000 caratteri", () => {
    expect(MatchUpdateSchema.safeParse({ notes: "x".repeat(2001) }).success).toBe(false);
  });

  it("accetta groupId null (reset girone)", () => {
    expect(MatchUpdateSchema.safeParse({ groupId: null }).success).toBe(true);
  });
});

// ─── PlayerStatsEntrySchema ───────────────────────────────────────────────────

describe("PlayerStatsEntrySchema — refinement userId XOR childId", () => {
  it("accetta solo userId", () => {
    expect(PlayerStatsEntrySchema.safeParse({ userId: "u1", points: 10 }).success).toBe(true);
  });

  it("accetta solo childId", () => {
    expect(PlayerStatsEntrySchema.safeParse({ childId: "c1", points: 5 }).success).toBe(true);
  });

  it("rifiuta né userId né childId", () => {
    expect(PlayerStatsEntrySchema.safeParse({ points: 10 }).success).toBe(false);
  });

  it("rifiuta entrambi userId e childId", () => {
    expect(PlayerStatsEntrySchema.safeParse({ userId: "u1", childId: "c1" }).success).toBe(false);
  });

  it("rifiuta fouls > 5", () => {
    expect(PlayerStatsEntrySchema.safeParse({ userId: "u1", fouls: 6 }).success).toBe(false);
  });

  it("rifiuta points negativo", () => {
    expect(PlayerStatsEntrySchema.safeParse({ userId: "u1", points: -1 }).success).toBe(false);
  });

  it("rifiuta notes oltre 500 caratteri", () => {
    expect(PlayerStatsEntrySchema.safeParse({ userId: "u1", notes: "x".repeat(501) }).success).toBe(false);
  });
});

// ─── PlayerStatsBatchSchema ───────────────────────────────────────────────────

describe("PlayerStatsBatchSchema", () => {
  it("accetta un array vuoto", () => {
    expect(PlayerStatsBatchSchema.safeParse([]).success).toBe(true);
  });

  it("accetta un batch valido", () => {
    const batch = [
      { userId: "u1", points: 10 },
      { childId: "c1", points: 5 },
    ];
    expect(PlayerStatsBatchSchema.safeParse(batch).success).toBe(true);
  });

  it("rifiuta un batch con più di 50 voci", () => {
    const batch = Array.from({ length: 51 }, (_, i) => ({ userId: `u${i}`, points: 0 }));
    expect(PlayerStatsBatchSchema.safeParse(batch).success).toBe(false);
  });
});

// ─── CallupsSchema ────────────────────────────────────────────────────────────

describe("CallupsSchema", () => {
  it("accetta un payload vuoto (default array vuoti)", () => {
    const result = CallupsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userIds).toEqual([]);
      expect(result.data.childIds).toEqual([]);
    }
  });

  it("accetta userIds e childIds popolati", () => {
    expect(CallupsSchema.safeParse({ userIds: ["u1", "u2"], childIds: ["c1"] }).success).toBe(true);
  });

  it("rifiuta userIds con più di 100 voci", () => {
    const ids = Array.from({ length: 101 }, (_, i) => `u${i}`);
    expect(CallupsSchema.safeParse({ userIds: ids }).success).toBe(false);
  });
});
