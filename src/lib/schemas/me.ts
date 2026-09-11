import { z } from "zod";

/**
 * Nome e cognome inseriti dall'utente stesso (magic link: niente profilo
 * Google da cui leggerli). Spazi ripuliti prima dei controlli, così "  Mario
 * Rossi " e "Mario   Rossi" diventano lo stesso nome.
 */
export const PersonNameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Il nome è troppo corto")
      .max(60, "Il nome è troppo lungo (massimo 60 caratteri)")
  );

export const MeUpdateSchema = z.object({
  customImage: z.string().url().nullable().optional(),
  name: PersonNameSchema.optional(),
});
