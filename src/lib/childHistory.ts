import type { Prisma } from "@prisma/client";

/**
 * Passaggio completo dello storico sportivo da una scheda figlio all'account
 * che il ragazzo si è fatto dopo (`Child.userId`).
 *
 * Dopo il collegamento l'atleta è l'account: squadra, convocazioni,
 * disponibilità, statistiche, MVP, traguardi, iscrizioni agli allenamenti,
 * storico del ruolo e del livello passano a lui. La scheda resta come legame
 * con i genitori, vuota come quelle che nascono già collegate. Senza questo
 * passaggio la stessa persona avrebbe due metà: l'account senza squadra e la
 * scheda con lo storico.
 *
 * Le risposte agli eventi restano dove sono: lì la riga canonica di chi ha
 * scheda e account è quella della scheda (vedi `@/lib/eventRsvp`).
 *
 * Solo import relativi o di tipo: lo usa anche lo script
 * `prisma/scripts/migrate-linked-children.ts`.
 */

interface SnapshotRef {
  userId?: string | null;
  childId?: string | null;
  name: string;
}

/**
 * Riscrive lo snapshot congelato di una partitella (`rostersSnapshot`): dove
 * c'è la scheda mette l'account. Il livello si ricalcola rileggendo questi
 * snapshot, quindi senza riscriverli resterebbe diviso fra le due identità.
 * `null` se non c'è niente da cambiare.
 */
export function rewriteSnapshotRefs(
  snapshot: unknown,
  childId: string,
  userId: string
): { teamA: SnapshotRef[]; teamB: SnapshotRef[] } | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const s = snapshot as { teamA?: unknown; teamB?: unknown };
  if (!Array.isArray(s.teamA) || !Array.isArray(s.teamB)) return null;
  const teams = [s.teamA as SnapshotRef[], s.teamB as SnapshotRef[]];
  if (!teams.some((t) => t.some((p) => p.childId === childId))) return null;

  // Se l'account è già nello snapshot (iscritto due volte), la scheda si toglie.
  const accountAlreadyIn = teams.some((t) => t.some((p) => p.userId === userId));
  const rewrite = (team: SnapshotRef[]) =>
    team.flatMap((p) => {
      if (p.childId !== childId) return [p];
      return accountAlreadyIn ? [] : [{ ...p, userId, childId: null }];
    });
  return { teamA: rewrite(teams[0]), teamB: rewrite(teams[1]) };
}

export interface MovedHistory {
  registrations: number;
  teamMemberships: number;
  matchStats: number;
  callups: number;
  mvps: number;
  availabilities: number;
  badges: number;
  snapshots: number;
}

export function movedTotal(m: MovedHistory): number {
  return Object.values(m).reduce((sum, n) => sum + n, 0);
}

/**
 * Sposta lo storico dentro una transazione. Idempotente: su una scheda già
 * svuotata non fa nulla. Dove account e scheda hanno la stessa riga (stesso
 * allenamento, stessa partita, stessa stagione di squadra, stesso traguardo)
 * resta quella della scheda, che è lo storico vero.
 *
 * Dopo la transazione chi chiama deve rilanciare `recomputeRatings`.
 */
