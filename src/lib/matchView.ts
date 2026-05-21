import type { MatchResult } from "@prisma/client";

/**
 * Helpers per "vedere" una partita dal punto di vista di una specifica squadra.
 * Necessario perché Match.ourScore/theirScore/result sono memorizzati dal punto
 * di vista di `teamId`, ma una partita interna (Match.opponentTeamId valorizzato)
 * compare anche sulla pagina della squadra avversaria interna — in quel caso
 * punteggio e risultato vanno specchiati.
 */

export interface OpponentInfoSource {
  opponent: { id: string; name: string; city: string | null; slug?: string | null } | null;
  opponentTeam: {
    id: string;
    name: string;
    color?: string | null;
    season?: string | null;
  } | null;
}

export interface OpponentInfo {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  isInternal: boolean;
  color: string | null;
  season: string | null;
}

/** Normalizza l'avversario (esterno o interno) in un'unica forma uniforme. */
export function getMatchOpponent(m: OpponentInfoSource): OpponentInfo {
  if (m.opponent) {
    return {
      id: m.opponent.id,
      name: m.opponent.name,
      city: m.opponent.city,
      slug: m.opponent.slug ?? null,
      isInternal: false,
      color: null,
      season: null,
    };
  }
  if (m.opponentTeam) {
    return {
      id: m.opponentTeam.id,
      name: m.opponentTeam.name,
      city: null,
      slug: null,
      isInternal: true,
      color: m.opponentTeam.color ?? null,
      season: m.opponentTeam.season ?? null,
    };
  }
  // Caso impossibile (vincolo XOR), ma TypeScript non lo sa
  return {
    id: "",
    name: "Avversario",
    city: null,
    slug: null,
    isInternal: false,
    color: null,
    season: null,
  };
}

/** Restituisce solo il nome dell'avversario (helper rapido per rendering). */
export function getOpponentName(m: OpponentInfoSource): string {
  return m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
}

/** Inverte il risultato (per vista da prospettiva avversaria in partita interna). */
export function invertResult(r: MatchResult | null): MatchResult | null {
  if (r === "WIN") return "LOSS";
  if (r === "LOSS") return "WIN";
  return r; // DRAW o null
}

/**
 * Vista della partita dal punto di vista di `viewingTeamId`:
 * - se è la squadra principale (`teamId`), valori invariati
 * - se è la squadra avversaria interna (`opponentTeamId`), specchia score/result/isHome
 */
export function getMatchPerspective<
  M extends {
    teamId: string;
    opponentTeamId: string | null;
    ourScore: number | null;
    theirScore: number | null;
    result: MatchResult | null;
    isHome: boolean;
  },
>(
  m: M,
  viewingTeamId: string
): {
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  isHome: boolean;
  mirrored: boolean;
} {
  if (m.opponentTeamId === viewingTeamId) {
    return {
      ourScore: m.theirScore,
      theirScore: m.ourScore,
      result: invertResult(m.result),
      isHome: !m.isHome,
      mirrored: true,
    };
  }
  return {
    ourScore: m.ourScore,
    theirScore: m.theirScore,
    result: m.result,
    isHome: m.isHome,
    mirrored: false,
  };
}
