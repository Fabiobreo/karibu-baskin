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

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
