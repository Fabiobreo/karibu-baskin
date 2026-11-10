import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assignMatchdays } from "./eisiSheet";
import { decodeEntities, eisiSeasonName, eventsToSheet, type EisiEvent } from "./eisiSite";

// Risposte vere dell'API del sito EISI, girone VENETO Gold A 2026/2027 (10 novembre 2026).
const fixture = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "eisi-site-veneto-gold-a-2026-27.json"), "utf-8")
) as {
  events: EisiEvent[];
  teams: Array<{ id: number; title: { rendered: string } }>;
  venues: Array<{ id: number; name: string }>;
};

describe("decodeEntities", () => {
  it("decodifica le entità di WordPress", () => {
    expect(decodeEntities("VENETO &#8211; Girone Gold A")).toBe("VENETO – Girone Gold A");
    expect(decodeEntities("Karib&#249; &amp; co")).toBe("Karibù & co");
  });
});

describe("eisiSeasonName", () => {
  it("traduce la stagione nel nome del sito", () => {
    expect(eisiSeasonName("2026-27")).toBe("2026/2027");
    expect(eisiSeasonName("boh")).toBeNull();
  });
});

describe("eventsToSheet", () => {
  const sheet = eventsToSheet("Gold A", fixture.events, fixture.teams, fixture.venues);

  it("legge tutte le gare del girone, giocate e in programma", () => {
    expect(sheet.matches).toHaveLength(55);
    expect(sheet.warnings).toEqual([]);
    expect(sheet.matches.filter((m) => m.homeScore !== null)).toHaveLength(4);
  });

  it("prende squadre, data in UTC, campo e punteggio", () => {
    const played = sheet.matches.find((m) => m.number === 6252)!;
    expect(played).toMatchObject({
      home: "Baskin Breganze Space Jam",
      away: "Noventa Baskin",
      homeScore: 77,
      awayScore: 69,
    });
    expect(played.date.toISOString()).toBe("2026-10-25T10:00:00.000Z");

    const ours = sheet.matches.find(
      (m) => m.home === "Karibù Kapuleti" && m.away === "Sangio Wolves Baskin"
    )!;
    expect(ours).toMatchObject({
      homeScore: null,
      awayScore: null,
      venue: "Polisportivo Gino Cosaro, Via del Vigo 11, Montecchio Maggiore (VI)",
    });
  });

  it("le giornate ricalcolate tengono ogni squadra al più una volta", () => {
    const days = assignMatchdays(sheet.matches);
    const seen = new Map<number, Set<string>>();
    sheet.matches.forEach((m, i) => {
      const set = seen.get(days[i]) ?? new Set<string>();
      expect(set.has(m.home) || set.has(m.away)).toBe(false);
      set.add(m.home).add(m.away);
      seen.set(days[i], set);
    });
  });

  it("segnala una gara senza le due squadre", () => {
    const broken = eventsToSheet(
      "x",
      [
        {
          id: 1,
          date_gmt: "2026-10-25T10:00:00",
          status: "future",
          teams: [6257],
          venues: [],
          results: {},
        },
      ],
      fixture.teams,
      []
    );
    expect(broken.matches).toEqual([]);
    expect(broken.warnings[0]).toContain("Gara 1 senza le due squadre");
  });
});
