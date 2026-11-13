import { describe, expect, it } from "vitest";
import {
  GAME_RULES,
  canPlay,
  gameAccess,
  gamesAreIndexable,
  isAllowedVisibility,
  resolveGameSettings,
  showsGamesInMenu,
} from "./gameSettings";

describe("GAME_RULES", () => {
  it("solo il quiz può essere per tutti", () => {
    expect(isAllowedVisibility("quiz", "PUBLIC")).toBe(true);
    expect(isAllowedVisibility("prediction", "PUBLIC")).toBe(false);
    expect(isAllowedVisibility("simulator", "PUBLIC")).toBe(false);
  });

  it("ogni default è fra gli stati ammessi", () => {
    for (const rule of Object.values(GAME_RULES)) {
      expect(rule.allowed).toContain(rule.fallback);
    }
  });

  it("rifiuta valori che non sono stati", () => {
    expect(isAllowedVisibility("quiz", "ON")).toBe(false);
    expect(isAllowedVisibility("quiz", null)).toBe(false);
  });
});

describe("resolveGameSettings", () => {
  it("senza righe: quiz spento, pronostico e simulatore per i tesserati", () => {
    expect(resolveGameSettings([])).toEqual({
      quiz: "OFF",
      prediction: "MEMBERS",
      simulator: "MEMBERS",
    });
  });

  it("legge le righe salvate", () => {
    expect(
      resolveGameSettings([
        { game: "quiz", visibility: "PUBLIC" },
        { game: "prediction", visibility: "OFF" },
      ])
    ).toEqual({ quiz: "PUBLIC", prediction: "OFF", simulator: "MEMBERS" });
  });

  it("uno stato non ammesso torna al default, mai pubblico", () => {
    expect(resolveGameSettings([{ game: "simulator", visibility: "PUBLIC" }]).simulator).toBe(
      "MEMBERS"
    );
  });

  it("ignora i giochi che non esistono", () => {
    expect(resolveGameSettings([{ game: "tombola", visibility: "PUBLIC" }])).toEqual(
      resolveGameSettings([])
    );
  });
});

describe("gameAccess", () => {
  it("spento: lo staff lo prova in anteprima, gli altri non lo vedono", () => {
    expect(gameAccess("OFF", "ADMIN")).toBe("preview");
    expect(gameAccess("OFF", "COACH")).toBe("preview");
    for (const role of ["DIRECTOR", "ATHLETE", "PARENT", "GUEST", null]) {
      expect(gameAccess("OFF", role)).toBe("hidden");
    }
  });

  it("solo tesserati: anonimi e ospiti restano fuori", () => {
    expect(gameAccess("MEMBERS", "ATHLETE")).toBe("play");
    expect(gameAccess("MEMBERS", "DIRECTOR")).toBe("play");
    expect(gameAccess("MEMBERS", "GUEST")).toBe("members");
    expect(gameAccess("MEMBERS", undefined)).toBe("members");
  });

  it("per tutti: gioca chiunque", () => {
    expect(gameAccess("PUBLIC", null)).toBe("play");
    expect(gameAccess("PUBLIC", "GUEST")).toBe("play");
  });

  it("canPlay vale anche per l'anteprima", () => {
    expect(canPlay("preview")).toBe(true);
    expect(canPlay("members")).toBe(false);
    expect(canPlay("hidden")).toBe(false);
  });
});

describe("showsGamesInMenu", () => {
  const off = { quiz: "OFF", prediction: "OFF", simulator: "OFF" } as const;

  it("tutto spento: nessuna voce, nemmeno per lo staff", () => {
    expect(showsGamesInMenu(off, "ADMIN")).toBe(false);
  });

  it("con il solo pronostico acceso la voce è dei tesserati", () => {
    const s = { ...off, prediction: "MEMBERS" } as const;
    expect(showsGamesInMenu(s, "ATHLETE")).toBe(true);
    expect(showsGamesInMenu(s, "GUEST")).toBe(false);
    expect(showsGamesInMenu(s, null)).toBe(false);
  });

  it("con il quiz per tutti la voce è di tutti", () => {
    expect(showsGamesInMenu({ ...off, quiz: "PUBLIC" }, null)).toBe(true);
  });
});

describe("gamesAreIndexable", () => {
  it("solo con il quiz per tutti", () => {
    expect(gamesAreIndexable({ quiz: "PUBLIC", prediction: "OFF", simulator: "OFF" })).toBe(true);
    expect(
      gamesAreIndexable({ quiz: "MEMBERS", prediction: "MEMBERS", simulator: "MEMBERS" })
    ).toBe(false);
  });
});
