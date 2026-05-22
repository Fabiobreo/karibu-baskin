/**
 * Popola lo slug per le OpposingTeam che ne sono prive.
 * Lancia con: npx tsx prisma/backfill-opposing-slugs.ts
 */
import { prisma } from "../src/lib/db";
import { generateOpposingTeamSlug } from "../src/lib/slugUtils";

async function main() {
  const missing = await prisma.opposingTeam.findMany({
    where: { slug: null },
    select: { id: true, name: true },
  });
  console.log(`Squadre senza slug: ${missing.length}`);
  for (const t of missing) {
    const slug = await generateOpposingTeamSlug(t.name);
    if (!slug) {
      console.warn(`  · ${t.name}: impossibile generare slug`);
      continue;
    }
    await prisma.opposingTeam.update({ where: { id: t.id }, data: { slug } });
    console.log(`  ✓ ${t.name} → ${slug}`);
  }
  console.log("Backfill completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
