// Backfill dello `slug` mancante su User e Child.
//
// Fino ad ora lo slug veniva generato solo al primo accesso (callback signIn):
// un giocatore pre-creato dall'admin e mai loggato restava senza, e tutti i
// link cadevano sul fallback `/giocatori/<id>` (oltre a sparire dalla sitemap,
// che usa `slug` senza fallback).
//
// Esecuzione una tantum:
//   npx tsx prisma/scripts/backfill-player-slugs.ts
//   npx tsx prisma/scripts/backfill-player-slugs.ts --dry-run
//
// Idempotente: tocca solo le righe con slug nullo o vuoto. Non riscrive mai
// uno slug esistente, così gli URL già condivisi restano validi.

import { PrismaClient } from "@prisma/client";
import { generateUserSlug, generateChildSlug } from "../../src/lib/slugUtils";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (dryRun) console.log("[backfill-slugs] DRY RUN: nessuna scrittura sul DB");

  const users = await prisma.user.findMany({
    where: { OR: [{ slug: null }, { slug: "" }] },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`[backfill-slugs] utenti senza slug: ${users.length}`);

  let usersDone = 0;
  const usersSkipped: string[] = [];
  for (const u of users) {
    if (!u.name?.trim()) {
      usersSkipped.push(u.id);
      continue;
    }
    const slug = await generateUserSlug(u.name);
    if (!slug) {
      usersSkipped.push(u.id);
      continue;
    }
    console.log(`  user ${u.id} "${u.name}" → ${slug}`);
    if (!dryRun) await prisma.user.update({ where: { id: u.id }, data: { slug } });
    usersDone++;
  }

  const children = await prisma.child.findMany({
    where: { OR: [{ slug: null }, { slug: "" }] },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`[backfill-slugs] figli senza slug: ${children.length}`);

  let childrenDone = 0;
  const childrenSkipped: string[] = [];
  for (const c of children) {
    if (!c.name?.trim()) {
      childrenSkipped.push(c.id);
      continue;
    }
    const slug = await generateChildSlug(c.name);
    if (!slug) {
      childrenSkipped.push(c.id);
      continue;
    }
    console.log(`  child ${c.id} "${c.name}" → ${slug}`);
    if (!dryRun) await prisma.child.update({ where: { id: c.id }, data: { slug } });
    childrenDone++;
  }

  console.log(`[backfill-slugs] fatto: ${usersDone} utenti, ${childrenDone} figli aggiornati`);
  if (usersSkipped.length || childrenSkipped.length) {
    // Nome vuoto o non slugificabile (es. solo emoji): restano senza slug e
    // continuano a funzionare via id.
    console.log(
      `[backfill-slugs] saltati (nome mancante o non slugificabile): ` +
        `utenti ${usersSkipped.join(", ") || "-"} | figli ${childrenSkipped.join(", ") || "-"}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
