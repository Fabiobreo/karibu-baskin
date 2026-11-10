import { assignMatchdays, type SheetMatch } from "./eisiSheet";

/**
 * Piano di import di un foglio EISI in un girone, senza toccare il database:
 * dice per ogni gara se diventa una partita nuova, aggiorna una che c'è già,
 * è già uguale o va in conflitto con un punteggio inserito a mano. La rotta
 * lo calcola due volte, per l'anteprima e al momento di salvare, sugli stessi
 * dati: quello che lo staff ha visto è quello che si scrive.
 *
 * Le gare che coinvolgono una nostra squadra diventano `Match` (le partite di
 * "Partite", con convocazioni e statistiche); le altre `GroupMatch`.
 */

/** A chi corrisponde un nome del foglio. */
export type NameTarget =
  | { kind: "ours"; teamId: string }
  | { kind: "opponent"; opposingTeamId: string }
  /** Avversaria da creare in anagrafica con il nome del foglio. */
  | { kind: "new" }
  /** Le gare con questa squadra non si importano. */
  | { kind: "skip" };

export interface ExistingOurMatch {
  id: string;
  teamId: string;
  opponentId: string | null;
  date: Date;
  isHome: boolean;
  ourScore: number | null;
  theirScore: number | null;
  matchday: number | null;
  venue: string | null;
  groupId: string | null;
}

export interface ExistingGroupMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  date: Date | null;
  homeScore: number | null;
  awayScore: number | null;
  matchday: number | null;
}

export type RowAction = "create" | "update" | "same" | "conflict" | "skip";

export interface PlanRow {
  number: number;
  matchday: number;
  date: Date;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  forfait: boolean;
  dateFixed: boolean;
  /** "ours" = una nostra squadra gioca (Match), "other" = fra avversarie (GroupMatch). */
  kind: "ours" | "other";
  action: RowAction;
  existingId: string | null;
  /** Cosa cambia, in parole, per l'anteprima. */
  changes: string[];
  /** Punteggio già salvato, quando è diverso da quello del foglio. */
  existingScore: string | null;
  skipReason: string | null;
  // Valori da scrivere (id delle avversarie nuove: `new:<nome>`).
  ourTeamId: string | null;
  opponentRef: string | null;
  isHome: boolean;
  homeRef: string | null;
  awayRef: string | null;
}

/** Un'avversaria da creare si riconosce dal prefisso, finché non ha un id vero. */
export const NEW_PREFIX = "new:";

export function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Proposta di abbinamento per un nome del foglio. Le nostre squadre: un nome
 * che contiene il nome della squadra ("Karibù Kapuleti" → Kapuleti) o, se nel
 * girone ce n'è una sola, un nome con "Karibu" ("Karibù Baskin" → Montekki).
 * Le avversarie: stesso nome a meno di accenti e maiuscole, poi un nome che
 * contiene l'altro ("Sangio Wolves Baskin" → "Sangio Wolves").
 */
export function suggestTarget(
  sheetName: string,
  ourTeams: ReadonlyArray<{ id: string; name: string }>,
  opponents: ReadonlyArray<{ id: string; name: string }>
): NameTarget {
  const n = normalizeTeamName(sheetName);
  const words = new Set(n.split(" "));
  const ours = ourTeams.filter((t) => {
    const tn = normalizeTeamName(t.name);
    return tn !== "" && (n === tn || n.includes(tn));
  });
  if (ours.length === 1) return { kind: "ours", teamId: ours[0].id };
  if (words.has("karibu") && ourTeams.length === 1) {
    return { kind: "ours", teamId: ourTeams[0].id };
  }

  const exact = opponents.find((o) => normalizeTeamName(o.name) === n);
  if (exact) return { kind: "opponent", opposingTeamId: exact.id };
  const contained = opponents.filter((o) => {
    const on = normalizeTeamName(o.name);
    return on.length >= 4 && (n.includes(on) || on.includes(n));
  });
  if (contained.length === 1) return { kind: "opponent", opposingTeamId: contained[0].id };
  return { kind: "new" };
}

/** Oltre questa distanza due partite con le stesse squadre non sono la stessa gara. */
const SAME_MATCH_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;

function closest<T extends { id: string }>(
  candidates: T[],
  dateOf: (c: T) => Date | null,
  target: Date,
  taken: Set<string>
): T | null {
  let best: T | null = null;
  let bestGap = Infinity;
  for (const c of candidates) {
    if (taken.has(c.id)) continue;
    const d = dateOf(c);
    // Una partita senza data va bene per qualunque gara con quelle squadre.
    const gap = d ? Math.abs(d.getTime() - target.getTime()) : SAME_MATCH_WINDOW_MS - 1;
    if (gap < SAME_MATCH_WINDOW_MS && gap < bestGap) {
      best = c;
      bestGap = gap;
    }
  }
  return best;
}

