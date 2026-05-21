// Backfill del flag `isLoan` su PlayerMatchStats e MatchCallup.
//
// Per ogni riga: confronta il giocatore (userId o childId) con i
// TeamMembership della squadra che ha disputato la partita per quella
// stagione. Se il giocatore NON è membro, imposta isLoan = true.
//
// Esecuzione una tantum:
//   npx tsx prisma/scripts/backfill-loans.ts
//
// Idempotente: rieseguendolo, ricalcola e aggiorna solo le righe il cui
// valore sarebbe diverso.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    select: { id: true, teamId: true, team: { select: { season: true } } },
  });
  console.log(`[backfill-loans] partite da processare: ${matches.length}`);

  let statsUpdated = 0;
  let callupsUpdated = 0;

  for (const m of matches) {
    const memberships = await prisma.teamMembership.findMany({
      where: { team: { id: m.teamId, season: m.team.season } },
      select: { userId: true, childId: true },
    });
    const memberUsers = new Set(memberships.map((x) => x.userId).filter((x): x is string => !!x));
    const memberChildren = new Set(
      memberships.map((x) => x.childId).filter((x): x is string => !!x)
    );

    // Stats
    const stats = await prisma.playerMatchStats.findMany({
      where: { matchId: m.id },
      select: { id: true, userId: true, childId: true, isLoan: true },
    });
    for (const s of stats) {
      const expected = s.userId
        ? !memberUsers.has(s.userId)
        : s.childId
          ? !memberChildren.has(s.childId)
          : false;
      if (expected !== s.isLoan) {
        await prisma.playerMatchStats.update({
          where: { id: s.id },
          data: { isLoan: expected },
        });
        statsUpdated++;
      }
    }

    // Callups
    const callups = await prisma.matchCallup.findMany({
      where: { matchId: m.id },
      select: { id: true, userId: true, childId: true, isLoan: true },
    });
    for (const c of callups) {
      const expected = c.userId
        ? !memberUsers.has(c.userId)
        : c.childId
          ? !memberChildren.has(c.childId)
          : false;
      if (expected !== c.isLoan) {
        await prisma.matchCallup.update({
          where: { id: c.id },
          data: { isLoan: expected },
        });
        callupsUpdated++;
      }
    }
  }

  console.log(`[backfill-loans] PlayerMatchStats aggiornate: ${statsUpdated}`);
  console.log(`[backfill-loans] MatchCallup aggiornate: ${callupsUpdated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
