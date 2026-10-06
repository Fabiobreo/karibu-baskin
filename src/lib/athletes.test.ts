import { describe, expect, it } from "vitest";
import {
  compareAthletes,
  type AthleteSortColumn,
  type AthleteSortRow,
  ATHLETE_ACCOUNT_WHERE,
  TRAINING_REGISTRABLE_WHERE,
  canBeRegisteredToTraining,
  DEFAULT_ATHLETE_FILTERS,
  countAthleteFilters,
  isAthleteAccount,
  matchesAthleteFilters,
  type AthleteRowLike,
} from "./athletes";

const SEASON = "2026-27";

function row(partial: Partial<AthleteRowLike> = {}): AthleteRowLike {
  return {
    kind: "user",
    name: "Anna Rossi",
    email: "anna@example.com",
    sportRole: 3,
    gender: "FEMALE",
    athleteStatus: null,
    teamMemberships: [],
    ...partial,
  };
}

const match = (r: AthleteRowLike, f = {}) =>
  matchesAthleteFilters(r, { ...DEFAULT_ATHLETE_FILTERS, ...f }, SEASON);

describe("chi e' un atleta", () => {
  it("conta chi ha ruolo Atleta, anche senza ruolo Baskin", () => {
    expect(isAthleteAccount({ appRole: "ATHLETE", sportRole: null })).toBe(true);
  });

  it("conta genitori, allenatori e admin solo se hanno un ruolo Baskin", () => {
    for (const appRole of ["PARENT", "COACH", "ADMIN"] as const) {
      expect(isAthleteAccount({ appRole, sportRole: 4 })).toBe(true);
      expect(isAthleteAccount({ appRole, sportRole: null })).toBe(false);
    }
  });

  it("lascia fuori gli ospiti, anche con un ruolo", () => {
    expect(isAthleteAccount({ appRole: "GUEST", sportRole: null })).toBe(false);
    expect(isAthleteAccount({ appRole: "GUEST", sportRole: 2 })).toBe(false);
  });

  it("ha un filtro Prisma con la stessa regola", () => {
    expect(ATHLETE_ACCOUNT_WHERE).toEqual({
      appRole: { not: "GUEST" },
      OR: [{ appRole: "ATHLETE" }, { sportRole: { not: null } }],
    });
  });
});

describe("iscrizione manuale agli allenamenti", () => {
  it("lascia fuori il genitore che non gioca", () => {
    expect(canBeRegisteredToTraining({ appRole: "PARENT", sportRole: null })).toBe(false);
  });

  it("tiene il genitore che gioca, gli atleti, gli ospiti e lo staff", () => {
    expect(canBeRegisteredToTraining({ appRole: "PARENT", sportRole: 4 })).toBe(true);
    for (const appRole of ["ATHLETE", "GUEST", "COACH", "ADMIN"] as const) {
      expect(canBeRegisteredToTraining({ appRole, sportRole: null })).toBe(true);
    }
  });

  it("ha un filtro Prisma con la stessa regola", () => {
    expect(TRAINING_REGISTRABLE_WHERE).toEqual({ NOT: { appRole: "PARENT", sportRole: null } });
  });
});

