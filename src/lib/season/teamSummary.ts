import type { MatchResult } from "@prisma/client";
import { LIVE_WINDOW_MS } from "@/lib/matches/matchPhase";

/** Quello che serve di una partita per riassumere la stagione di una squadra. */
export interface SummaryMatch {
  date: Date;
  result: MatchResult | null;
  ourScore: number | null;
  theirScore: number | null;
}

export interface TeamSummary<M extends SummaryMatch> {
  wins: number;
  draws: number;
  losses: number;
  /** Partite con il punteggio inserito. */
  played: number;
  /** Partite non ancora finite (future o in corso), dalla più vicina. */
  upcoming: M[];
}

const hasScore = (m: SummaryMatch) => m.ourScore !== null && m.theirScore !== null;

/**
 * Bilancio e partite in programma di una squadra, per le card di `/squadre`.
 * "In programma" come nella pagina dell'avversaria: senza punteggio e iniziata
 * da meno di `LIVE_WINDOW_MS`. Una partita passata senza punteggio non conta né
 * nel bilancio né fra quelle in programma.
 */
export function summarizeTeamMatches<M extends SummaryMatch>(
  matches: M[],
  now: number
): TeamSummary<M> {
  const summary: TeamSummary<M> = { wins: 0, draws: 0, losses: 0, played: 0, upcoming: [] };
  for (const m of matches) {
    if (hasScore(m)) {
      if (!m.result) continue;
      summary.played++;
      if (m.result === "WIN") summary.wins++;
      else if (m.result === "DRAW") summary.draws++;
      else summary.losses++;
    } else if (m.date.getTime() + LIVE_WINDOW_MS > now) {
      summary.upcoming.push(m);
    }
  }
  summary.upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
  return summary;
}

/** Chi, fra chi guarda e i suoi figli, gioca in una squadra. */
export interface TeamViewerLink {
  teamId: string;
  /** null = chi guarda; altrimenti il nome del figlio. */
  childName: string | null;
}

export interface ViewerTeamMark {
  mine: boolean;
  /** Nomi di battesimo dei figli in squadra, senza doppioni. */
  children: string[];
}

/** Per ogni squadra: è la mia? di quali figli? Solo le squadre con almeno un legame. */
export function viewerTeamMarks(links: TeamViewerLink[]): Map<string, ViewerTeamMark> {
  const marks = new Map<string, ViewerTeamMark>();
  for (const link of links) {
    const mark = marks.get(link.teamId) ?? { mine: false, children: [] };
    if (link.childName === null) {
      mark.mine = true;
    } else {
      const first = link.childName.trim().split(/\s+/)[0];
      if (first && !mark.children.includes(first)) mark.children.push(first);
    }
    marks.set(link.teamId, mark);
  }
  return marks;
}

/** Ordine delle card: la mia squadra, poi quelle dei figli, poi le altre (ordine dato). */
export function sortTeamsForViewer<T extends { id: string }>(
  teams: T[],
  marks: Map<string, ViewerTeamMark>
): T[] {
  const rank = (t: T) => {
    const mark = marks.get(t.id);
    return mark?.mine ? 0 : mark ? 1 : 2;
  };
  return teams
    .map((team, index) => ({ team, index }))
    .sort((a, b) => rank(a.team) - rank(b.team) || a.index - b.index)
    .map(({ team }) => team);
}