export async function moveChildHistoryToUser(
  tx: Prisma.TransactionClient,
  childId: string,
  userId: string
): Promise<MovedHistory> {
  const from = { childId };
  const to = { childId: null, userId };

  // Allenamenti
  const sessions = await tx.registration.findMany({ where: from, select: { sessionId: true } });
  await tx.registration.deleteMany({
    where: { userId, sessionId: { in: sessions.map((r) => r.sessionId) } },
  });
  const registrations = await tx.registration.updateMany({ where: from, data: to });

  // Squadre: una per stagione, quindi il confronto è sulla stagione.
  const teams = await tx.teamMembership.findMany({
    where: from,
    select: { team: { select: { season: true } } },
  });
  await tx.teamMembership.deleteMany({
    where: { userId, team: { season: { in: teams.map((m) => m.team.season) } } },
  });
  const teamMemberships = await tx.teamMembership.updateMany({ where: from, data: to });

  // Partite: statistiche, convocazioni, MVP, disponibilità (una riga per partita).
  const stats = await tx.playerMatchStats.findMany({ where: from, select: { matchId: true } });
  await tx.playerMatchStats.deleteMany({
    where: { userId, matchId: { in: stats.map((r) => r.matchId) } },
  });
  const matchStats = await tx.playerMatchStats.updateMany({ where: from, data: to });

  const calls = await tx.matchCallup.findMany({ where: from, select: { matchId: true } });
  await tx.matchCallup.deleteMany({
    where: { userId, matchId: { in: calls.map((r) => r.matchId) } },
  });
  const callups = await tx.matchCallup.updateMany({ where: from, data: to });

  const mvpRows = await tx.matchMvp.findMany({ where: from, select: { matchId: true } });
  await tx.matchMvp.deleteMany({
    where: { userId, matchId: { in: mvpRows.map((r) => r.matchId) } },
  });
  const mvps = await tx.matchMvp.updateMany({ where: from, data: to });

  const avail = await tx.matchAvailability.findMany({ where: from, select: { matchId: true } });
  await tx.matchAvailability.deleteMany({
    where: { userId, matchId: { in: avail.map((r) => r.matchId) } },
  });
  const availabilities = await tx.matchAvailability.updateMany({ where: from, data: to });

  // Traguardi
  const earned = await tx.earnedBadge.findMany({ where: from, select: { badgeId: true } });
  await tx.earnedBadge.deleteMany({
    where: { userId, badgeId: { in: earned.map((b) => b.badgeId) } },
  });
  const badges = await tx.earnedBadge.updateMany({ where: from, data: to });

  // Storico del ruolo e del livello: nessun vincolo di unicità.
  await tx.sportRoleHistory.updateMany({ where: from, data: to });
  await tx.ratingUpdate.updateMany({ where: from, data: to });

  // Snapshot delle partitelle (JSON): la scheda diventa l'account.
  const results = await tx.trainingMatchResult.findMany({
    select: { id: true, rostersSnapshot: true },
  });
  let snapshots = 0;
  for (const r of results) {
    const rewritten = rewriteSnapshotRefs(r.rostersSnapshot, childId, userId);
    if (!rewritten) continue;
    await tx.trainingMatchResult.update({
      where: { id: r.id },
      data: { rostersSnapshot: rewritten as unknown as Prisma.InputJsonValue },
    });
    snapshots++;
  }

  // La scheda diventa il solo legame con i genitori: niente profilo pubblico
  // suo (la persona non compare due volte) e niente livello. L'indirizzo del
  // suo vecchio profilo passa all'account, se è libero, così i link già
  // condivisi continuano a funzionare e mostrano tutto lo storico.
  const [child, user] = await Promise.all([
    tx.child.findUnique({
      where: { id: childId },
      select: { slug: true, ratingMu: true, ratingSigma: true },
    }),
    tx.user.findUnique({ where: { id: userId }, select: { slug: true, ratingMu: true } }),
  ]);
  if (child && user) {
    const slugFree =
      !!child.slug &&
      child.slug !== user.slug &&
      !(await tx.user.findUnique({ where: { slug: child.slug }, select: { id: true } }));
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(slugFree && { slug: child.slug }),
        ...(user.ratingMu === null &&
          child.ratingMu !== null && {
            ratingMu: child.ratingMu,
            ratingSigma: child.ratingSigma,
          }),
      },
    });
    if (child.slug || child.ratingMu !== null) {
      await tx.child.update({
        where: { id: childId },
        data: { slug: null, ratingMu: null, ratingSigma: null },
      });
    }
  }

  return {
    registrations: registrations.count,
    teamMemberships: teamMemberships.count,
    matchStats: matchStats.count,
    callups: callups.count,
    mvps: mvps.count,
    availabilities: availabilities.count,
    badges: badges.count,
    snapshots,
  };
}
