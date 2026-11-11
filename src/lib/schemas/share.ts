import { z } from "zod";
import { SHARE_CAMPAIGNS, SHARE_SOURCES } from "@/lib/shareLinks";

/**
 * Visita arrivata da un bottone "Condividi" (UX-56): solo campagna e fonte,
 * dall'elenco chiuso, così un client non crea righe a caso.
 */
export const ShareVisitSchema = z.object({
  campaign: z.enum(SHARE_CAMPAIGNS),
  source: z.enum(SHARE_SOURCES),
});
