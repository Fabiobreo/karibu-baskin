/**
 * Controllo pre-rilascio: il database contiene dati di prova?
 *
 * I dati di sviluppo arrivano da due script — `prisma/seed.ts` (utenti
 * `@mock.test`, figli `mock-*`) e `prisma/scripts/simulate-trueskill.ts`
 * (utenti `@sim.test`, squadre con il marcatore "(sim)") — più eventuali post
 * segnaposto scritti a mano. Nessuno di questi deve arrivare in produzione, ma
 * finora non c'era modo di verificarlo se non guardando a occhio.
 *
 * Uso:
 *   npm run db:check-seed          # usa DATABASE_URL dell'ambiente corrente
 *
 * Esce con codice 1 se trova qualcosa, così si può mettere in CI o nella
 * checklist di rilascio. Contro un database di sviluppo è normale che fallisca:
 * va lanciato sull'ambiente di produzione.
 */
import { PrismaClient } from "@prisma/client";

const TEST_EMAIL_DOMAINS = ["@mock.test", "@sim.test"];
const SIM_MARKER = "(sim)";

async function main() {
  const prisma = new PrismaClient();
  try {
    const testEmail = TEST_EMAIL_DOMAINS.map((domain) => ({ email: { endsWith: domain } }));

    const [users, children, posts, teams] = await Promise.all([
      prisma.user.count({ where: { OR: testEmail } }),
      prisma.child.count({
        where: { OR: [{ id: { startsWith: "mock-" } }, { parent: { OR: testEmail } }] },
      }),
      prisma.post.count({
        where: {
          publishedAt: { not: null },
          OR: [
            { title: { contains: "lorem", mode: "insensitive" } },
            { body: { contains: "lorem", mode: "insensitive" } },
          ],
        },
      }),
      prisma.competitiveTeam.count({ where: { name: { contains: SIM_MARKER } } }),
    ]);

    const findings: Array<[label: string, count: number]> = [
      [`utenti con email di prova (${TEST_EMAIL_DOMAINS.join(", ")})`, users],
      ["figli di prova (id mock-* o genitore di prova)", children],
      ["post pubblicati con testo segnaposto (lorem)", posts],
      [`squadre di simulazione (nome con "${SIM_MARKER}")`, teams],
    ];

    for (const [label, count] of findings) {
      console.log(`${count > 0 ? "FAIL" : " ok "}  ${label}: ${count}`);
    }

    if (findings.some(([, count]) => count > 0)) {
      console.error(
        "\nIl database contiene dati di prova. Rimuoverli prima di andare in produzione."
      );
      process.exitCode = 1;
    } else {
      console.log("\nNessun dato di prova trovato.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
