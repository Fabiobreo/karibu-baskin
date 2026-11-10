import { TZDate } from "@date-fns/tz";

/**
 * Lettura dei fogli Google pubblicati dall'EISI Veneto con il calendario e i
 * risultati di un girone ("Campionato Baskin Senior EISI Veneto").
 *
 * Il foglio è pensato per essere stampato, non letto da una macchina: ogni
 * partita occupa due righe (la gara, poi il campo di gioco) ripetute sotto
 * l'intestazione "Gara N.", e le "giornate" del foglio sono blocchi di dieci
 * gare, non turni del girone. Qui si tiene solo quello che serve: numero di
 * gara, squadre, data e ora, campo, punteggio e forfait. Le giornate le
 * ricalcola `assignMatchdays`.
 */

export interface SheetMatch {
  /** "Gara N." del foglio: l'unico identificativo stabile di una partita. */
  number: number;
  home: string;
  away: string;
  /** Data e ora della partita, lette nel fuso di Roma. */
  date: Date;
  /** La data del foglio era fuori dalla stagione ed è stata corretta. */
  dateFixed: boolean;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  /** Una delle due squadre ha perso a tavolino. */
  forfait: boolean;
}

export interface ParsedSheet {
  /** Seconda riga di intestazione, es. "Girone Gold Ovest - Stagione 2025/2026". */
  title: string | null;
  matches: SheetMatch[];
  warnings: string[];
}

const SHEET_PATH = /\/spreadsheets(?:\/u\/\d+)?\/d\/e\/([A-Za-z0-9_-]{20,})\//;

/**
 * Dal link "pubblica sul web" (pubhtml) all'indirizzo CSV dello stesso
 * foglio. Accetta solo docs.google.com e ricostruisce l'URL da zero, così il
 * server non va mai a leggere un indirizzo scelto da chi incolla il link.
 */
export function sheetCsvUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
  const id = url.pathname.match(SHEET_PATH)?.[1];
  if (!id) return null;
  const gid = url.searchParams.get("gid");
  const params = new URLSearchParams();
  if (gid && /^\d+$/.test(gid)) {
    params.set("gid", gid);
    params.set("single", "true");
  }
  params.set("output", "csv");
  return `https://docs.google.com/spreadsheets/d/e/${id}/pub?${params.toString()}`;
}

/** CSV con virgolette doppie (RFC 4180), come lo esporta Google. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const MONTHS: Record<string, number> = {
  gen: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mag: 4,
  giu: 5,
  lug: 6,
  ago: 7,
  set: 8,
  ott: 9,
  nov: 10,
  dic: 11,
};

const DATE_RE = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})$/i;
const TIME_RE = /^(\d{1,2})[:.](\d{2})$/;

/** Anno di inizio di una stagione "2025-26". */
function seasonStartYear(season: string): number | null {
  const m = season.match(/^(\d{4})-\d{2}$/);
  return m ? Number(m[1]) : null;
}

/**
 * "19 ott 2025" + "15:00" → istante, letto a Roma. Se l'anno porta la data
 * fuori dalla stagione (nel foglio Gold c'è "31 gen 2016") si tiene giorno e
 * mese e si prende l'anno della stagione: settembre-dicembre il primo,
 * gennaio-agosto il secondo.
 */
export function parseSheetDate(
  day: string,
  time: string,
  season: string
): { date: Date; fixed: boolean } | null {
  const d = day.trim().match(DATE_RE);
  if (!d) return null;
  const month = MONTHS[d[2].toLowerCase()];
  if (month === undefined) return null;
  let year = Number(d[3]);
  let fixed = false;
  const start = seasonStartYear(season);
  if (start !== null) {
    const expected = month >= 8 ? start : start + 1;
    if (year !== expected) {
      year = expected;
      fixed = true;
    }
  }
  const t = time.trim().match(TIME_RE);
  // Senza ora si mette mezzogiorno: la data resta la stessa in ogni fuso.
  const hours = t ? Number(t[1]) : 12;
  const minutes = t ? Number(t[2]) : 0;
  const date = new Date(new TZDate(year, month, Number(d[1]), hours, minutes, "Europe/Rome"));
  return { date, fixed };
}

