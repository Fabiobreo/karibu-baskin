import { describe, expect, it } from "vitest";
import type { SheetMatch } from "./eisiSheet";
import {
  normalizeTeamName,
  planSheetImport,
  suggestTarget,
  summarizePlan,
  type ExistingGroupMatch,
  type ExistingOurMatch,
  type NameTarget,
} from "./sheetImport";

const match = (
  over: Partial<SheetMatch> & Pick<SheetMatch, "number" | "home" | "away">
): SheetMatch => ({
  date: new Date("2025-10-19T13:00:00Z"),
  dateFixed: false,
  venue: "Polisportivo Gino Cosaro, Montecchio",
  homeScore: 92,
  awayScore: 79,
  forfait: false,
  ...over,
});

const names: Record<string, NameTarget> = {
  "Karibù Kapuleti": { kind: "ours", teamId: "kap" },
  "Baskin Breganze Space Jam": { kind: "opponent", opposingTeamId: "bre" },
  "Bears Baskin Isola": { kind: "opponent", opposingTeamId: "bears" },
  "Nuova Squadra": { kind: "new" },
};

const ours = (over: Partial<ExistingOurMatch> = {}): ExistingOurMatch => ({
  id: "m1",
  teamId: "kap",
  opponentId: "bre",
  date: new Date("2025-10-19T13:00:00Z"),
  isHome: true,
  ourScore: null,
  theirScore: null,
  matchday: 1,
  venue: "Polisportivo Gino Cosaro, Montecchio",
  groupId: "g1",
  ...over,
});

function plan(
  matches: SheetMatch[],
  existingOurs: ExistingOurMatch[] = [],
  existingOthers: ExistingGroupMatch[] = [],
  useSheetScore: number[] = []
) {
  return planSheetImport({
    matches,
    names,
    groupId: "g1",
    existingOurs,
    existingOthers,
    useSheetScore: new Set(useSheetScore),
  });
}

describe("suggestTarget", () => {
  const ourTeams = [{ id: "kap", name: "Kapuleti" }];
  const opponents = [
    { id: "sw", name: "Sangio Wolves" },
    { id: "bre", name: "Baskin Breganze Space Jam" },
  ];

  it("riconosce la nostra squadra nel nome del foglio", () => {
    expect(suggestTarget("Karibù Kapuleti", ourTeams, opponents)).toEqual({
      kind: "ours",
      teamId: "kap",
    });
  });

  it("con una sola nostra squadra nel girone, 'Karibù' basta", () => {
    expect(suggestTarget("Karibù Baskin", [{ id: "mon", name: "Montekki" }], opponents)).toEqual({
      kind: "ours",
      teamId: "mon",
    });
  });

  it("abbina le avversarie a meno di accenti e parole in più", () => {
    expect(suggestTarget("baskin breganze SPACE jam", ourTeams, opponents)).toEqual({
      kind: "opponent",
      opposingTeamId: "bre",
    });
    expect(suggestTarget("Sangio Wolves Baskin", ourTeams, opponents)).toEqual({
      kind: "opponent",
      opposingTeamId: "sw",
    });
    expect(suggestTarget("CUS Verona Baskin", ourTeams, opponents)).toEqual({ kind: "new" });
  });

  it("normalizza accenti e punteggiatura", () => {
    expect(normalizeTeamName("  Karibù  Baskin! ")).toBe("karibu baskin");
  });
});

