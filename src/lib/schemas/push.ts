import { z } from "zod";
import { PUSH_STAT_TYPE } from "@/lib/notifications/pushStatTypes";

/** Notifica di prova: l'endpoint del dispositivo che la chiede. */
export const PushTestSchema = z.object({
  endpoint: z.string().url().max(1000),
});

/**
 * Notifica toccata, dal service worker (UX-55): solo il tipo, nient'altro.
 * Tipi validati contro `PUSH_STAT_TYPE`, così un client non crea righe a caso.
 */
export const PushOpenedSchema = z.object({
  type: z.enum(PUSH_STAT_TYPE),
});
