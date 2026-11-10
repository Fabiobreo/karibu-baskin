import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assignMatchdays,
  parseCsv,
  parseEisiSheet,
  parseSheetDate,
  sheetCsvUrl,
} from "./eisiSheet";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf-8");

describe("sheetCsvUrl", () => {
  it("trasforma il link pubhtml nell'export CSV dello stesso foglio", () => {
    expect(
      sheetCsvUrl(
        "https://docs.google.com/spreadsheets/u/0/d/e/2PACX-1vSu-5K1nDYvdbAdcj0Mo34PoCMHSQFeo8tg8nP5FiAJrJSlufY4tpE0gedSo1uoJ9p77hz1fI9b1Mtj/pubhtml?gid=1396820745&single=true&pli=1"
      )
    ).toBe(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSu-5K1nDYvdbAdcj0Mo34PoCMHSQFeo8tg8nP5FiAJrJSlufY4tpE0gedSo1uoJ9p77hz1fI9b1Mtj/pub?gid=1396820745&single=true&output=csv"
    );
  });

  it("rifiuta altri host e link non pubblicati", () => {
    expect(
      sheetCsvUrl("https://evil.example/spreadsheets/d/e/2PACX-aaaaaaaaaaaaaaaaaaaa/pubhtml")
    ).toBeNull();
    expect(
      sheetCsvUrl("http://docs.google.com/spreadsheets/d/e/2PACX-aaaaaaaaaaaaaaaaaaaa/pubhtml")
    ).toBeNull();
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/abc/edit")).toBeNull();
    expect(sheetCsvUrl("non è un link")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("gestisce virgolette, virgole e virgolette doppie dentro una cella", () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,,3')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "", "3"],
    ]);
  });
});

describe("parseSheetDate", () => {
  it("legge data e ora nel fuso di Roma", () => {
    expect(parseSheetDate("19 ott 2025", "15:00", "2025-26")?.date.toISOString()).toBe(
      "2025-10-19T13:00:00.000Z"
    );
    expect(parseSheetDate("15 mar 2026", "10:30", "2025-26")?.date.toISOString()).toBe(
      "2026-03-15T09:30:00.000Z"
    );
  });

  it("corregge un anno fuori stagione", () => {
    const r = parseSheetDate("31 gen 2016", "15:00", "2025-26");
    expect(r?.fixed).toBe(true);
    expect(r?.date.toISOString()).toBe("2026-01-31T14:00:00.000Z");
  });
});

describe("parseEisiSheet", () => {
  it("legge tutte le gare del Gold Ovest 2025/26", () => {
    const sheet = parseEisiSheet(fixture("eisi-gold-ovest-2025-26.csv"), "2025-26");
    expect(sheet.title).toBe("Girone Gold Ovest - Stagione 2025/2026");
    expect(sheet.matches).toHaveLength(55);
    const first = sheet.matches.find((m) => m.number === 3)!;
    expect(first).toMatchObject({
      home: "Karibù Kapuleti",
      away: "Baskin Breganze Space Jam",
      homeScore: 92,
      awayScore: 79,
      venue: "Breganze",
      forfait: false,
    });
    expect(sheet.matches.find((m) => m.number === 28)?.dateFixed).toBe(true);
    expect(sheet.warnings).toHaveLength(1);
    // Girone all'italiana di sola andata: 11 squadre, ognuna contro tutte.
    const teams = new Set(sheet.matches.flatMap((m) => [m.home, m.away]));
    expect(teams.size).toBe(11);
  });

  it("legge tutte le gare del Silver Ovest e toglie gli spazi in coda ai nomi", () => {
    const sheet = parseEisiSheet(fixture("eisi-silver-ovest-2025-26.csv"), "2025-26");
    expect(sheet.matches).toHaveLength(36);
    expect(sheet.matches.find((m) => m.number === 4)?.home).toBe("Millecolori Mozzecane");
    expect(sheet.matches.find((m) => m.number === 1)?.venue).toBe(
      "Campo MM di Via del Vigo, Montecchio Maggiore (VI)"
    );
    expect(sheet.warnings).toEqual([]);
  });
});

describe("parseEisiSheet — campionato in corso", () => {
  it("segnala le gare senza data invece di perderle in silenzio", () => {
    const csv = [
      "Campionato Baskin Senior EISI Veneto",
      "Girone Gold Ovest - Stagione 2026/2027",
      "1,I GIORNATA,,,,,,,,,,",
      "Gara N.,Squadra A,,Squadra B,,Giorno,Data,Ora,,Risultato,,",
      "1,Karibù Kapuleti,4,Sangio Wolves,9,dom,18 ott 2026,15:00,,,-,",
      ",Montecchio,,,,,,,4,,,",
      "2,Bears Baskin Isola,1,MBA Bassano Baskin,8,,da definire,,,,-,",
    ].join("\n");
    const sheet = parseEisiSheet(csv, "2026-27");
    expect(sheet.matches).toHaveLength(1);
    expect(sheet.matches[0]).toMatchObject({
      homeScore: null,
      awayScore: null,
      venue: "Montecchio",
    });
    expect(sheet.warnings).toEqual([
      'Gara 2 (Bears Baskin Isola – MBA Bassano Baskin) senza data ("da definire"): non importata, la prende un import successivo',
    ]);
  });
});

describe("assignMatchdays", () => {
  const d = (s: string) => new Date(s);

  it("apre una giornata nuova quando una squadra tornerebbe a giocare", () => {
    expect(
      assignMatchdays([
        { home: "A", away: "B", date: d("2025-10-05") },
        { home: "C", away: "D", date: d("2025-10-05") },
        { home: "A", away: "C", date: d("2025-10-12") },
        { home: "B", away: "D", date: d("2025-10-12") },
      ])
    ).toEqual([1, 1, 2, 2]);
  });

  it("segue la data, non l'ordine del foglio", () => {
    expect(
      assignMatchdays([
        { home: "A", away: "B", date: d("2025-11-05") },
        { home: "A", away: "C", date: d("2025-10-05") },
      ])
    ).toEqual([2, 1]);
  });

  it("nel girone vero ogni squadra gioca al più una volta per giornata", () => {
    for (const file of ["eisi-gold-ovest-2025-26.csv", "eisi-silver-ovest-2025-26.csv"]) {
      const { matches } = parseEisiSheet(fixture(file), "2025-26");
      const days = assignMatchdays(matches);
      const seen = new Map<number, Set<string>>();
      matches.forEach((m, i) => {
        const set = seen.get(days[i]) ?? new Set<string>();
        expect(set.has(m.home) || set.has(m.away)).toBe(false);
        set.add(m.home).add(m.away);
        seen.set(days[i], set);
      });
      console.log(file, "giornate", Math.max(...days));
    }
  });
});