describe("planSheetImport", () => {
  it("crea la nostra partita e quella fra avversarie", () => {
    const rows = plan([
      match({ number: 3, home: "Karibù Kapuleti", away: "Baskin Breganze Space Jam" }),
      match({ number: 4, home: "Baskin Breganze Space Jam", away: "Bears Baskin Isola" }),
    ]);
    expect(rows[0]).toMatchObject({
      kind: "ours",
      action: "create",
      ourTeamId: "kap",
      opponentRef: "bre",
      isHome: true,
    });
    expect(rows[1]).toMatchObject({
      kind: "other",
      action: "create",
      homeRef: "bre",
      awayRef: "bears",
    });
    // Breganze gioca due volte: due giornate.
    expect(rows.map((r) => r.matchday)).toEqual([1, 2]);
  });

  it("casa o trasferta lo dice il campo, non l'ordine delle squadre", () => {
    // Sul sito EISI siamo scritti per primi, ma si gioca a Meduna di Livenza.
    const [away] = plan([
      match({
        number: 6400,
        home: "Karibù Kapuleti",
        away: "Baskin Breganze Space Jam",
        venue: "Via Ca Michiel 24, Meduna di Livenza (TV)",
        homeScore: 70,
        awayScore: 65,
      }),
    ]);
    expect(away).toMatchObject({ isHome: false, ourScore: 70, theirScore: 65 });
    // Scritti per secondi, ma il campo è il nostro.
    const [home] = plan([
      match({
        number: 6401,
        home: "Baskin Breganze Space Jam",
        away: "Karibù Kapuleti",
        venue: "Polisportivo Gino Cosaro, Via del Vigo 11, Montecchio Maggiore (VI)",
        homeScore: 60,
        awayScore: 75,
      }),
    ]);
    expect(home).toMatchObject({ isHome: true, ourScore: 75, theirScore: 60 });
    // Senza campo resta l'ordine.
    const [unknown] = plan([
      match({
        number: 6402,
        home: "Karibù Kapuleti",
        away: "Baskin Breganze Space Jam",
        venue: null,
      }),
    ]);
    expect(unknown.isHome).toBe(true);
  });

  it("in trasferta gira il punteggio dalla nostra parte", () => {
    const [row] = plan([
      match({
        number: 16,
        home: "Baskin Breganze Space Jam",
        away: "Karibù Kapuleti",
        venue: "Breganze",
        homeScore: 83,
        awayScore: 61,
      }),
    ]);
    expect(row).toMatchObject({ isHome: false, opponentRef: "bre", ourScore: 61, theirScore: 83 });
  });

  it("completa una partita già inserita senza punteggio", () => {
    const [row] = plan(
      [match({ number: 3, home: "Karibù Kapuleti", away: "Baskin Breganze Space Jam" })],
      [ours()]
    );
    expect(row).toMatchObject({ action: "update", existingId: "m1", changes: ["punteggio 92–79"] });
  });

  it("una partita già uguale non si tocca", () => {
    const [row] = plan(
      [match({ number: 3, home: "Karibù Kapuleti", away: "Baskin Breganze Space Jam" })],
      [ours({ ourScore: 92, theirScore: 79 })]
    );
    expect(row.action).toBe("same");
  });

  it("un punteggio diverso è un conflitto, finché lo staff non sceglie il foglio", () => {
    const m = match({ number: 3, home: "Karibù Kapuleti", away: "Baskin Breganze Space Jam" });
    const existing = [ours({ ourScore: 90, theirScore: 79, matchday: 4 })];
    const [kept] = plan([m], existing);
    expect(kept).toMatchObject({
      action: "conflict",
      existingScore: "90–79",
      changes: ["giornata 1"],
    });
    const [taken] = plan([m], existing, [], [3]);
    expect(taken).toMatchObject({
      action: "update",
      changes: ["punteggio 90–79 → 92–79", "giornata 1"],
    });
  });

  it("aggancia al girone una partita inserita da Partite senza girone", () => {
    const [row] = plan(
      [match({ number: 3, home: "Karibù Kapuleti", away: "Baskin Breganze Space Jam" })],
      [ours({ ourScore: 92, theirScore: 79, groupId: null })]
    );
    expect(row).toMatchObject({ action: "update", changes: ["aggiunta al girone"] });
  });

  it("non confonde andata e ritorno: ognuna trova la sua", () => {
    const rows = plan(
      [
        match({ number: 3, home: "Karibù Kapuleti", away: "Baskin Breganze Space Jam" }),
        match({
          number: 40,
          home: "Baskin Breganze Space Jam",
          away: "Karibù Kapuleti",
          date: new Date("2026-03-01T13:00:00Z"),
          homeScore: 50,
          awayScore: 60,
        }),
      ],
      [
        ours({ id: "andata", ourScore: 92, theirScore: 79 }),
        ours({ id: "ritorno", date: new Date("2026-03-02T13:00:00Z"), isHome: false }),
      ]
    );
    expect(rows.map((r) => r.existingId)).toEqual(["andata", "ritorno"]);
  });

  it("fra avversarie riconosce la partita anche con casa e ospiti invertiti", () => {
    const [row] = plan(
      [
        match({
          number: 4,
          home: "Baskin Breganze Space Jam",
          away: "Bears Baskin Isola",
          homeScore: 58,
          awayScore: 88,
        }),
      ],
      [],
      [
        {
          id: "gm1",
          homeTeamId: "bears",
          awayTeamId: "bre",
          date: new Date("2025-10-19T13:00:00Z"),
          homeScore: 88,
          awayScore: 58,
          matchday: 1,
        },
      ]
    );
    expect(row).toMatchObject({ action: "update", existingId: "gm1", changes: ["casa e ospiti"] });
  });

  it("le squadre nuove non cercano partite esistenti", () => {
    const [row] = plan([match({ number: 9, home: "Nuova Squadra", away: "Bears Baskin Isola" })]);
    expect(row).toMatchObject({ action: "create", homeRef: "new:Nuova Squadra" });
  });

  it("salta le gare fra due nostre squadre e quelle escluse", () => {
    const rows = planSheetImport({
      matches: [
        match({ number: 1, home: "Karibù Kapuleti", away: "Karibù Montekki" }),
        match({ number: 2, home: "Esclusa", away: "Bears Baskin Isola" }),
      ],
      names: {
        ...names,
        "Karibù Montekki": { kind: "ours", teamId: "mon" },
        Esclusa: { kind: "skip" },
      },
      groupId: "g1",
      existingOurs: [],
      existingOthers: [],
      useSheetScore: new Set(),
    });
    expect(rows.map((r) => r.action)).toEqual(["skip", "skip"]);
    expect(summarizePlan(rows)).toEqual({ create: 0, update: 0, same: 0, conflict: 0, skip: 2 });
  });

  it("ritrova una gara rinviata di mesi se le squadre si incontrano una volta sola", () => {
    const [row] = plan(
      [
        match({
          number: 3,
          home: "Karibù Kapuleti",
          away: "Baskin Breganze Space Jam",
          date: new Date("2026-04-19T13:00:00Z"),
        }),
      ],
      [ours({ date: new Date("2025-10-19T13:00:00Z") })]
    );
    expect(row).toMatchObject({ action: "update", existingId: "m1" });
    expect(row.changes).toContain("data e ora");
  });

  it("con la scelta dello staff tiene le giornate già salvate", () => {
    const m = match({ number: 3, home: "Karibù Kapuleti", away: "Baskin Breganze Space Jam" });
    const existing = [ours({ ourScore: 92, theirScore: 79, matchday: 4 })];
    const keep = planSheetImport({
      matches: [m],
      names,
      groupId: "g1",
      existingOurs: existing,
      existingOthers: [],
      useSheetScore: new Set(),
      keepMatchdays: true,
    });
    expect(keep[0]).toMatchObject({ action: "same", matchday: 4 });
    expect(plan([m], existing)[0]).toMatchObject({ action: "update", matchday: 1 });
  });
});