describe("filtri della tab Atleti", () => {
  it("di default mostra solo gli attivi", () => {
    expect(match(row())).toBe(true);
    expect(match(row({ athleteStatus: "INACTIVE_SEASON" }))).toBe(false);
    expect(match(row({ athleteStatus: "FORMER" }))).toBe(false);
  });

  it("gli altri stati si vedono solo scegliendoli", () => {
    const former = row({ athleteStatus: "FORMER" });
    expect(match(former, { status: "FORMER" })).toBe(true);
    expect(match(former, { status: "INACTIVE_SEASON" })).toBe(false);
    expect(match(former, { status: "all" })).toBe(true);
    expect(match(row(), { status: "FORMER" })).toBe(false);
  });

  it("mette insieme utenti e figli senza account, e li separa a richiesta", () => {
    const child = row({ kind: "child", email: undefined });
    expect(match(child)).toBe(true);
    expect(match(child, { account: "with" })).toBe(false);
    expect(match(child, { account: "without" })).toBe(true);
    expect(match(row(), { account: "without" })).toBe(false);
  });

  it("filtra per ruolo Baskin, compreso 'non impostato'", () => {
    expect(match(row({ sportRole: 3 }), { sportRoles: ["3", "5"] })).toBe(true);
    expect(match(row({ sportRole: 2 }), { sportRoles: ["3", "5"] })).toBe(false);
    expect(match(row({ sportRole: null }), { sportRoles: ["none"] })).toBe(true);
    expect(match(row({ sportRole: 1 }), { sportRoles: ["none"] })).toBe(false);
  });

  it("filtra per genere", () => {
    expect(match(row({ gender: "MALE" }), { gender: "FEMALE" })).toBe(false);
    expect(match(row({ gender: null }), { gender: "none" })).toBe(true);
    expect(match(row({ gender: "MALE" }), { gender: "none" })).toBe(false);
  });

  it("filtra per squadra della stagione in corso, e per 'senza squadra'", () => {
    const inTeam = row({ teamMemberships: [{ teamId: "t1", team: { season: SEASON } }] });
    const lastYear = row({ teamMemberships: [{ teamId: "t1", team: { season: "2025-26" } }] });
    expect(match(inTeam, { teamId: "t1" })).toBe(true);
    expect(match(inTeam, { teamId: "t2" })).toBe(false);
    expect(match(lastYear, { teamId: "t1" })).toBe(false);
    expect(match(lastYear, { teamId: "none" })).toBe(true);
    expect(match(inTeam, { teamId: "none" })).toBe(false);
  });

  it("cerca per nome, email e genitore", () => {
    expect(match(row(), { search: "ross" })).toBe(true);
    expect(match(row(), { search: "ANNA@" })).toBe(true);
    const child = row({
      kind: "child",
      name: "Tommaso",
      email: undefined,
      guardians: [{ name: "Paola Provini", email: "paola@example.com" }],
    });
    expect(match(child, { search: "provini" })).toBe(true);
    expect(match(child, { search: "bianchi" })).toBe(false);
  });

  it("non conta 'attivi' fra i filtri accesi", () => {
    expect(countAthleteFilters(DEFAULT_ATHLETE_FILTERS)).toBe(0);
    expect(
      countAthleteFilters({ ...DEFAULT_ATHLETE_FILTERS, status: "all", sportRoles: ["1"] })
    ).toBe(2);
  });
});

describe("ordinamento della tab Atleti", () => {
  const sortRow = (
    name: string,
    partial: Partial<AthleteSortRow> & { team?: string; oldTeam?: string } = {}
  ): AthleteSortRow => ({
    name,
    sportRole: 3,
    gender: null,
    teamMemberships: [
      ...(partial.team ? [{ team: { season: SEASON, name: partial.team } }] : []),
      ...(partial.oldTeam ? [{ team: { season: "2000-01", name: partial.oldTeam } }] : []),
    ],
    _count: { registrations: 0 },
    ...partial,
  });
  const order = (rows: AthleteSortRow[], col: AthleteSortColumn, dir: "asc" | "desc") =>
    [...rows].sort((a, b) => compareAthletes(a, b, col, dir, SEASON)).map((r) => r.name);

  const rows = [
    sortRow("Zeno", { team: "KariGin", gender: "MALE" }),
    sortRow("Bea", { team: "KariTonic", gender: "FEMALE" }),
    sortRow("Aldo", { team: "KariTonic", gender: "MALE" }),
    sortRow("Carla", { gender: "FEMALE", oldTeam: "Aaa" }),
    sortRow("Dino", { team: "KariGin" }),
  ];

  it("per squadra: quella della stagione in corso, poi il nome; chi non ne ha in fondo", () => {
    expect(order(rows, "team", "asc")).toEqual(["Dino", "Zeno", "Aldo", "Bea", "Carla"]);
  });

  it("per squadra al contrario: cambia l'ordine delle squadre, non chi sta in fondo", () => {
    expect(order(rows, "team", "desc")).toEqual(["Aldo", "Bea", "Dino", "Zeno", "Carla"]);
  });

  it("per genere: femmine, maschi, poi chi non l'ha indicato; al contrario i maschi prima", () => {
    expect(order(rows, "gender", "asc")).toEqual(["Bea", "Carla", "Aldo", "Zeno", "Dino"]);
    expect(order(rows, "gender", "desc")).toEqual(["Aldo", "Zeno", "Bea", "Carla", "Dino"]);
  });

  it("per nome nei due versi, e le colonne di prima restano uguali", () => {
    expect(order(rows, "name", "desc")[0]).toBe("Zeno");
    const byRole = [sortRow("B", { sportRole: null }), sortRow("A", { sportRole: 5 })];
    expect(order(byRole, "sportRole", "asc")).toEqual(["A", "B"]);
    expect(order(byRole, "sportRole", "desc")).toEqual(["B", "A"]);
    const byRegs = [
      sortRow("B", { _count: { registrations: 1 } }),
      sortRow("A", { _count: { registrations: 9 } }),
    ];
    expect(order(byRegs, "registrations", "desc")).toEqual(["A", "B"]);
  });
});
