// Squadra "Karibu" di stagione (`CompetitiveTeam.isMixed`).
//
// Ogni stagione ha una squadra Karibu, creata in automatico e nascosta: non
// compare in /admin/squadre né sul sito pubblico, solo tra le squadre che lo
// staff può scegliere per amichevoli e tornei. Non ha una rosa propria: schiera
// tutti i giocatori della sua stagione, cioè i tesserati delle squadre (non
// Karibu) di quella stagione. Per questo, ovunque il codice ricava i giocatori
// di una squadra dai TeamMembership, per la Karibu va usata l'unione delle rose
// della stagione. Le due direzioni:
//
// - squadra → giocatori: `rosterTeamIds` (quali rose leggere per un lato della
//   partita);
// - giocatore → squadre: `withMixedTeams` (per quali squadre può giocare chi è
//   tesserato in certe squadre: le sue più la Karibu della stessa stagione).
//
// Il nome interno del campo (`isMixed`) è storico; nei testi per lo staff si
// parla di "Karibu, tutti i giocatori della stagione".
//
// Stagione a squadra unica (`playsLeague`): lo staff può decidere, stagione per
// stagione, che il club gioca il campionato come Karibu. Allora la Karibu è una
// squadra pubblica a tutti gli effetti (pagina, girone, partite di campionato)
// e le altre squadre della stagione restano visibili come gruppi interni. La
// rosa resta l'unione delle loro rose: quella parte non cambia. Per la
// visibilità usare `isPublicTeam` / `PUBLIC_TEAM_WHERE`, mai `isMixed` da solo.

import type { MatchType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CLUB_TEAM_TINT } from "@/lib/teamColors";

export const CLUB_TEAM_NAME = "Karibu";
/** La Karibu ha la sua tinta (Ardesia), non scelta dallo staff (UX-29). */
const CLUB_TEAM_COLOR = CLUB_TEAM_TINT;

/** Id fisso per stagione: con l'upsert impedisce di creare due Karibu nella stessa stagione. */
export function clubTeamId(season: string): string {
  return `karibu-${season}`;
}

/**
 * Garantisce che la stagione abbia la sua squadra Karibu e ne restituisce l'id.
 * Idempotente: si può chiamare a ogni caricamento delle scelte squadra.
 */
export async function ensureClubTeam(season: string): Promise<string> {
  const existing = await prisma.competitiveTeam.findFirst({
    where: { season, isMixed: true },
    select: { id: true },
  });
  if (existing) return existing.id;
  const id = clubTeamId(season);
  await prisma.competitiveTeam.upsert({
    where: { id },
    create: { id, name: CLUB_TEAM_NAME, season, color: CLUB_TEAM_COLOR, isMixed: true },
    update: {},
  });
  return id;
}

/** Flag che dicono se una squadra è la Karibu e se gioca il campionato. */
export interface ClubTeamFlags {
  isMixed: boolean;
  playsLeague: boolean;
}

/** Ha una presenza pubblica: ogni squadra normale, e la Karibu iscritta al campionato. */
export function isPublicTeam(team: ClubTeamFlags): boolean {
  return !team.isMixed || team.playsLeague;
}

/**
 * Karibu "di sempre": nascosta, solo amichevoli e tornei, niente girone. Le
 * regole di `mixedMatchError` valgono solo per lei.
 */
export function isRestrictedClubTeam(team: ClubTeamFlags | null | undefined): boolean {
  return !!team && team.isMixed && !team.playsLeague;
}

/** Filtro Prisma di `isPublicTeam`. Con altri `OR` nello stesso where, metterlo in `AND`. */
export const PUBLIC_TEAM_WHERE = {
  OR: [{ isMixed: false }, { playsLeague: true }],
} satisfies Prisma.CompetitiveTeamWhereInput;

/** La Karibu nascosta gioca amichevoli e tornei, mai il campionato. */
export const MIXED_TEAM_MATCH_TYPES: readonly MatchType[] = ["FRIENDLY", "TOURNAMENT"];

export function isMatchTypeAllowedForMixed(matchType: MatchType): boolean {
  return MIXED_TEAM_MATCH_TYPES.includes(matchType);
}

