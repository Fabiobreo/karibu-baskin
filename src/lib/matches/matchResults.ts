import type { MatchResult } from "@prisma/client";

export type MatchResultMeta = {
  label: string;
  short: string;
  color: string;
  bg: string;
};

export const MATCH_RESULT_META: Record<MatchResult, MatchResultMeta> = {
  WIN: { label: "Vittoria", short: "V", color: "match.win", bg: "match.winBg" },
  LOSS: { label: "Sconfitta", short: "S", color: "match.loss", bg: "match.lossBg" },
  DRAW: { label: "Pareggio", short: "P", color: "match.draw", bg: "match.drawBg" },
};
