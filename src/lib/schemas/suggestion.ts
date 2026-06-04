import { z } from "zod";

export const SUGGESTION_CATEGORIES = ["APP", "ALLENAMENTI", "PARTITE_EVENTI", "ALTRO"] as const;
export const SUGGESTION_STATUSES = ["NUOVO", "LETTO", "ARCHIVIATO"] as const;

export const SuggestionCreateSchema = z.object({
  category: z.enum(SUGGESTION_CATEGORIES, { message: "Categoria non valida" }),
  message: z
    .string()
    .trim()
    .min(5, "Scrivi almeno 5 caratteri")
    .max(2000, "Il messaggio è troppo lungo (max 2000 caratteri)"),
});

export const SuggestionUpdateSchema = z.object({
  status: z.enum(SUGGESTION_STATUSES, { message: "Stato non valido" }),
});

export const SuggestionNoteCreateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "La nota non può essere vuota")
    .max(1000, "Nota troppo lunga (max 1000 caratteri)"),
});

export type SuggestionCreateInput = z.infer<typeof SuggestionCreateSchema>;
export type SuggestionUpdateInput = z.infer<typeof SuggestionUpdateSchema>;
export type SuggestionNoteCreateInput = z.infer<typeof SuggestionNoteCreateSchema>;
