import { z } from "zod";

const seasonRegex = /^\d{4}-\d{2}$/;
const colorRegex = /^#[0-9A-Fa-f]{6}$/;

const CompetitiveTeamBaseSchema = z.object({
  championship: z.string().max(200).nullable().optional(),
  color: z.string().regex(colorRegex, "Colore in formato hex (#RRGGBB)").nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

// Fix: PUT senza questo schema permetteva name = "" (stringa vuota)
export const CompetitiveTeamCreateSchema = CompetitiveTeamBaseSchema.extend({
  name: z.string().min(1, "Nome obbligatorio").max(200),
  season: z.string().regex(seasonRegex, 'Stagione in formato YYYY-YY (es. "2025-26")'),
  championship: z.string().max(200).optional(),
  color: z.string().regex(colorRegex, "Colore in formato hex (#RRGGBB)").optional(),
  description: z.string().max(2000).optional(),
});

export const CompetitiveTeamUpdateSchema = CompetitiveTeamBaseSchema.extend({
  name: z.string().min(1, "Il nome non può essere vuoto").max(200).optional(),
  season: z.string().regex(seasonRegex, 'Stagione in formato YYYY-YY (es. "2025-26")').optional(),
});
