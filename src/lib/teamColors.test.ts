import { describe, expect, it } from "vitest";
import { TEAM } from "@/lib/palette";
import { suggestTeamTint, teamColor, teamTint, TEAM_TINTS } from "@/lib/teamColors";

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

  // I colori salvati prima di UX-29 (vecchi preset del form e colori del tema).
  it.each([
    ["#FF6D00", "taupe"],
    ["#E65100", "taupe"],
    ["#FFB300", "taupe"],
    ["#1E88E5", "blue"],
    ["#1565C0", "blue"],
    ["#43A047", "petrol"],
    ["#2E7D32", "petrol"],
    ["#00897B", "petrol"],
    ["#F44336", "raspberry"],
    ["#C62828", "raspberry"],
    ["#8E24AA", "violet"],
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
    expect(teamColor("#43A047")).toBe(TEAM.petrol);
    expect(teamColor(null)).toBeNull();
  });
});

describe("suggestTeamTint", () => {
  const prev = [
    { name: "KariGin", color: "violet" },
    { name: "Montekki", color: "#43A047" },
  ];

  it("eredita la tinta della squadra omonima della stagione precedente", () => {
    expect(suggestTeamTint("KariGin", prev, [])).toBe("violet");
    expect(suggestTeamTint(" montekki ", prev, [])).toBe("petrol");
  });

  it("se la tinta ereditata e' gia' presa, propone la prima libera", () => {
    expect(suggestTeamTint("KariGin", prev, ["violet"])).toBe("blue");
  });

  it("senza omonima propone la prima tinta non usata, mai Ardesia", () => {
    expect(suggestTeamTint("Nuova", prev, [])).toBe("blue");
    expect(suggestTeamTint("Nuova", prev, ["blue", "#B05583"])).toBe("taupe");
    expect(suggestTeamTint("Nuova", [], ["slate"])).toBe("blue");
  });

  it("la tinta della Karibu non si eredita", () => {
    expect(suggestTeamTint("Karibu", [{ name: "Karibu", color: "slate" }], [])).toBe("blue");
  });

  it("con tutte le tinte prese ricomincia dalla prima", () => {
    expect(suggestTeamTint("X", [], ["blue", "raspberry", "taupe", "violet", "petrol"])).toBe(
      "blue"
    );
  });
});