function score(value: string | undefined): number | null {
  const v = (value ?? "").trim();
  return /^\d{1,3}$/.test(v) ? Number(v) : null;
}

/** Spazi doppi e in coda: nel foglio "Millecolori Mozzecane " ha uno spazio in più. */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

// Colonne della riga di una gara.
const COL = {
  number: 0,
  home: 1,
  away: 3,
  date: 6,
  time: 7,
  homeScore: 9,
  awayScore: 11,
  forfaitHome: 14,
  forfaitAway: 21,
} as const;

export function parseEisiSheet(csv: string, season: string): ParsedSheet {
  const rows = parseCsv(csv);
  const warnings: string[] = [];
  const matches: SheetMatch[] = [];
  const title =
    rows
      .slice(0, 6)
      .find((r) => /girone/i.test(r[0] ?? ""))?.[0]
      ?.trim() ?? null;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const numberCell = (r[COL.number] ?? "").trim();
    const home = cleanName(r[COL.home] ?? "");
    const away = cleanName(r[COL.away] ?? "");
    if (!/^\d+$/.test(numberCell) || !home || !away) continue;
    // Le righe "1, I GIORNATA" hanno il numero ma non la data.
    const dayCell = r[COL.date] ?? "";
    if (!DATE_RE.test(dayCell.trim())) continue;

    const number = Number(numberCell);
    const parsedDate = parseSheetDate(dayCell, r[COL.time] ?? "", season);
    if (!parsedDate) {
      warnings.push(`Gara ${number}: data "${dayCell}" non leggibile, saltata`);
      continue;
    }
    if (parsedDate.fixed) {
      warnings.push(
        `Gara ${number}: la data "${dayCell.trim()}" è fuori stagione, letta come ${parsedDate.date.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}`
      );
    }

    const next = rows[i + 1];
    const venue =
      next && !(next[COL.number] ?? "").trim() ? cleanName(next[COL.home] ?? "") || null : null;

    let homeScore = score(r[COL.homeScore]);
    let awayScore = score(r[COL.awayScore]);
    // Un punteggio a metà non è un risultato.
    if (homeScore === null || awayScore === null) {
      homeScore = null;
      awayScore = null;
    }

    if (matches.some((m) => m.number === number)) {
      warnings.push(`Gara ${number} compare due volte: tenuta la prima`);
      continue;
    }

    matches.push({
      number,
      home,
      away,
      date: parsedDate.date,
      dateFixed: parsedDate.fixed,
      venue,
      homeScore,
      awayScore,
      forfait:
        (r[COL.forfaitHome] ?? "").trim() === "1" || (r[COL.forfaitAway] ?? "").trim() === "1",
    });
  }

  if (matches.length === 0) {
    warnings.push("Nel foglio non c'è nessuna gara riconoscibile");
  }
  return { title, matches, warnings };
}

/**
 * Giornate "come le facciamo noi": un turno in cui ogni squadra gioca al più
 * una volta. Si scorrono le partite in ordine di data e si apre una giornata
 * nuova appena una squadra ricomparirebbe nella stessa. Restituisce il numero
 * di giornata (da 1) nello stesso ordine delle partite ricevute.
 */
export function assignMatchdays(
  matches: ReadonlyArray<{ home: string; away: string; date: Date; number?: number }>
): number[] {
  const order = matches
    .map((m, i) => ({ m, i }))
    .sort(
      (a, b) => a.m.date.getTime() - b.m.date.getTime() || (a.m.number ?? a.i) - (b.m.number ?? b.i)
    );
  const result = new Array<number>(matches.length);
  let day = 1;
  let teams = new Set<string>();
  for (const { m, i } of order) {
    if (teams.has(m.home) || teams.has(m.away)) {
      day++;
      teams = new Set();
    }
    teams.add(m.home);
    teams.add(m.away);
    result[i] = day;
  }
  return result;
}
