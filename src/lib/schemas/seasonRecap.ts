import { z } from "zod";
import { parseSeasonParam } from "@/lib/season/seasonUtils";

/** "Pubblica i riepiloghi della stagione" (UX-60). */
export const SeasonRecapPublishSchema = z.object({
  season: z
    .string()
    .refine((v) => parseSeasonParam(v) !== null, { message: "Stagione non valida" }),
  /** Avvisa chi ha dei dati nella stagione: accesa di default, come per eventi e news. */
  notify: z.boolean().default(true),
});