/**
 * Regole di una partita in cui gioca la Karibu nascosta (su uno dei due lati):
 * `involvesMixed` va calcolato con `isRestrictedClubTeam`, perché la Karibu
 * iscritta al campionato non ha limiti.
 * Restituisce il messaggio d'errore per l'API, o null se la partita è valida.
 */
export function mixedMatchError(args: {
  involvesMixed: boolean;
  matchType: MatchType;
  groupId: string | null | undefined;
}): string | null {
  if (!args.involvesMixed) return null;
  if (!isMatchTypeAllowedForMixed(args.matchType)) {
    return `${CLUB_TEAM_NAME} (tutta la squadra) gioca solo amichevoli e tornei`;
  }
  if (args.groupId) {
    return `${CLUB_TEAM_NAME} (tutta la squadra) non gioca partite di girone`;
  }
  return null;
}

export interface TeamRef {
  id: string;
  season: string;
  isMixed: boolean;
}

/**
 * Parte pura di `rosterTeamIds`: per ogni squadra, le squadre di cui leggere la
 * rosa. Una squadra normale legge la propria, la Karibu quelle delle altre squadre
 * della stessa stagione. Il risultato è senza duplicati.
 */
export function expandRosterTeamIds(
  teams: TeamRef[],
  seasonTeams: { id: string; season: string; isMixed: boolean }[]
): string[] {
  const out = new Set<string>();
  for (const team of teams) {
    if (!team.isMixed) {
      out.add(team.id);
      continue;
    }
    for (const t of seasonTeams) {
      if (t.season === team.season && !t.isMixed) out.add(t.id);
    }
  }
  return [...out];
}

/** Squadre le cui rose compongono i giocatori schierabili dalle squadre date. */
export async function rosterTeamIds(teams: TeamRef[]): Promise<string[]> {
  const mixedSeasons = [...new Set(teams.filter((t) => t.isMixed).map((t) => t.season))];
  const seasonTeams =
    mixedSeasons.length > 0
      ? await prisma.competitiveTeam.findMany({
          where: { season: { in: mixedSeasons }, isMixed: false },
          select: { id: true, season: true, isMixed: true },
        })
      : [];
  return expandRosterTeamIds(teams, seasonTeams);
}

/**
 * Parte pura di `withMixedTeams`: alle squadre di cui una persona è tesserata
 * aggiunge la Karibu delle stesse stagioni. Le squadre proprie restano in testa,
 * così chi sceglie "la prima squadra in comune con la partita" preferisce la
 * propria alla Karibu (es. Montekki vs Karibu: un giocatore dei Montekki figura
 * con i Montekki).
 */
export function appendMixedTeamIds(
  memberTeams: { id: string; season: string }[],
  mixedTeams: { id: string; season: string }[]
): string[] {
  const seasons = new Set(memberTeams.map((t) => t.season));
  const out = memberTeams.map((t) => t.id);
  for (const m of mixedTeams) {
    if (seasons.has(m.season) && !out.includes(m.id)) out.push(m.id);
  }
  return out;
}

/** Squadre Karibu delle stagioni indicate. */
export async function loadMixedTeams(seasons: string[]): Promise<{ id: string; season: string }[]> {
  const unique = [...new Set(seasons)];
  if (unique.length === 0) return [];
  return prisma.competitiveTeam.findMany({
    where: { season: { in: unique }, isMixed: true },
    select: { id: true, season: true },
  });
}

/**
 * Per una lista di persone (ognuna con le squadre in cui è tesserata) calcola
 * le squadre per cui può giocare, Karibu compresa. Una sola query.
 */
export async function withMixedTeams<K>(
  people: Map<K, { id: string; season: string }[]>
): Promise<Map<K, string[]>> {
  const allSeasons = [...people.values()].flatMap((teams) => teams.map((t) => t.season));
  const mixed = await loadMixedTeams(allSeasons);
  const out = new Map<K, string[]>();
  for (const [key, teams] of people) out.set(key, appendMixedTeamIds(teams, mixed));
  return out;
}
