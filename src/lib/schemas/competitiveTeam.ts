import { z } from "zod";
import { TEAM_TINTS } from "@/lib/teamColors";

const seasonRegex = /^\d{4}-\d{2}$/;
// Colore = chiave di una tinta della palette (UX-29): lo staff sceglie solo fra
// quelle. I vecchi hex restano leggibili, `teamTint()` li porta sulla palette.
const teamColor = z.enum(TEAM_TINTS, {
  error: "Colore non valido: scegli una tinta della palette",
});

const CompetitiveTeamBaseSchema = z.object({
  championship: z.string().max(200).nullable().optional(),
  color: teamColor.nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

// Fix: PUT senza questo schema permetteva name = "" (stringa vuota)
export const CompetitiveTeamCreateSchema = CompetitiveTeamBaseSchema.extend({
  name: z.string().min(1, "Nome obbligatorio").max(200),
  season: z.string().regex(seasonRegex, 'Stagione in formato YYYY-YY (es. "2025-26")'),
  championship: z.string().max(200).optional(),
  color: teamColor.optional(),
  description: z.string().max(2000).optional(),
});

export const CompetitiveTeamUpdateSchema = CompetitiveTeamBaseSchema.extend({
  name: z.string().min(1, "Il nome non può essere vuoto").max(200).optional(),
  season: z.string().regex(seasonRegex, 'Stagione in formato YYYY-YY (es. "2025-26")').optional(),
});
