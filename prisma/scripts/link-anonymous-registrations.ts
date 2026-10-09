// Collega le iscrizioni anonime all'account che ha la stessa email.
//
// Chi si iscrive a un allenamento senza aver fatto l'accesso (sessione
// scaduta, altro browser, app installata) lascia un'iscrizione anonima, con
// l'email scritta a mano in `anonymousEmail`. L'unico aggancio dall'app è la
// card "sono io" del profilo, che confronta il nome e non l'email: se il nome
// non è identico, l'iscrizione resta anonima anche se l'account esiste.
//
// Esecuzione (di default NON scrive: mostra solo cosa farebbe):
//   npx tsx prisma/scripts/link-anonymous-registrations.ts
//   npx tsx prisma/scripts/link-anonymous-registrations.ts --email=a@x.it --email=b@y.it
//   npx tsx prisma/scripts/link-anonymous-registrations.ts --apply
//
// Idempotente: tocca solo le iscrizioni ancora anonime. Salta, e lo dice,
// quelle che non si possono collegare: nessun account con quell'email, oppure
// la persona è già iscritta a quell'allenamento con l'account o tramite il
// genitore (vincolo sessionId + userId). Non cambia nome, ruolo né presenza.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const onlyEmails = process.argv
  .filter((a) => a.startsWith("--email="))
  .map((a) => a.slice("--email=".length).trim().toLowerCase())
  .filter(Boolean);

const TAG = "[link-anon]";

async function main() {
  if (!apply) console.log(`${TAG} PROVA: nessuna scrittura sul DB (aggiungi --apply per scrivere)`);

  const regs = await prisma.registration.findMany({
    where: { userId: null, childId: null, anonymousEmail: { not: null } },
    select: {
      id: true,
      name: true,
      anonymousEmail: true,
      sessionId: true,
      session: { select: { date: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byEmail = new Map<string, typeof regs>();
  for (const r of regs) {
    const email = r.anonymousEmail?.trim().toLowerCase();
    if (!email) continue;
    if (onlyEmails.length > 0 && !onlyEmails.includes(email)) continue;
    byEmail.set(email, [...(byEmail.get(email) ?? []), r]);
  }
  console.log(`${TAG} email con iscrizioni anonime: ${byEmail.size}`);

  let linked = 0;
  let skipped = 0;
  const noAccount: string[] = [];

  for (const [email, group] of byEmail) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true, appRole: true, childAccount: { select: { id: true } } },
    });
    if (!user) {
      noAccount.push(`${email} (${group.length})`);
      skipped += group.length;
      continue;
    }
    console.log(`\n${email} → "${user.name ?? "senza nome"}" (${user.appRole}, ${user.id})`);

    for (const r of group) {
      const day = r.session.date.toISOString().slice(0, 10);
      const clash = await prisma.registration.findFirst({
        where: {
          sessionId: r.sessionId,
          OR: [
            { userId: user.id },
            ...(user.childAccount ? [{ childId: user.childAccount.id }] : []),
          ],
        },
        select: { id: true },
      });
      if (clash) {
        console.log(
          `  SALTATA ${day} "${r.name}" (${r.id}): già iscritto con l'account (${clash.id})`
        );
        skipped++;
        continue;
      }
      console.log(`  collega ${day} "${r.name}" (${r.id})`);
      if (apply) {
        // `userId: null` nel where: se nel frattempo qualcuno l'ha collegata, non la tocca.
        await prisma.registration.updateMany({
          where: { id: r.id, userId: null, childId: null },
          data: { userId: user.id },
        });
      }
      linked++;
    }
  }

  console.log(`\n${TAG} ${apply ? "collegate" : "da collegare"}: ${linked} · saltate: ${skipped}`);
  if (noAccount.length > 0) {
    console.log(`${TAG} nessun account con questa email: ${noAccount.join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
