import { z } from "zod";
import { LINEUP_SIZE } from "@/lib/rating/lineupRules";
import { QUARTERS } from "@/lib/games/sfida";

/**
 * Richiesta di simulazione sfida. Solo chiavi dei giocatori e nonce: il
 * rating non viaggia mai dal client (vedi `runSimulation`).
 *
 * Il tetto sulle formazioni è largo rispetto a `LINEUP_SIZE`: la validità
 * Baskin vera la decide il server, qui si limita solo la dimensione dell'input.
 */
const keys = z
  .array(z.string().max(80))
  .min(1)
  .max(LINEUP_SIZE * 2);

/** Sei contro sei: una formazione per lato. */
export const SimulateSchema = z.object({
  mode: z.literal("six").optional(),
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

/** Partita intera (UX-69): le formazioni dei 4 tempi per lato. */
export const SimulateFullSchema = z.object({
  mode: z.literal("full"),
  qa: z.array(keys).length(QUARTERS),
  qb: z.array(keys).length(QUARTERS),
  nonce: z.number().int().min(0).max(1_000_000),
});

export type SimulateFullInput = z.infer<typeof SimulateFullSchema>;

export const SimulateAnySchema = z.union([SimulateFullSchema, SimulateSchema]);
