import { prisma } from "@/lib/db";
import { familyRegistrationWhere } from "@/lib/guardians";
import type { FamilyRegistration } from "@/lib/trainingTeams";

/** Iscrizioni di famiglia per allenamento, prima la propria. */
export type FamilyRegsBySession = Record<string, FamilyRegistration[]>;

/**
 * Le iscrizioni di chi guarda e dei suoi figli negli allenamenti dati, per
 * mostrare nelle liste in che squadra è ciascuno (`familyTeams`). "Iscritto"
 * resta solo chi guarda: `self`.
 */
export async function loadFamilyRegistrations(
  userId: string,
  sessionIds: string[]
): Promise<FamilyRegsBySession> {
  if (sessionIds.length === 0) return {};
  const rows = await prisma.registration.findMany({
    where: { sessionId: { in: sessionIds }, ...familyRegistrationWhere(userId) },
    select: {
      id: true,
      sessionId: true,
      name: true,
      userId: true,
      child: { select: { userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const out: FamilyRegsBySession = {};
  for (const r of rows) {
    // Propria anche se sta sulla propria scheda figlio collegata.
    const entry = {
      id: r.id,
      name: r.name,
      self: r.userId === userId || r.child?.userId === userId,
    };
    (out[r.sessionId] ??= []).push(entry);
  }
  for (const list of Object.values(out)) list.sort((a, b) => Number(b.self) - Number(a.self));
  return out;
}

/** Gli allenamenti a cui è iscritto chi guarda (non solo un figlio). */
export function selfRegisteredSessionIds(regs: FamilyRegsBySession): string[] {
  return Object.entries(regs)
    .filter(([, list]) => list.some((r) => r.self))
    .map(([sessionId]) => sessionId);
}
