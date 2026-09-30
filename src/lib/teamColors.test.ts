import { describe, expect, it } from "vitest";
import { TEAM } from "@/lib/palette";
import { suggestTeamTint, teamColor, teamFill, teamTint, TEAM_TINTS } from "@/lib/teamColors";

describe("teamTint", () => {
  it("nessun colore o valore illeggibile: nessuna tinta", () => {
    expect(teamTint(null)).toBeNull();
    expect(teamTint(undefined)).toBeNull();
    expect(teamTint("")).toBeNull();
    expect(teamTint("rosso")).toBeNull();
    expect(teamTint("primary.main")).toBeNull();
  });

  it("chiavi e hex della palette tornano se stessi (idempotente)", () => {
    for (const t of TEAM_TINTS) {
      expect(teamTint(t)).toBe(t);
      expect(teamTint(TEAM[t])).toBe(t);
      expect(teamTint(TEAM[t].toLowerCase())).toBe(t);
      expect(teamTint(teamColor(t))).toBe(t);
    }
  });

  // I colori salvati prima di UX-29 (vecchi preset del form e colori del tema):
  // ognuno torna nella sua famiglia di maglia.
  it.each([
    ["#FF6D00", "orange"],
    ["#E65100", "orange"],
    ["#FF9800", "orange"],
    ["#FFB300", "gold"],
    ["#FFC107", "gold"],
    ["#FFEB3B", "gold"],
    ["#43A047", "green"],
    ["#2E7D32", "green"],
    ["#00897B", "green"],
    ["#4CAF50", "green"],
    ["#1E88E5", "blue"],
    ["#1565C0", "blue"],
    ["#03A9F4", "blue"],
    ["#8E24AA", "violet"],
    ["#9C27B0", "violet"],
    ["#F44336", "raspberry"],
    ["#C62828", "raspberry"],
    ["#E91E63", "raspberry"],
    ["#1A1A1A", "slate"],
    ["#757575", "slate"],
    ["#FFFFFF", "slate"],
    ["#000000", "slate"],
    ["#fff", "slate"],
  ])("il colore storico %s diventa %s", (hex, tint) => {
    expect(teamTint(hex)).toBe(tint);
  });

  it("i vecchi preset che convivevano restano distinti", () => {
    expect(teamTint("#FF6D00")).not.toBe(teamTint("#43A047"));
    expect(teamTint("#F44336")).not.toBe(teamTint("#1E88E5"));
  });
});

describe("teamColor", () => {
  it("restituisce l'hex della tinta o null", () => {
    expect(teamColor("blue")).toBe(TEAM.blue);
    expect(teamColor("#43A047")).toBe(TEAM.green);
    expect(teamColor(null)).toBeNull();
  });
});

describe("teamFill", () => {
  it("da' fondo, etichetta e anello (solo per l'Oro)", () => {
    expect(teamFill("violet")).toMatchObject({ bg: TEAM.violet, ring: null });
    expect(teamFill("gold")?.ring).not.toBeNull();
    expect(teamFill(null)).toBeNull();
  });
});

describe("suggestTeamTint", () => {
  const prev = [
    { name: "KariGin", color: "violet" },
    { name: "Montekki", color: "#43A047" },
  ];

  it("eredita la tinta della squadra omonima della stagione precedente", () => {
    expect(suggestTeamTint("KariGin", prev, [])).toBe("violet");
    expect(suggestTeamTint(" montekki ", prev, [])).toBe("green");
  });

  it("se la tinta ereditata e' gia' presa, propone la prima libera", () => {
    expect(suggestTeamTint("KariGin", prev, ["violet"])).toBe("green");
  });

  it("senza omonima propone la prima tinta non usata, mai Ardesia", () => {
    expect(suggestTeamTint("Nuova", prev, [])).toBe("violet");
    expect(suggestTeamTint("Nuova", prev, ["violet", "#43A047"])).toBe("blue");
    expect(suggestTeamTint("Nuova", [], ["slate"])).toBe("violet");
  });

  it("la tinta della Karibu non si eredita", () => {
    expect(suggestTeamTint("Karibu", [{ name: "Karibu", color: "slate" }], [])).toBe("violet");
  });

  it("con tutte le tinte prese ricomincia dalla prima", () => {
    expect(
      suggestTeamTint("X", [], ["violet", "green", "blue", "orange", "gold", "raspberry"])
    ).toBe("violet");
  });
});
