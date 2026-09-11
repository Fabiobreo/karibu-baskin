import { z } from "zod";
import { LINEUP_SIZE } from "@/lib/rating/lineupRules";

/**
 * Richiesta di simulazione sfida. Solo chiavi dei giocatori e nonce: il
 * rating non viaggia mai dal client (vedi `runSimulation`).
 *
 * Il tetto sulle formazioni è largo rispetto a `LINEUP_SIZE`: la validità
 * Baskin vera la decide il server, qui si limita solo la dimensione dell'input.
 */
export const SimulateSchema = z.object({
  a: z
    .array(z.string().max(80))
    .min(1)
    .max(LINEUP_SIZE * 2),
  b: z
    .array(z.string().max(80))
    .min(1)
    .max(LINEUP_SIZE * 2),
  nonce: z.number().int().min(0).max(1_000_000),
});

export type SimulateInput = z.infer<typeof SimulateSchema>;
