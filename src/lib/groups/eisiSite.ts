import { cleanName, type ParsedSheet, type SheetMatch } from "./eisiSheet";

/**
 * Calendario e risultati dal sito EISI (eisi.it/campionati), dalla stagione
 * 2026/2027. Il sito è WordPress con il plugin SportsPress, che pubblica
 * un'API REST aperta: gironi (`leagues`), stagioni, gare (`events`) con
 * squadre, data, campo e punteggio. Qui si traducono le gare nello stesso
 * formato dei fogli Google degli anni prima, così il piano di import è uno.
 *
 * Il campo "giornata" (`day`) del sito non si usa: è compilato a mano e non
 * è coerente (nel Gold A 2026/27 Kapuleti ha due gare nella stessa giornata).
 * Le giornate le ricalcola `assignMatchdays`, come per i fogli.
 */

export const EISI_API = "https://eisi.it/wp-json/sportspress/v2";

export interface EisiLeague {
  id: number;
  name: string;
}

export interface EisiEvent {
  id: number;
  date_gmt: string;
  status: string;
  teams: number[];
  venues: number[];
  results: Record<string, { points?: string; outcome?: string[] } | Record<string, string>>;
}

interface Named {
  id: number;
  name?: string;
  title?: { rendered: string };
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

/** I nomi arrivano con le entità HTML di WordPress ("Gold A &#8211; 2026/2027"). */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : all;
    }
    return ENTITIES[code.toLowerCase()] ?? all;
  });
}

const nameOf = (x: Named) => cleanName(decodeEntities(x.name ?? x.title?.rendered ?? ""));

/** "2026-27" → "2026/2027", il nome della stagione sul sito. */
export function eisiSeasonName(season: string): string | null {
  const m = season.match(/^(\d{4})-\d{2}$/);
  return m ? `${m[1]}/${Number(m[1]) + 1}` : null;
}

function points(e: EisiEvent, teamId: number): number | null {
  const r = e.results[String(teamId)] as { points?: string } | undefined;
  const v = (r?.points ?? "").trim();
  return /^\d{1,3}$/.test(v) ? Number(v) : null;
}

/** Le gare del sito nel formato dei fogli: la prima squadra gioca in casa. */
export function eventsToSheet(
  title: string,
  events: EisiEvent[],
  teams: Named[],
  venues: Named[]
): ParsedSheet {
  const teamNames = new Map(teams.map((t) => [t.id, nameOf(t)] as const));
  const venueNames = new Map(venues.map((v) => [v.id, nameOf(v)] as const));
  const warnings: string[] = [];
  const matches: SheetMatch[] = [];

  for (const e of [...events].sort((a, b) => a.date_gmt.localeCompare(b.date_gmt) || a.id - b.id)) {
    const [homeId, awayId] = e.teams;
    const home = teamNames.get(homeId);
    const away = teamNames.get(awayId);
    if (e.teams.length !== 2 || !home || !away) {
      warnings.push(`Gara ${e.id} senza le due squadre: non importata`);
      continue;
    }
    const date = new Date(`${e.date_gmt}Z`);
    if (Number.isNaN(date.getTime())) {
      warnings.push(`Gara ${e.id} (${home} – ${away}) senza data: non importata`);
      continue;
    }
    let homeScore = points(e, homeId);
    let awayScore = points(e, awayId);
    if (homeScore === null || awayScore === null) {
      homeScore = null;
      awayScore = null;
    }
    const outcomes = [homeId, awayId].flatMap(
      (id) => (e.results[String(id)] as { outcome?: string[] } | undefined)?.outcome ?? []
    );
    const venue = e.venues[0] !== undefined ? (venueNames.get(e.venues[0]) ?? null) : null;
    matches.push({
      number: e.id,
      home,
      away,
      date,
      dateFixed: false,
      // "#N/A" è un campo di gioco segnaposto del sito.
      venue: venue && venue !== "#N/A" ? venue : null,
      homeScore,
      awayScore,
      forfait: outcomes.some((o) => /forfait|rinuncia/i.test(o)),
    });
  }
  if (matches.length === 0) warnings.push("Nel girone non c'è ancora nessuna gara");
  return { title, matches, warnings };
}

// ── Lettura dal sito (solo server) ───────────────────────────────────────────

export class EisiSiteError extends Error {}

async function get<T>(path: string): Promise<{ data: T; totalPages: number }> {
  let res: Response;
  try {
    res = await fetch(`${EISI_API}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new EisiSiteError("Il sito EISI non risponde");
  }
  if (!res.ok) throw new EisiSiteError(`Il sito EISI ha risposto con un errore (${res.status})`);
  const data = (await res.json().catch(() => null)) as T | null;
  if (data === null) throw new EisiSiteError("Il sito EISI ha risposto in un formato inatteso");
  return { data, totalPages: Number(res.headers.get("x-wp-totalpages") ?? "1") || 1 };
}

async function getAll<T>(path: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const first = await get<T[]>(`${path}${sep}per_page=100&page=1`);
  const rest = await Promise.all(
    Array.from({ length: Math.min(first.totalPages, 20) - 1 }, (_, i) =>
      get<T[]>(`${path}${sep}per_page=100&page=${i + 2}`).then((r) => r.data)
    )
  );
  return [...first.data, ...rest.flat()];
}

async function seasonId(season: string): Promise<number> {
  const name = eisiSeasonName(season);
  const seasons = await getAll<Named>("/seasons?_fields=id,name");
  const found = seasons.find((s) => nameOf(s) === name);
  if (!found) throw new EisiSiteError(`Sul sito EISI non c'è la stagione ${name ?? season}`);
  return found.id;
}

/** I gironi del sito, in ordine di nome. */
export async function fetchEisiLeagues(): Promise<EisiLeague[]> {
  const leagues = await getAll<Named>("/leagues?_fields=id,name");
  return leagues
    .map((l) => ({ id: l.id, name: nameOf(l) }))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/** Tutte le gare di un girone in una stagione, già nel formato dei fogli. */
export async function fetchEisiLeague(leagueId: number, season: string): Promise<ParsedSheet> {
  const [sid, leagues] = await Promise.all([seasonId(season), fetchEisiLeagues()]);
  const league = leagues.find((l) => l.id === leagueId);
  if (!league) throw new EisiSiteError("Il girone non c'è più sul sito EISI");
  const events = await getAll<EisiEvent>(
    `/events?leagues=${leagueId}&seasons=${sid}&_fields=id,date_gmt,status,teams,venues,results`
  );
  const teamIds = [...new Set(events.flatMap((e) => e.teams))];
  const venueIds = [...new Set(events.flatMap((e) => e.venues))];
  const [teams, venues] = await Promise.all([
    teamIds.length > 0
      ? getAll<Named>(`/teams?include=${teamIds.join(",")}&_fields=id,title`)
      : Promise.resolve([]),
    venueIds.length > 0
      ? getAll<Named>(`/venues?include=${venueIds.join(",")}&_fields=id,name`)
      : Promise.resolve([]),
  ]);
  return eventsToSheet(`${league.name} · ${eisiSeasonName(season)}`, events, teams, venues);
}
