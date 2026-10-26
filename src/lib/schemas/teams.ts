import { z } from "zod";

const BibKeySchema = z.enum(["teamA", "teamB", "teamC"]);

/**
 * POST /api/teams/[sessionId]: `generate` rifà le squadre da capo, `add`
 * aggiunge chi si è iscritto dopo senza spostare nessuno (UX-54).
 */
export const TeamsPostSchema = z.object({
  mode: z.enum(["generate", "add"]).default("generate"),
  numTeams: z.union([z.literal(2), z.literal(3)]).default(2),
});

/**
 * POST /api/teams/[sessionId]/notify: l'assegnazione di quando l'editor è
 * stato aperto (id iscrizione → squadra). Il server la confronta con le
 * squadre salvate e avvisa chi è entrato o ha cambiato squadra.
 */
export const TeamsNotifySchema = z.object({
  before: z.record(z.string().min(1).max(100), BibKeySchema),
});
