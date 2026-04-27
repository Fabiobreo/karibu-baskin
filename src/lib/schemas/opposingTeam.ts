import { z } from "zod";

export const OpposingTeamCreateSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(200),
  city: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const OpposingTeamUpdateSchema = z.object({
  name: z.string().min(1, "Il nome non può essere vuoto").max(200).optional(),
  city: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
