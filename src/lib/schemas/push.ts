import { z } from "zod";

/** Notifica di prova: l'endpoint del dispositivo che la chiede. */
export const PushTestSchema = z.object({
  endpoint: z.string().url().max(1000),
});
