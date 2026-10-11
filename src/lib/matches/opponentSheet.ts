/**
 * Scheda di una squadra avversaria: forza complessiva, valutazione per ruolo
 * (con i giocatori da segnalare, per numero e iniziali) e nota. Sta sull'avversaria (non sulla partita), è solo dello staff e si compila
 * quando si vuole, anche prima di averci giocato.
 */
import type { OpponentPlayerNote, OpponentProfile, OpponentStrength } from "@/lib/schemas/match";
import { OPPONENT_STRENGTH_VALUES } from "@/lib/schemas/match";
import { OPPONENT_MU_PRESETS } from "@/lib/matches/matchQuality";

/** I campi della scheda, così come stanno su `OpposingTeam`. */
export interface OpponentSheet {
  /** Forza complessiva, come livello stimato per giocatore (null = non impostata). */
  ratingMu: number | null;
  scoutingProfile: OpponentProfile;
  /** Arriva come stringa quando passa da un Server Component o da una risposta JSON. */
  scoutingUpdatedAt: Date | string | null;
}

/**
 * Una nota di partita nel diario della scheda: cosa si è visto dell'avversaria
 * quel giorno, con il risultato accanto.
 */
export interface OpponentMatchNote {
  matchId: string;
  date: Date | string;
  /** La nostra squadra in quella partita. */
  teamName: string;
  ourScore: number | null;
  theirScore: number | null;
  note: string;
}

/** La partita da cui si è aperta la scheda, se è già iniziata: la sua nota si scrive lì. */
export interface OpponentSheetMatch extends Omit<OpponentMatchNote, "note"> {
  note: string | null;
}

/** "12 ott 2025 · Kapuleti 92 – 79": di quale partita parla una nota. */
export function matchNoteHeading(
  m: Pick<OpponentMatchNote, "teamName" | "ourScore" | "theirScore">,
  dateLabel: string
): string {
  const score =
    m.ourScore !== null && m.theirScore !== null ? ` ${m.ourScore} – ${m.theirScore}` : "";
  return `${dateLabel} · ${m.teamName}${score}`;
}

/**
 * Giorni dopo la partita in cui la riga di `/admin/partite` propone la nota
 * sull'avversaria. Poi smette: è un invito, non un compito arretrato.
 */
export const MATCH_NOTE_DUE_DAYS = 14;

/** La partita è finita da poco e la nota sull'avversaria non c'è ancora. */
export function isMatchNoteDue(
  match: { date: Date | string; hasResult: boolean; hasOpponent: boolean; hasNote: boolean },
  now: number
): boolean {
  if (!match.hasResult || !match.hasOpponent || match.hasNote) return false;
  const age = now - new Date(match.date).getTime();
  return age >= 0 && age <= MATCH_NOTE_DUE_DAYS * 24 * 60 * 60 * 1000;
}

/** Select Prisma dei campi della scheda. Mai in una lettura pubblica. */
export const OPPONENT_SHEET_SELECT = {
  ratingMu: true,
  scoutingProfile: true,
  scoutingUpdatedAt: true,
} as const;

/** Omit Prisma per le letture pubbliche dell'avversaria: la scheda non esce. */
export const OPPONENT_SHEET_OMIT = {
  ratingMu: true,
  ratingSigma: true,
  scoutingProfile: true,
  scoutingUpdatedAt: true,
} as const;

export const OPPONENT_STRENGTH_LABELS: Record<OpponentStrength, string> = {
  WEAK: "Debole",
  MEDIUM: "Media",
  STRONG: "Forte",
};

const PHYSICALITY_LABELS = { LOW: "bassa", MEDIUM: "media", HIGH: "alta" } as const;

/**
 * La scheda come si scrive nel registro attività: cosa è stato valutato, non
 * i testi. Le note (sulla squadra e sui singoli giocatori) parlano di persone
 * di altre società: nel registro resta che ci sono e quante, non cosa dicono.
 */
export function sheetAuditSummary(sheet: {
  ratingMu: number | null;
  scoutingProfile: unknown;
}): Record<string, unknown> {
  const strength = strengthFromMu(sheet.ratingMu);
  const profile = sheet.scoutingProfile as OpponentProfile;
  const roles: Record<string, string> = {};
  let flagged = 0;
  for (const [role, a] of Object.entries(profile?.categories ?? {})) {
    roles[role] =
      `${OPPONENT_STRENGTH_LABELS[a.strength]}, fisicità ${PHYSICALITY_LABELS[a.physicality]}`;
    flagged += a.players?.length ?? 0;
  }
  return {
    forza: strength ? OPPONENT_STRENGTH_LABELS[strength] : "Non impostata",
    ruoli: roles,
    giocatoriSegnalati: flagged,
    notaSullaSquadra: !!profile?.notes,
  };
}

