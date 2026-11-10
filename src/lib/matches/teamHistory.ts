// Storico delle squadre di un giocatore. TeamMembership dice dov'è adesso; chi
// cambia squadra perde la riga vecchia, che finisce in PastTeamMembership con
// il suo periodo. I calcoli che guardano indietro (presenze nelle convocazioni,
// prestiti) chiedono qui "in che squadra era quel giorno?".

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface TeamPeriod {
  teamId: string;
  /** null = da sempre (o non si sa da quando) */
  from: Date | null;
  /** null = ancora in squadra */
  to: Date | null;
}

/** Era nella squadra `teamId` il giorno `date`? */
export function wasMemberAt(periods: TeamPeriod[], teamId: string, date: Date): boolean {
  return periods.some(
    (p) =>
      p.teamId === teamId && (p.from == null || date >= p.from) && (p.to == null || date < p.to)
  );
}

interface CurrentRow {
  teamId: string;
  createdAt: Date;
  team: { season: string };
}
interface PastRow {
  teamId: string;
  startedAt: Date | null;
  endedAt: Date;
  team: { season: string };
}

/**
 * Periodi di una persona dalle sue righe attuali e passate. Una squadra attuale
 * vale da sempre, salvo per chi nella stessa stagione ha già lasciato una
 * squadra: lì comincia quando ci è entrato, così gli allenamenti della squadra nuova di prima del cambio
 * non gli contano come assenze. (Non si usa sempre `createdAt`: le rose di
 * inizio stagione si compilano spesso dopo i primi allenamenti.)
 */
export function teamPeriods(current: CurrentRow[], past: PastRow[]): TeamPeriod[] {
  return [
    ...current.map((m) => ({
      teamId: m.teamId,
      from: past.some((p) => p.team.season === m.team.season) ? m.createdAt : null,
      to: null,
    })),
    ...past.map((p) => ({ teamId: p.teamId, from: p.startedAt, to: p.endedAt })),
  ];
}

/**
 * Registra che una persona lascia una squadra, nella stessa transazione in cui
 * se ne cancella la riga.
 */
export async function recordTeamExit(
  tx: Prisma.TransactionClient,
  membership: { teamId: string; userId: string | null; childId: string | null; createdAt: Date },
  endedAt: Date = new Date()
): Promise<void> {
  await tx.pastTeamMembership.create({
    data: {
      teamId: membership.teamId,
      userId: membership.userId,
      childId: membership.childId,
      startedAt: membership.createdAt,
      endedAt,
    },
  });
}

/** Periodi per ogni persona, con chiave `user-<id>` / `child-<id>`. */
export async function loadTeamPeriods(
  userIds: string[],
  childIds: string[]
): Promise<Map<string, TeamPeriod[]>> {
  const who = [
    ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
    ...(childIds.length > 0 ? [{ childId: { in: childIds } }] : []),
  ];
  const result = new Map<string, TeamPeriod[]>();
  if (who.length === 0) return result;

  const [current, past] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { OR: who },
      select: {
        teamId: true,
        userId: true,
        childId: true,
        createdAt: true,
        team: { select: { season: true } },
      },
    }),
    prisma.pastTeamMembership.findMany({
      where: { OR: who },
      select: {
        teamId: true,
        userId: true,
        childId: true,
        startedAt: true,
        endedAt: true,
        team: { select: { season: true } },
      },
    }),
  ]);

  const key = (r: { userId: string | null; childId: string | null }) =>
    r.userId ? `user-${r.userId}` : `child-${r.childId}`;
  const keys = new Set([...current.map(key), ...past.map(key)]);
  for (const k of keys) {
    result.set(
      k,
      teamPeriods(
        current.filter((r) => key(r) === k),
        past.filter((r) => key(r) === k)
      )
    );
  }
  return result;
}
