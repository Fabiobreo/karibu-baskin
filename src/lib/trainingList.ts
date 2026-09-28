import { addWeeks, isSameMonth, isSameYear, startOfWeek } from "date-fns";

// Logica pura della lista di /allenamenti: stagioni, gruppi e riassunti.
// Nessuna dipendenza da React o Prisma, cosi' si testa da sola.

/**
 * Stagione "da allenamento" di una data, es. "2025-26". Parte dal 1° agosto,
 * come `getSeasonStartDate()`: la preparazione di agosto appartiene alla
 * stagione che comincia, non a quella appena finita.
 */
export function trainingSeasonOf(date: Date): string {
  const y = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${y}-${String(y + 1).slice(-2)}`;
}

/** true se la stringa ha la forma di una stagione ("2025-26") e gli anni sono consecutivi. */
export function isSeasonLabel(value: string | null | undefined): value is string {
  if (!value) return false;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return false;
  return (Number(m[1]) + 1) % 100 === Number(m[2]);
}

/** Intervallo [inizio, fine) di una stagione da allenamento: 1° agosto → 1° agosto. */
export function trainingSeasonRange(label: string): { start: Date; end: Date } {
  const y = Number(label.slice(0, 4));
  return { start: new Date(y, 7, 1), end: new Date(y + 1, 7, 1) };
}

/** Stagioni da `first` a `last` comprese, dalla piu' recente. */
export function seasonsBetween(first: string, last: string): string[] {
  const from = Number(first.slice(0, 4));
  const to = Number(last.slice(0, 4));
  const out: string[] = [];
  for (let y = to; y >= from; y--) out.push(`${y}-${String(y + 1).slice(-2)}`);
  return out;
}

export type UpcomingGroup =
  | { kind: "thisWeek" }
  | { kind: "nextWeek" }
  | { kind: "month"; month: Date; showYear: boolean };

function groupOf(date: Date, now: Date): UpcomingGroup {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const nextWeek = addWeeks(thisWeek, 1);
  const afterNext = addWeeks(thisWeek, 2);
  if (date < nextWeek) return { kind: "thisWeek" };
  if (date < afterNext) return { kind: "nextWeek" };
  return { kind: "month", month: date, showYear: !isSameYear(date, now) };
}

function sameGroup(a: UpcomingGroup, b: UpcomingGroup): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "month" && b.kind === "month") return isSameMonth(a.month, b.month);
  return true;
}

/**
 * Raggruppa gli allenamenti in arrivo come li direbbe una persona: "questa
 * settimana", "prossima settimana", poi per mese. Si aspetta l'ordine
 * cronologico e lo mantiene.
 */
export function groupUpcoming<T extends { date: string | Date }>(
  items: T[],
  now: Date = new Date()
): { group: UpcomingGroup; items: T[] }[] {
  const out: { group: UpcomingGroup; items: T[] }[] = [];
  for (const item of items) {
    const group = groupOf(new Date(item.date), now);
    const last = out[out.length - 1];
    if (last && sameGroup(last.group, group)) last.items.push(item);
    else out.push({ group, items: [item] });
  }
  return out;
}

/** Raggruppa per mese mantenendo l'ordine ricevuto (per i passati: dal piu' recente). */
export function groupByMonth<T extends { date: string | Date }>(
  items: T[]
): { month: Date; items: T[] }[] {
  const out: { month: Date; items: T[] }[] = [];
  for (const item of items) {
    const d = new Date(item.date);
    const last = out[out.length - 1];
    if (last && isSameMonth(last.month, d)) last.items.push(item);
    else out.push({ month: d, items: [item] });
  }
  return out;
}

export type TeamKey = "teamA" | "teamB" | "teamC";

const MATCHUP_TEAMS: Record<string, [TeamKey, TeamKey]> = {
  AB: ["teamA", "teamB"],
  AC: ["teamA", "teamC"],
  BC: ["teamB", "teamC"],
};

/**
 * Le due squadre di una partitella. `matchup` nullo e' il caso storico a due
 * squadre (A contro B); un valore sconosciuto viene scartato.
 */
export function matchupTeams(matchup: string | null): [TeamKey, TeamKey] | null {
  return MATCHUP_TEAMS[matchup ?? "AB"] ?? null;
}