/** Una nota di partita nel registro attività: se c'è e quanto è lunga, non il testo. */
export function noteAuditSummary(note: string | null | undefined): Record<string, unknown> {
  return { nota: !!note, caratteri: note?.length ?? 0 };
}

/** La forza complessiva più vicina a un livello stimato (null = non impostata). */
export function strengthFromMu(mu: number | null | undefined): OpponentStrength | null {
  if (mu == null) return null;
  let best: OpponentStrength | null = null;
  let bestDiff = Infinity;
  for (const key of OPPONENT_STRENGTH_VALUES) {
    const diff = Math.abs(mu - OPPONENT_MU_PRESETS[key]!);
    if (diff < bestDiff) {
      best = key;
      bestDiff = diff;
    }
  }
  return best;
}

/** Il livello stimato che corrisponde a una forza complessiva. */
export function muFromStrength(strength: OpponentStrength | null): number | null {
  return strength ? (OPPONENT_MU_PRESETS[strength] ?? null) : null;
}

type Categories = NonNullable<OpponentProfile>["categories"];

/** Una riga lasciata del tutto vuota nel modulo: si scarta senza dire nulla. */
function isBlankPlayer(p: OpponentPlayerNote): boolean {
  return !p.number?.trim() && !p.initials?.trim() && !p.note.trim();
}

/** Le iniziali come si salvano: maiuscole, solo lettere e punti, al massimo 4. */
export function cleanInitials(value: string): string {
  return value
    .replace(/[^\p{L}.]/gu, "")
    .slice(0, 4)
    .toUpperCase();
}

/** Il numero di maglia come si salva: solo cifre, al massimo 3. */
export function cleanJerseyNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 3);
}

/** Come si legge un giocatore segnalato: "n. 14 · T.C.". */
export function playerNoteLabel(p: Pick<OpponentPlayerNote, "number" | "initials">): string {
  return [p.number && `n. ${p.number}`, p.initials].filter(Boolean).join(" · ");
}

/**
 * Cosa manca ai giocatori segnalati, o null se il modulo si può salvare. Una
 * riga cominciata va finita: una nota senza numero né iniziali non dice di chi
 * si parla, un numero senza nota non dice niente.
 */
export function playerNotesError(categories: Categories): string | null {
  for (const [role, assessment] of Object.entries(categories)) {
    for (const p of assessment.players ?? []) {
      if (isBlankPlayer(p)) continue;
      if (!p.number?.trim() && !p.initials?.trim()) {
        return `Ruolo ${role}: indica il numero di maglia o le iniziali del giocatore.`;
      }
      if (!p.note.trim()) return `Ruolo ${role}: scrivi una nota per ${playerNoteLabel(p)}.`;
    }
  }
  return null;
}

/** I giocatori segnalati come si salvano: senza righe vuote né campi vuoti. */
function cleanPlayers(players: OpponentPlayerNote[] | undefined): OpponentPlayerNote[] {
  return (players ?? [])
    .filter((p) => !isBlankPlayer(p))
    .map((p) => {
      const number = cleanJerseyNumber(p.number ?? "");
      const initials = cleanInitials(p.initials ?? "");
      return { ...(number && { number }), ...(initials && { initials }), note: p.note.trim() };
    });
}

/**
 * La scheda da salvare: null se non c'è né un ruolo valutato né una nota, così
 * una scheda svuotata torna "non compilata".
 */
export function buildScoutingProfile(categories: Categories, notes: string): OpponentProfile {
  const trimmed = notes.trim();
  if (Object.keys(categories).length === 0 && !trimmed) return null;
  const cleaned: Categories = {};
  for (const [role, { strength, physicality, players }] of Object.entries(categories)) {
    const kept = cleanPlayers(players);
    cleaned[role] = { strength, physicality, ...(kept.length > 0 && { players: kept }) };
  }
  return { categories: cleaned, ...(trimmed && { notes: trimmed }) };
}

/** C'è qualcosa di compilato: la forza complessiva, un ruolo o una nota. */
export function hasOpponentSheet(
  sheet: Partial<Pick<OpponentSheet, "ratingMu" | "scoutingProfile">> | null | undefined
): boolean {
  if (!sheet) return false;
  if (sheet.ratingMu != null) return true;
  const profile = sheet.scoutingProfile;
  return !!profile && (Object.keys(profile.categories ?? {}).length > 0 || !!profile.notes);
}
