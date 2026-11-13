import { revalidateTag } from "next/cache";
import { logAudit, type AuditAction } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { GAME_SETTINGS_TAG } from "@/lib/games/loadGameSettings";

/**
 * Dopo ogni scrittura dei quiz dal pannello (UX-67): la cache di giochi e
 * domande si svuota subito (menu, `/giochi` e le partite leggono da lì) e
 * l'azione finisce nel registro attività.
 */
export function afterQuizWrite(input: {
  actorId: string;
  action: AuditAction;
  targetType: "Quiz" | "QuizQuestion";
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  revalidateTag(GAME_SETTINGS_TAG, { expire: 0 });
  inBackground(logAudit(input), "audit quiz");
}
