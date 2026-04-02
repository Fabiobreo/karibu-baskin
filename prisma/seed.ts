import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NOMI = [
  "Marco Rossi", "Giulia Bianchi", "Luca Ferrari", "Sara Esposito",
  "Andrea Ricci", "Chiara Colombo", "Matteo Bruno", "Valentina Mancini",
  "Davide Conti", "Francesca Marini", "Lorenzo Greco", "Alessia Romano",
  "Simone Barbieri", "Elena Fontana", "Nicola Moretti", "Beatrice Caruso",
  "Federico Villa", "Martina Leone", "Gabriele Costa", "Irene Russo",
];

const ROLES = ["GUEST", "GUEST", "GUEST", "ATHLETE", "ATHLETE", "ATHLETE", "ATHLETE", "PARENT", "COACH"] as const;
const GENDERS = ["MALE", "FEMALE", null] as const;
const SPORT_ROLES = [1, 2, 3, 4, 5, null] as const;

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  const count = parseInt(process.argv[2] ?? "10");
  console.log(`Creazione di ${count} utenti mock...`);

  for (let i = 0; i < count; i++) {
    const name = NOMI[i % NOMI.length] + (i >= NOMI.length ? ` ${Math.floor(i / NOMI.length) + 1}` : "");
    const email = `${name.toLowerCase().replace(/ /g, ".")}@mock.test`;
    const appRole = randomItem(ROLES);
    const gender = randomItem(GENDERS);
    const sportRole = appRole === "ATHLETE" ? randomItem(SPORT_ROLES) ?? randomItem([1,2,3,4,5]) : null;
    const birthDate = randomDate(new Date("1985-01-01"), new Date("2010-12-31"));

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        appRole,
        gender,
        sportRole,
        birthDate,
      },
    });

    console.log(`  ✓ ${name} (${appRole}${sportRole ? `, R${sportRole}` : ""})`);
  }

  const pending = await prisma.user.count({ where: { appRole: "GUEST" } });
  console.log(`\nDone. Utenti GUEST in attesa: ${pending}`);
}

// ── Seed famiglie mock (genitori + figli) ─────────────────────────────────────

