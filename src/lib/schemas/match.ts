import { z } from "zod";

export const MatchCreateSchema = z.object({
  teamId: z.string().min(1),
  opponentId: z.string().min(1),
  date: z.string().datetime({ offset: true }).or(z.string().min(1)),
  isHome: z.boolean().optional(),
  venue: z.string().max(200).optional(),
  matchType: z.enum(["LEAGUE", "TOURNAMENT", "FRIENDLY"]).optional(),
  ourScore: z.number().int().min(0).optional(),
  theirScore: z.number().int().min(0).optional(),
  result: z.enum(["WIN", "LOSS", "DRAW"]).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  matchday: z.number().int().min(1).nullable().optional(),
  groupId: z.string().nullable().optional(),
});

export const MatchUpdateSchema = z.object({
  date: z.string().min(1).optional(),
  isHome: z.boolean().optional(),
  venue: z.string().max(200).optional(),
  matchType: z.enum(["LEAGUE", "TOURNAMENT", "FRIENDLY"]).optional(),
  ourScore: z.number().int().min(0).nullable().optional(),
  theirScore: z.number().int().min(0).nullable().optional(),
  result: z.enum(["WIN", "LOSS", "DRAW"]).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  opponentId: z.string().min(1).optional(),
  matchday: z.number().int().min(1).nullable().optional(),
  groupId: z.string().nullable().optional(),
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
