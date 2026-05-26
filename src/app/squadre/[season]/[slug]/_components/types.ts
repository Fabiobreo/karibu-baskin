import type { MatchResult } from "@prisma/client";

export type AnyMatch = {
  id: string;
  slug: string | null;
  date: Date;
  isHome: boolean;
  matchType: "LEAGUE" | "TOURNAMENT" | "FRIENDLY";
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  venue: string | null;
  opponent: { id: string; name: string; city: string | null };
  /** true se la partita era originariamente memorizzata con questa squadra come
   * opponentTeam (amichevole interna vista da prospettiva avversaria, specchiata) */
  isMirrored?: boolean;
};