export async function seedFamilies() {
  console.log("\nCreazione famiglie mock per test genitore/figlio...\n");

  // ── Famiglia 1: genitore + 1 figlio con account ───────────────────────────
  const genitore1 = await prisma.user.upsert({
    where: { email: "roberto.ferrari@mock.test" },
    update: {},
    create: {
      email: "roberto.ferrari@mock.test",
      name: "Roberto Ferrari",
      appRole: "PARENT",
      gender: "MALE",
      birthDate: new Date("1978-03-15"),
    },
  });
  console.log(`  ✓ ${genitore1.name} (PARENT)`);

  // Figlio con account proprio
  const figlio1 = await prisma.user.upsert({
    where: { email: "tommaso.ferrari@mock.test" },
    update: {},
    create: {
      email: "tommaso.ferrari@mock.test",
      name: "Tommaso Ferrari",
      appRole: "ATHLETE",
      gender: "MALE",
      sportRole: 3,
      birthDate: new Date("2010-06-20"),
    },
  });
  console.log(`  ✓ ${figlio1.name} (ATHLETE, R3) — ha un account`);

  // Figlio senza account (solo nel modello Child)
  const child1 = await prisma.child.upsert({
    where: { id: "mock-child-ferrari-1" },
    update: {},
    create: {
      id: "mock-child-ferrari-1",
      parentId: genitore1.id,
      name: "Tommaso Ferrari",
      sportRole: 3,
      gender: "MALE",
      birthDate: new Date("2010-06-20"),
      // collegato all'account
      userId: figlio1.id,
    },
  });
  console.log(`  ✓ Child "${child1.name}" collegato all'account di ${figlio1.name}`);

  // ── Famiglia 2: genitore + 2 figli, entrambi senza account ───────────────
  const genitore2 = await prisma.user.upsert({
    where: { email: "anna.bianchi@mock.test" },
    update: {},
    create: {
      email: "anna.bianchi@mock.test",
      name: "Anna Bianchi",
      appRole: "PARENT",
      gender: "FEMALE",
      birthDate: new Date("1982-09-05"),
    },
  });
  console.log(`\n  ✓ ${genitore2.name} (PARENT)`);

  const child2a = await prisma.child.upsert({
    where: { id: "mock-child-bianchi-1" },
    update: {},
    create: {
      id: "mock-child-bianchi-1",
      parentId: genitore2.id,
      name: "Sofia Bianchi",
      sportRole: 2,
      gender: "FEMALE",
      birthDate: new Date("2012-02-14"),
    },
  });
  console.log(`  ✓ Child "${child2a.name}" (R2, F) — senza account`);

  const child2b = await prisma.child.upsert({
    where: { id: "mock-child-bianchi-2" },
    update: {},
    create: {
      id: "mock-child-bianchi-2",
      parentId: genitore2.id,
      name: "Luca Bianchi",
      sportRole: null, // ruolo non ancora assegnato
      gender: "MALE",
      birthDate: new Date("2015-07-30"),
    },
  });
  console.log(`  ✓ Child "${child2b.name}" (ruolo non assegnato) — senza account`);

  // ── Famiglia 3: genitore + 2 figli misti (uno con account, uno senza) ────
  const genitore3 = await prisma.user.upsert({
    where: { email: "marco.esposito@mock.test" },
    update: {},
    create: {
      email: "marco.esposito@mock.test",
      name: "Marco Esposito",
      appRole: "PARENT",
      gender: "MALE",
      birthDate: new Date("1975-11-22"),
    },
  });
  console.log(`\n  ✓ ${genitore3.name} (PARENT)`);

  // Figlio 3a: senza account
  const child3a = await prisma.child.upsert({
    where: { id: "mock-child-esposito-1" },
    update: {},
    create: {
      id: "mock-child-esposito-1",
      parentId: genitore3.id,
      name: "Chiara Esposito",
      sportRole: 1,
      sportRoleVariant: "S",
      gender: "FEMALE",
      birthDate: new Date("2009-04-18"),
    },
  });
  console.log(`  ✓ Child "${child3a.name}" (R1-S, F) — senza account`);

  // Figlio 3b: con account
  const figlio3b = await prisma.user.upsert({
    where: { email: "matteo.esposito@mock.test" },
    update: {},
    create: {
      email: "matteo.esposito@mock.test",
      name: "Matteo Esposito",
      appRole: "ATHLETE",
      gender: "MALE",
      sportRole: 4,
      birthDate: new Date("2011-12-03"),
    },
  });
  const child3b = await prisma.child.upsert({
    where: { id: "mock-child-esposito-2" },
    update: {},
    create: {
      id: "mock-child-esposito-2",
      parentId: genitore3.id,
      name: "Matteo Esposito",
      sportRole: 4,
      gender: "MALE",
      birthDate: new Date("2011-12-03"),
      userId: figlio3b.id,
    },
  });
  console.log(`  ✓ ${figlio3b.name} (ATHLETE, R4) — ha un account`);
  console.log(`  ✓ Child "${child3b.name}" collegato all'account di ${figlio3b.name}`);

  console.log("\n✅ Famiglie mock create:");
  console.log("   Famiglia Ferrari  → 1 genitore + 1 figlio (con account)");
  console.log("   Famiglia Bianchi  → 1 genitore + 2 figli (senza account)");
  console.log("   Famiglia Esposito → 1 genitore + 2 figli (1 senza account, 1 con)");
  console.log("\n📧 Account genitore disponibili:");
  console.log("   roberto.ferrari@mock.test");
  console.log("   anna.bianchi@mock.test");
  console.log("   marco.esposito@mock.test");
}

const command = process.argv[2];

if (command === "families") {
  seedFamilies()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
} else {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
