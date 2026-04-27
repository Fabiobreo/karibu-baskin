import { z } from "zod";

// [CLAUDE - 09:00] Schema Zod per creazione/modifica squadre agonistiche
// Fix: PUT senza questo schema permetteva name = "" (stringa vuota)
export const CompetitiveTeamCreateSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(200),
  season: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Stagione in formato YYYY-YY (es. "2025-26")'),
  championship: z.string().max(200).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colore in formato hex (#RRGGBB)")
    .optional(),
  description: z.string().max(2000).optional(),
});

export const CompetitiveTeamUpdateSchema = z.object({
  name: z.string().min(1, "Il nome non può essere vuoto").max(200).optional(),
  season: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Stagione in formato YYYY-YY (es. "2025-26")')
    .optional(),
  championship: z.string().max(200).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Colore in formato hex (#RRGGBB)")
    .nullable()
    .optional(),
  description: z.string().max(2000).nullable().optional(),
});
