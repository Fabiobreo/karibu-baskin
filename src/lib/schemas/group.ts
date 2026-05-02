import { z } from "zod";

export const GroupCreateSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(200),
  season: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Stagione in formato YYYY-YY (es. "2025-26")'),
  championship: z.string().max(200).optional(),
  teamId: z.string().min(1, "teamId obbligatorio"),
});

export const GroupUpdateSchema = z.object({
  name: z.string().min(1, "Il nome non può essere vuoto").max(200).optional(),
  championship: z.string().max(200).nullable().optional(),
});

export const GroupMatchCreateSchema = z
  .object({
    homeTeamId: z.string().min(1, "homeTeamId obbligatorio"),
    awayTeamId: z.string().min(1, "awayTeamId obbligatorio"),
    matchday: z.number().int().min(1).nullable().optional(),
    date: z.string().nullable().optional(),
    homeScore: z.number().int().min(0).nullable().optional(),
    awayScore: z.number().int().min(0).nullable().optional(),
  })
  .refine((b) => b.homeTeamId !== b.awayTeamId, {
    message: "Le squadre devono essere diverse",
  });

export const GroupMatchUpdateSchema = z
  .object({
    homeTeamId: z.string().min(1).optional(),
    awayTeamId: z.string().min(1).optional(),
    matchday: z.number().int().min(1).nullable().optional(),
    date: z.string().nullable().optional(),
    homeScore: z.number().int().min(0).nullable().optional(),
    awayScore: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (b) => b.homeTeamId === undefined || b.awayTeamId === undefined || b.homeTeamId !== b.awayTeamId,
    { message: "Le squadre devono essere diverse" },
  );
