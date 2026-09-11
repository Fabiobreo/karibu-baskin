import { z } from "zod";

/** Varianti di ruolo che il questionario può suggerire (vedi SPORT_ROLE_VARIANT_LABELS). */
export const SPORT_ROLE_VARIANTS = ["S", "T", "P", "R"] as const;

/**
 * Ruolo Baskin suggerito dal questionario, salvato dall'utente per sé stesso.
 * Resta un suggerimento finché lo staff non lo conferma come `sportRole`.
 */
export const SportRoleSuggestionSchema = z.object({
  role: z.number().int().min(1).max(5),
  variant: z.enum(SPORT_ROLE_VARIANTS).nullable().optional(),
});

export type SportRoleSuggestion = z.infer<typeof SportRoleSuggestionSchema>;
