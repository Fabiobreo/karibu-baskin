// Passa all'account lo storico sportivo delle schede figlio già collegate.
//
// Dal collegamento in poi l'atleta è l'account: squadra, convocazioni,
// disponibilità, statistiche, MVP, traguardi, iscrizioni e livello stanno lì
// (vedi src/lib/childHistory.ts). I collegamenti nuovi lo fanno da soli; questo
// script serve per quelli fatti prima, dove lo storico era rimasto sulla scheda
// e la persona risultava a metà (account senza squadra, o due volte in rosa).
//
// Esecuzione (di default NON scrive: mostra solo cosa farebbe):
//   npx tsx prisma/scripts/migrate-linked-children.ts
//   npx tsx prisma/scripts/migrate-linked-children.ts --apply
//
// Idempotente: una scheda già svuotata non viene toccata. Dove account e scheda
// hanno la stessa riga (stesso allenamento, stessa partita, stessa stagione di
// squadra) resta quella della scheda. Alla fine ricalcola il livello di tutti.

import { PrismaClient } from "@prisma/client";
import { moveChildHistoryToUser, movedTotal } from "../../src/lib/childHistory";
import { recomputeRatings } from "../../src/lib/rating/ratingEngine";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const TAG = "[linked-children]";

async function main() {
  if (!apply) console.log(`${TAG} PROVA: nessuna scrittura sul DB (aggiungi --apply per scrivere)`);

  const linked = await prisma.child.findMany({
    where: { userId: { not: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true,
      user: { select: { email: true } },
      _count: {
        select: {
          registrations: true,
          teamMemberships: true,
          matchStats: true,
          callups: true,
          matchMvps: true,
          matchAvailabilities: true,
          earnedBadges: true,
          sportRoleHistory: true,
          ratingUpdates: true,
        },
      },
    },
  });
  console.log(`${TAG} schede collegate a un account: ${linked.length}`);

  let pending = 0;
  let done = 0;
  for (const c of linked) {
    const rows = Object.values(c._count).reduce((sum, n) => sum + n, 0);
    if (rows === 0 && !c.slug) continue;
    pending++;
    console.log(`\n"${c.name}" (${c.id}) → ${c.user?.email} (${c.userId})`);
    console.log(`  sulla scheda: ${JSON.stringify(c._count)}${c.slug ? ` · slug ${c.slug}` : ""}`);
    if (!apply || !c.userId) continue;
    const userId = c.userId;
    const moved = await prisma.$transaction((tx) => moveChildHistoryToUser(tx, c.id, userId), {
      timeout: 60_000,
      maxWait: 15_000,
    });
    console.log(`  spostato: ${JSON.stringify(moved)} (${movedTotal(moved)} righe)`);
    done++;
  }

  if (apply && done > 0) {
    console.log(`\n${TAG} ricalcolo del livello…`);
    await recomputeRatings(prisma);
  }
  console.log(
    `\n${TAG} ${apply ? `schede passate all'account: ${done}` : `schede da passare all'account: ${pending}`}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
