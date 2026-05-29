import { z } from "zod";

const OpposingTeamBaseSchema = z.object({
  city: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  colors: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const OpposingTeamCreateSchema = OpposingTeamBaseSchema.extend({
  name: z.string().min(1, "Nome obbligatorio").max(200),
  city: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  website: z.string().max(500).optional(),
  colors: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const OpposingTeamUpdateSchema = OpposingTeamBaseSchema.extend({
  name: z.string().min(1, "Il nome non può essere vuoto").max(200).optional(),
  /** Stima TrueSkill per-giocatore (μ medio). null = azzera la stima. */
  ratingMu: z.number().min(0).max(100).nullable().optional(),
});