const fmtScore = (a: number | null, b: number | null) =>
  a !== null && b !== null ? `${a}–${b}` : null;

function sameMinute(a: Date | null, b: Date): boolean {
  return a !== null && Math.abs(a.getTime() - b.getTime()) < 60_000;
}

function refOf(name: string, target: NameTarget): string | null {
  if (target.kind === "opponent") return target.opposingTeamId;
  if (target.kind === "new") return `${NEW_PREFIX}${name}`;
  return null;
}

export interface PlanInput {
  matches: SheetMatch[];
  names: Record<string, NameTarget>;
  groupId: string;
  existingOurs: ExistingOurMatch[];
  existingOthers: ExistingGroupMatch[];
  /**
   * Gare in conflitto per cui lo staff ha scelto il punteggio del foglio. Le
   * altre tengono quello già salvato: un risultato scritto a mano non si
   * sovrascrive senza dirlo.
   */
  useSheetScore: ReadonlySet<number>;
  /**
   * Tiene la giornata già salvata sulle partite che ci sono (anche corretta a
   * mano); la giornata calcolata vale solo per quelle nuove.
   */
  keepMatchdays?: boolean;
}

const pairKey = (a: string, b: string) => [a, b].sort().join(" | ");

/**
 * Se la data è cambiata di molto (una gara rinviata di mesi) la vicinanza non
 * basta. Quando nel foglio le due squadre si incontrano una volta sola e nel
 * girone c'è una sola loro partita ancora libera, è quella.
 */
function onlyLeft<T extends { id: string }>(candidates: T[], taken: Set<string>): T | null {
  const free = candidates.filter((c) => !taken.has(c.id));
  return free.length === 1 ? free[0] : null;
}

