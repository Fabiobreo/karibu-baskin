import { z } from "zod";
import { MatchType, MatchResult } from "@prisma/client";

/** Derives WIN/LOSS/DRAW from raw scores. */
export function deriveResult(ourScore: number, theirScore: number): MatchResult {
  if (ourScore > theirScore) return "WIN";
  if (ourScore < theirScore) return "LOSS";
  return "DRAW";
}

const MatchBaseSchema = z.object({
  isHome: z.boolean().optional(),
  venue: z.string().max(200).optional(),
  matchType: z.nativeEnum(MatchType).optional(),
  result: z.nativeEnum(MatchResult).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  matchday: z.number().int().min(1).nullable().optional(),
  groupId: z.string().nullable().optional(),
});

export const MatchCreateSchema = MatchBaseSchema.extend({
  teamId: z.string().min(1),
  opponentId: z.string().min(1),
  date: z.string().datetime({ offset: true }).or(z.string().min(1)),
  ourScore: z.number().int().min(0).optional(),
  theirScore: z.number().int().min(0).optional(),
});

export const MatchUpdateSchema = MatchBaseSchema.extend({
  date: z.string().min(1).optional(),
  opponentId: z.string().min(1).optional(),
  ourScore: z.number().int().min(0).nullable().optional(),
  theirScore: z.number().int().min(0).nullable().optional(),
});

export const PlayerStatsEntrySchema = z.object({
  userId: z.string().optional(),
  childId: z.string().optional(),
  points: z.number().int().min(0).max(999).optional(),
  baskets: z.number().int().min(0).max(999).optional(),
  fouls: z.number().int().min(0).max(5).optional(),
  assists: z.number().int().min(0).max(999).optional(),
  rebounds: z.number().int().min(0).max(999).optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (s) => !!(s.userId) !== !!(s.childId),
  { message: "Esattamente uno tra userId e childId è richiesto" }
);

export const PlayerStatsBatchSchema = z.array(PlayerStatsEntrySchema).max(50);

export const CallupsSchema = z.object({
  userIds: z.array(z.string().min(1)).max(100).default([]),
  childIds: z.array(z.string().min(1)).max(100).default([]),
});