export function planSheetImport(input: PlanInput): PlanRow[] {
  const { matches, names, groupId, existingOurs, existingOthers, useSheetScore } = input;
  const matchdays = assignMatchdays(matches);
  const pairs = new Map<string, number>();
  for (const m of matches) {
    const k = pairKey(m.home, m.away);
    pairs.set(k, (pairs.get(k) ?? 0) + 1);
  }
  const takenOurs = new Set<string>();
  const takenOthers = new Set<string>();

  return matches.map((m, i) => {
    const homeT = names[m.home] ?? { kind: "new" };
    const awayT = names[m.away] ?? { kind: "new" };
    const base = {
      number: m.number,
      matchday: matchdays[i],
      date: m.date,
      home: m.home,
      away: m.away,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      venue: m.venue,
      forfait: m.forfait,
      dateFixed: m.dateFixed,
      existingId: null,
      changes: [] as string[],
      existingScore: null,
      skipReason: null,
      ourTeamId: null,
      opponentRef: null,
      isHome: true,
      homeRef: null,
      awayRef: null,
    };

    if (homeT.kind === "skip" || awayT.kind === "skip") {
      return {
        ...base,
        kind: "other",
        action: "skip",
        skipReason: "Squadra esclusa dall'import",
      };
    }
    if (homeT.kind === "ours" && awayT.kind === "ours") {
      return {
        ...base,
        kind: "ours",
        action: "skip",
        skipReason: "Due nostre squadre: inseriscila da Partite",
      };
    }

    // ── Una nostra squadra in campo: è una partita di "Partite" ──────────────
    if (homeT.kind === "ours" || awayT.kind === "ours") {
      const isHome = homeT.kind === "ours";
      const ourTeamId = isHome
        ? (homeT as { teamId: string }).teamId
        : (awayT as { teamId: string }).teamId;
      const opponentRef = isHome ? refOf(m.away, awayT) : refOf(m.home, homeT);
      const ourScore = isHome ? m.homeScore : m.awayScore;
      const theirScore = isHome ? m.awayScore : m.homeScore;
      const row = { ...base, kind: "ours" as const, ourTeamId, opponentRef, isHome };

      const candidates = opponentRef?.startsWith(NEW_PREFIX)
        ? []
        : existingOurs.filter((e) => e.teamId === ourTeamId && e.opponentId === opponentRef);
      const found =
        closest(candidates, (e) => e.date, m.date, takenOurs) ??
        (pairs.get(pairKey(m.home, m.away)) === 1
          ? onlyLeft(
              candidates.filter((e) => e.groupId === groupId),
              takenOurs
            )
          : null);
      if (!found) return { ...row, action: "create" };
      takenOurs.add(found.id);

      const changes: string[] = [];
      let action: RowAction = "update";
      const sheetScore = fmtScore(ourScore, theirScore);
      const savedScore = fmtScore(found.ourScore, found.theirScore);
      let existingScore: string | null = null;
      if (sheetScore && savedScore && sheetScore !== savedScore) {
        existingScore = savedScore;
        if (useSheetScore.has(m.number)) changes.push(`punteggio ${savedScore} → ${sheetScore}`);
        else action = "conflict";
      } else if (sheetScore && !savedScore) {
        changes.push(`punteggio ${sheetScore}`);
      }
      if (!sameMinute(found.date, m.date)) changes.push("data e ora");
      if (found.isHome !== isHome) changes.push(isHome ? "in casa" : "in trasferta");
      if (found.groupId !== groupId) changes.push("aggiunta al girone");
      const matchday =
        input.keepMatchdays && found.matchday !== null ? found.matchday : matchdays[i];
      if (found.matchday !== matchday) changes.push(`giornata ${matchday}`);
      if (!found.venue && m.venue) changes.push("campo");

      if (action !== "conflict" && changes.length === 0) action = "same";
      return { ...row, matchday, action, existingId: found.id, changes, existingScore };
    }

    // ── Due avversarie: risultato del girone ─────────────────────────────────
    const homeRef = refOf(m.home, homeT);
    const awayRef = refOf(m.away, awayT);
    const row = { ...base, kind: "other" as const, homeRef, awayRef };
    const isNew = homeRef?.startsWith(NEW_PREFIX) || awayRef?.startsWith(NEW_PREFIX);
    const candidates = isNew
      ? []
      : existingOthers.filter(
          (e) =>
            (e.homeTeamId === homeRef && e.awayTeamId === awayRef) ||
            (e.homeTeamId === awayRef && e.awayTeamId === homeRef)
        );
    const found =
      closest(candidates, (e) => e.date, m.date, takenOthers) ??
      (pairs.get(pairKey(m.home, m.away)) === 1 ? onlyLeft(candidates, takenOthers) : null);
    if (!found) return { ...row, action: "create" };
    takenOthers.add(found.id);

    // Il punteggio salvato, girato come nel foglio (casa prima).
    const flipped = found.homeTeamId !== homeRef;
    const savedHome = flipped ? found.awayScore : found.homeScore;
    const savedAway = flipped ? found.homeScore : found.awayScore;
    const sheetScore = fmtScore(m.homeScore, m.awayScore);
    const savedScore = fmtScore(savedHome, savedAway);
    const changes: string[] = [];
    let action: RowAction = "update";
    let existingScore: string | null = null;
    if (sheetScore && savedScore && sheetScore !== savedScore) {
      existingScore = savedScore;
      if (useSheetScore.has(m.number)) changes.push(`punteggio ${savedScore} → ${sheetScore}`);
      else action = "conflict";
    } else if (sheetScore && !savedScore) {
      changes.push(`punteggio ${sheetScore}`);
    }
    if (!sameMinute(found.date, m.date)) changes.push("data e ora");
    if (flipped) changes.push("casa e ospiti");
    const matchday = input.keepMatchdays && found.matchday !== null ? found.matchday : matchdays[i];
    if (found.matchday !== matchday) changes.push(`giornata ${matchday}`);
    if (action !== "conflict" && changes.length === 0) action = "same";
    return { ...row, matchday, action, existingId: found.id, changes, existingScore };
  });
}

/** Risposta di `POST /api/groups/[groupId]/sheet-import` (date in ISO). */
export interface SheetImportResponse {
  title: string | null;
  warnings: string[];
  /** Un nome del foglio, l'abbinamento in uso e quante gare lo riguardano. */
  names: Array<{ name: string; target: NameTarget; matches: number }>;
  ourTeams: Array<{ id: string; name: string; color: string | null }>;
  opponents: Array<{ id: string; name: string }>;
  rows: Array<Omit<PlanRow, "date"> & { date: string }>;
  summary: PlanSummary;
  /** Solo dopo il salvataggio. */
  applied?: { createdOpponents: number };
}

export interface PlanSummary {
  create: number;
  update: number;
  same: number;
  conflict: number;
  skip: number;
}

export function summarizePlan(rows: ReadonlyArray<PlanRow>): PlanSummary {
  const s: PlanSummary = { create: 0, update: 0, same: 0, conflict: 0, skip: 0 };
  for (const r of rows) s[r.action]++;
  return s;
}
