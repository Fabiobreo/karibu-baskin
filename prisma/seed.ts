import { PrismaClient, MatchType, MatchResult } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP — rimuove tutti gli utenti @mock.test e i dati demo associati
// ─────────────────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log("🧹 Pulizia account @mock.test...\n");

  // Cerca gli utenti mock prima di eliminarli (per log)
  const mocks = await prisma.user.findMany({
    where: { email: { endsWith: "@mock.test" } },
    select: { id: true, name: true, email: true },
  });

  if (mocks.length === 0) {
    console.log("  Nessun account @mock.test trovato.");
    return;
  }

  // Elimina i Children dei genitori mock che non sono collegati a utenti @mock.test
  // (i Child con parentId mock vengono cascade-deleted automaticamente)
  // Prima settiamo a null il userId dei Child collegati ad account mock
  // per evitare conflitti durante la deleteMany
  await prisma.child.updateMany({
    where: { userId: { in: mocks.map((u) => u.id) } },
    data: { userId: null },
  });

  // Cascade delete: elimina utenti → Child (parentId cascade), memberships, ecc.
  const { count } = await prisma.user.deleteMany({
    where: { email: { endsWith: "@mock.test" } },
  });

  // Pulizia Child orfani rimasti (parentId già eliminato)
  await prisma.child.deleteMany({
    where: { id: { startsWith: "mock-child-" } },
  });

  for (const u of mocks) {
    console.log(`  ✓ Eliminato: ${u.name ?? u.email}`);
  }
  console.log(`\n  Totale: ${count} utenti rimossi.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO — seed completo per test: atleti, squadre, avversarie, partite, stats
// ─────────────────────────────────────────────────────────────────────────────

const SEASON = "2025-26";

const KAPULETI_ATHLETES = [
  { name: "Marco Verdi",      gender: "MALE",   sportRole: 5, captain: true  },
  { name: "Elena Fontana",    gender: "FEMALE", sportRole: 4                 },
  { name: "Davide Conti",     gender: "MALE",   sportRole: 3                 },
  { name: "Valentina Mele",   gender: "FEMALE", sportRole: 3                 },
  { name: "Luca Ferrero",     gender: "MALE",   sportRole: 4                 },
  { name: "Chiara Gallo",     gender: "FEMALE", sportRole: 2                 },
  { name: "Simone Greco",     gender: "MALE",   sportRole: 5                 },
  { name: "Marta Russo",      gender: "FEMALE", sportRole: 3                 },
  { name: "Federico Marino",  gender: "MALE",   sportRole: 2, variant: "T"   },
  { name: "Beatrice Caruso",  gender: "FEMALE", sportRole: 4                 },
  { name: "Nicola Romano",    gender: "MALE",   sportRole: 1, variant: "S"   },
  { name: "Alessia Ricci",    gender: "FEMALE", sportRole: 5                 },
  { name: "Giorgio Esposito", gender: "MALE",   sportRole: 3                 },
  { name: "Sara Lombardi",    gender: "FEMALE", sportRole: 2, variant: "P"   },
] as const;

const MONTEKKI_ATHLETES = [
  { name: "Andrea Costa",     gender: "MALE",   sportRole: 3, captain: true  },
  { name: "Irene Barbieri",   gender: "FEMALE", sportRole: 2                 },
  { name: "Matteo Villa",     gender: "MALE",   sportRole: 4                 },
  { name: "Francesca Serra",  gender: "FEMALE", sportRole: 3                 },
  { name: "Lorenzo Colombo", gender: "MALE",   sportRole: 1, variant: "S"   },
  { name: "Giulia Moretti",   gender: "FEMALE", sportRole: 5                 },
  { name: "Stefano Ferrari",  gender: "MALE",   sportRole: 2, variant: "R"   },
  { name: "Alice Bruno",      gender: "FEMALE", sportRole: 4                 },
  { name: "Riccardo Leone",   gender: "MALE",   sportRole: 5                 },
  { name: "Martina Vitale",   gender: "FEMALE", sportRole: 3                 },
  { name: "Emanuele Poli",    gender: "MALE",   sportRole: 2                 },
  { name: "Noemi Gatti",      gender: "FEMALE", sportRole: 1                 },
] as const;

const OPPOSING_TEAMS = [
  { name: "Falchi Vicenza",   city: "Vicenza"  },
  { name: "Aquile Padova",    city: "Padova"   },
  { name: "Leoni Verona",     city: "Verona"   },
  { name: "Tigri Treviso",    city: "Treviso"  },
  { name: "Orsi Bassano",     city: "Bassano del Grappa" },
] as const;

// date nel passato (in ordine cronologico)
function past(daysAgo: number, hour = 15) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}
function future(daysAhead: number, hour = 15) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function demo() {
  console.log("🏀 Seed demo Karibu Baskin — stagione", SEASON, "\n");

  // ── Stagione ────────────────────────────────────────────────────────────────
  await prisma.season.upsert({
    where: { label: SEASON },
    update: { isCurrent: true },
    create: { label: SEASON, isCurrent: true },
  });
  console.log("✓ Stagione", SEASON, "segnata come in corso\n");

  // ── Atleti Kapuleti ─────────────────────────────────────────────────────────
  console.log("👥 Creazione atleti Kapuleti...");
  const kapuletiUsers: { id: string; captain: boolean }[] = [];
  for (const a of KAPULETI_ATHLETES) {
    const email = `${a.name.toLowerCase().replace(/ /g, ".")}@mock.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: a.name,
        appRole: "ATHLETE",
        gender: a.gender,
        sportRole: a.sportRole,
        sportRoleVariant: "variant" in a ? a.variant : null,
        birthDate: new Date(`${1985 + Math.floor(Math.random() * 20)}-${String(Math.ceil(Math.random() * 12)).padStart(2, "0")}-15`),
      },
    });
    kapuletiUsers.push({ id: user.id, captain: "captain" in a && !!a.captain });
    console.log(`  ✓ ${a.name} (R${a.sportRole}${"variant" in a ? a.variant : ""})`);
  }

  // ── Atleti Montekki ─────────────────────────────────────────────────────────
  console.log("\n👥 Creazione atleti Montekki...");
  const montakkiUsers: { id: string; captain: boolean }[] = [];
  for (const a of MONTEKKI_ATHLETES) {
    const email = `${a.name.toLowerCase().replace(/ /g, ".")}@mock.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: a.name,
        appRole: "ATHLETE",
        gender: a.gender,
        sportRole: a.sportRole,
        sportRoleVariant: "variant" in a ? a.variant : null,
        birthDate: new Date(`${1990 + Math.floor(Math.random() * 15)}-${String(Math.ceil(Math.random() * 12)).padStart(2, "0")}-15`),
      },
    });
    montakkiUsers.push({ id: user.id, captain: "captain" in a && !!a.captain });
    console.log(`  ✓ ${a.name} (R${a.sportRole}${"variant" in a ? a.variant : ""})`);
  }

  // ── Squadre competitive ─────────────────────────────────────────────────────
  console.log("\n🏆 Creazione squadre...");

  let kapuleti = await prisma.competitiveTeam.findFirst({
    where: { name: "Kapuleti", season: SEASON },
  });
  if (!kapuleti) {
    kapuleti = await prisma.competitiveTeam.create({
      data: {
        name: "Kapuleti",
        season: SEASON,
        championship: "Campionato Veneto — Gold Ovest",
        color: "#E65100",
        description: "La formazione dei Kapuleti milita nel campionato Veneto Gold Ovest. Formata da 25 atleti molto affiatati.",
      },
    });
  }
  console.log("  ✓ Kapuleti (Gold Ovest)");

  let montekki = await prisma.competitiveTeam.findFirst({
    where: { name: "Montekki", season: SEASON },
  });
  if (!montekki) {
    montekki = await prisma.competitiveTeam.create({
      data: {
        name: "Montekki",
        season: SEASON,
        championship: "Campionato Veneto — Silver Ovest",
        color: "#616161",
        description: "La formazione dei Montekki milita nel campionato Veneto Silver Ovest. Mix di nuove leve e giocatori esperti.",
      },
    });
  }
  console.log("  ✓ Montekki (Silver Ovest)");

  // ── Rosa squadre ────────────────────────────────────────────────────────────
  console.log("\n  Popolamento rosa...");

  // Rimuove membership esistenti per questi atleti mock in queste squadre
  const allMockIds = [...kapuletiUsers, ...montakkiUsers].map((u) => u.id);
  await prisma.teamMembership.deleteMany({
    where: {
      teamId: { in: [kapuleti.id, montekki.id] },
      userId: { in: allMockIds },
    },
  });

  for (const { id, captain } of kapuletiUsers) {
    await prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId: kapuleti.id, userId: id } },
      update: { isCaptain: captain },
      create: { teamId: kapuleti.id, userId: id, isCaptain: captain },
    });
  }
  console.log(`  ✓ ${kapuletiUsers.length} atleti aggiunti a Kapuleti`);

  for (const { id, captain } of montakkiUsers) {
    await prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId: montekki.id, userId: id } },
      update: { isCaptain: captain },
      create: { teamId: montekki.id, userId: id, isCaptain: captain },
    });
  }
  console.log(`  ✓ ${montakkiUsers.length} atleti aggiunti a Montekki`);

  // ── Squadre avversarie ──────────────────────────────────────────────────────
  console.log("\n🆚 Creazione squadre avversarie...");
  const opponents: Record<string, string> = {};
  for (const opp of OPPOSING_TEAMS) {
    const existing = await prisma.opposingTeam.findFirst({ where: { name: opp.name } });
    const team = existing ?? await prisma.opposingTeam.create({ data: { name: opp.name, city: opp.city } });
    opponents[opp.name] = team.id;
    console.log(`  ✓ ${opp.name} (${opp.city})`);
  }

  // ── Partite Kapuleti (Gold) ─────────────────────────────────────────────────
  console.log("\n📋 Creazione partite Kapuleti...");

  const kapuletiMatchDefs: {
    oppName: string; date: Date; isHome: boolean; type: MatchType;
    our?: number; their?: number; result?: MatchResult;
  }[] = [
    { oppName: "Falchi Vicenza",  date: past(90), isHome: true,  type: "LEAGUE",    our: 72, their: 58, result: "WIN"  },
    { oppName: "Aquile Padova",   date: past(76), isHome: false, type: "LEAGUE",    our: 45, their: 61, result: "LOSS" },
    { oppName: "Leoni Verona",    date: past(62), isHome: true,  type: "LEAGUE",    our: 83, their: 67, result: "WIN"  },
    { oppName: "Tigri Treviso",   date: past(55), isHome: false, type: "LEAGUE",    our: 60, their: 55, result: "WIN"  },
    { oppName: "Orsi Bassano",    date: past(48), isHome: true,  type: "LEAGUE",    our: 78, their: 74, result: "WIN"  },
    { oppName: "Aquile Padova",   date: past(41), isHome: true,  type: "LEAGUE",    our: 55, their: 66, result: "LOSS" },
    { oppName: "Leoni Verona",    date: past(34), isHome: false, type: "LEAGUE",    our: 71, their: 68, result: "WIN"  },
    { oppName: "Falchi Vicenza",  date: past(20), isHome: false, type: "LEAGUE",    our: 63, their: 59, result: "WIN"  },
    { oppName: "Tigri Treviso",   date: past(6),  isHome: true,  type: "LEAGUE",    our: 80, their: 72, result: "WIN"  },
    { oppName: "Orsi Bassano",    date: future(8),  isHome: false, type: "LEAGUE" },
    { oppName: "Falchi Vicenza",  date: future(22), isHome: true,  type: "LEAGUE" },
    { oppName: "Aquile Padova",   date: future(36), isHome: false, type: "LEAGUE" },
  ];

  const kapuletiMatches: { matchId: string; kapuletiUserIds: string[] }[] = [];
  for (const m of kapuletiMatchDefs) {
    // Rimuovi partita esistente con stesso team+avversario+data (entro 1 giorno)
    const dateFrom = new Date(m.date); dateFrom.setHours(0, 0, 0, 0);
    const dateTo   = new Date(m.date); dateTo.setHours(23, 59, 59, 999);
    const existing = await prisma.officialMatch.findFirst({
      where: { teamId: kapuleti.id, opponentId: opponents[m.oppName], date: { gte: dateFrom, lte: dateTo } },
    });
    if (existing) await prisma.officialMatch.delete({ where: { id: existing.id } });

    const match = await prisma.officialMatch.create({
      data: {
        teamId: kapuleti.id,
        opponentId: opponents[m.oppName],
        date: m.date,
        isHome: m.isHome,
        matchType: m.type,
        ourScore:   m.our   ?? null,
        theirScore: m.their ?? null,
        result:     m.result ?? null,
        venue: m.isHome ? "PalaKaribu, Montecchio Maggiore" : undefined,
      },
    });

    kapuletiMatches.push({ matchId: match.id, kapuletiUserIds: kapuletiUsers.map((u) => u.id) });
    const score = m.our !== undefined ? `${m.our}–${m.their} (${m.result})` : "da giocare";
    console.log(`  ✓ vs ${m.oppName} — ${m.isHome ? "Casa" : "Trasferta"} — ${score}`);
  }

  // ── Partite Montekki (Silver) ───────────────────────────────────────────────
  console.log("\n📋 Creazione partite Montekki...");

  const montakkiMatchDefs: {
    oppName: string; date: Date; isHome: boolean; type: MatchType;
    our?: number; their?: number; result?: MatchResult;
  }[] = [
    { oppName: "Orsi Bassano",   date: past(85), isHome: true,  type: "LEAGUE",    our: 52, their: 48, result: "WIN"  },
    { oppName: "Tigri Treviso",  date: past(71), isHome: false, type: "LEAGUE",    our: 38, their: 55, result: "LOSS" },
    { oppName: "Falchi Vicenza", date: past(57), isHome: true,  type: "LEAGUE",    our: 61, their: 61, result: "DRAW" },
    { oppName: "Aquile Padova",  date: past(43), isHome: false, type: "LEAGUE",    our: 44, their: 50, result: "LOSS" },
    { oppName: "Leoni Verona",   date: past(29), isHome: true,  type: "LEAGUE",    our: 58, their: 47, result: "WIN"  },
    { oppName: "Orsi Bassano",   date: past(15), isHome: false, type: "LEAGUE",    our: 49, their: 53, result: "LOSS" },
    { oppName: "Tigri Treviso",  date: future(5),  isHome: true,  type: "LEAGUE" },
    { oppName: "Falchi Vicenza", date: future(19), isHome: false, type: "LEAGUE" },
    { oppName: "Aquile Padova",  date: future(33), isHome: true,  type: "LEAGUE" },
  ];

  const montakkiMatches: { matchId: string; montakkiUserIds: string[] }[] = [];
  for (const m of montakkiMatchDefs) {
    const dateFrom = new Date(m.date); dateFrom.setHours(0, 0, 0, 0);
    const dateTo   = new Date(m.date); dateTo.setHours(23, 59, 59, 999);
    const existing = await prisma.officialMatch.findFirst({
      where: { teamId: montekki.id, opponentId: opponents[m.oppName], date: { gte: dateFrom, lte: dateTo } },
    });
    if (existing) await prisma.officialMatch.delete({ where: { id: existing.id } });

    const match = await prisma.officialMatch.create({
      data: {
        teamId: montekki.id,
        opponentId: opponents[m.oppName],
        date: m.date,
        isHome: m.isHome,
        matchType: m.type,
        ourScore:   m.our   ?? null,
        theirScore: m.their ?? null,
        result:     m.result ?? null,
        venue: m.isHome ? "PalaKaribu, Montecchio Maggiore" : undefined,
      },
    });

    montakkiMatches.push({ matchId: match.id, montakkiUserIds: montakkiUsers.map((u) => u.id) });
    const score = m.our !== undefined ? `${m.our}–${m.their} (${m.result})` : "da giocare";
    console.log(`  ✓ vs ${m.oppName} — ${m.isHome ? "Casa" : "Trasferta"} — ${score}`);
  }

  // ── Statistiche giocatori (solo partite con risultato) ──────────────────────
  console.log("\n📊 Creazione statistiche giocatori...");

  function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Kapuleti stats
  for (const { matchId, kapuletiUserIds } of kapuletiMatches) {
    const match = await prisma.officialMatch.findUnique({ where: { id: matchId }, select: { result: true } });
    if (!match?.result) continue; // partita futura, niente stats

    // Rimuovi stats esistenti per questo match
    await prisma.playerMatchStats.deleteMany({ where: { matchId } });

    // Partecipano ~10 atleti su 14
    const participants = [...kapuletiUserIds].sort(() => 0.5 - Math.random()).slice(0, 10);
    for (const userId of participants) {
      await prisma.playerMatchStats.create({
        data: {
          matchId,
          userId,
          points: randInt(0, 18),
          baskets: randInt(0, 6),
          fouls: randInt(0, 4),
          minutesPlayed: randInt(15, 40),
        },
      });
    }
  }
  console.log(`  ✓ Stats Kapuleti (${kapuletiMatches.filter((_, i) => kapuletiMatchDefs[i]?.result).length} partite)`);

  // Montekki stats
  for (const { matchId, montakkiUserIds } of montakkiMatches) {
    const match = await prisma.officialMatch.findUnique({ where: { id: matchId }, select: { result: true } });
    if (!match?.result) continue;

    await prisma.playerMatchStats.deleteMany({ where: { matchId } });

    const participants = [...montakkiUserIds].sort(() => 0.5 - Math.random()).slice(0, 9);
    for (const userId of participants) {
      await prisma.playerMatchStats.create({
        data: {
          matchId,
          userId,
          points: randInt(0, 14),
          baskets: randInt(0, 5),
          fouls: randInt(0, 5),
          minutesPlayed: randInt(10, 40),
        },
      });
    }
  }
  console.log(`  ✓ Stats Montekki (${montakkiMatches.filter((_, i) => montakkiMatchDefs[i]?.result).length} partite)`);

  console.log(`
✅ Demo completato!
   Atleti mock creati: ${KAPULETI_ATHLETES.length + MONTEKKI_ATHLETES.length}
   Squadre:            Kapuleti (Gold) · Montekki (Silver)
   Avversarie:         ${OPPOSING_TEAMS.length}
   Partite Kapuleti:   ${kapuletiMatchDefs.length} (${kapuletiMatchDefs.filter((m) => m.result).length} con risultato)
   Partite Montekki:   ${montakkiMatchDefs.length} (${montakkiMatchDefs.filter((m) => m.result).length} con risultato)

   Per pulire: npx tsx prisma/seed.ts cleanup
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// Vecchia funzione per compatibilità
// ─────────────────────────────────────────────────────────────────────────────

async function seedLegacy() {
  const count = parseInt(process.argv[2] ?? "10");
  console.log(`Creazione di ${count} utenti mock (legacy)...`);
  const NOMI = [
    "Marco Rossi","Giulia Bianchi","Luca Ferrari","Sara Esposito","Andrea Ricci",
    "Chiara Colombo","Matteo Bruno","Valentina Mancini","Davide Conti","Francesca Marini",
    "Lorenzo Greco","Alessia Romano","Simone Barbieri","Elena Fontana","Nicola Moretti",
    "Beatrice Caruso","Federico Villa","Martina Leone","Gabriele Costa","Irene Russo",
  ];
  const ROLES = ["GUEST","GUEST","GUEST","ATHLETE","ATHLETE","ATHLETE","ATHLETE","PARENT","COACH"] as const;
  const GENDERS = ["MALE","FEMALE",null] as const;
  for (let i = 0; i < count; i++) {
    const name = NOMI[i % NOMI.length] + (i >= NOMI.length ? ` ${Math.floor(i / NOMI.length) + 1}` : "");
    const email = `${name.toLowerCase().replace(/ /g, ".")}@mock.test`;
    const appRole = ROLES[Math.floor(Math.random() * ROLES.length)];
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
    const sportRole = appRole === "ATHLETE" ? Math.ceil(Math.random() * 5) : null;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, appRole, gender, sportRole },
    });
    console.log(`  ✓ ${name} (${appRole}${sportRole ? `, R${sportRole}` : ""})`);
  }
}

async function seedFamilies() {
  console.log("\nCreazione famiglie mock per test genitore/figlio...\n");
  const g1 = await prisma.user.upsert({
    where: { email: "roberto.ferrari@mock.test" },
    update: {},
    create: { email: "roberto.ferrari@mock.test", name: "Roberto Ferrari", appRole: "PARENT", gender: "MALE", birthDate: new Date("1978-03-15") },
  });
  const f1 = await prisma.user.upsert({
    where: { email: "tommaso.ferrari@mock.test" },
    update: {},
    create: { email: "tommaso.ferrari@mock.test", name: "Tommaso Ferrari", appRole: "ATHLETE", gender: "MALE", sportRole: 3, birthDate: new Date("2010-06-20") },
  });
  await prisma.child.upsert({
    where: { id: "mock-child-ferrari-1" },
    update: {},
    create: { id: "mock-child-ferrari-1", parentId: g1.id, name: "Tommaso Ferrari", sportRole: 3, gender: "MALE", birthDate: new Date("2010-06-20"), userId: f1.id },
  });
  const g2 = await prisma.user.upsert({
    where: { email: "anna.bianchi@mock.test" },
    update: {},
    create: { email: "anna.bianchi@mock.test", name: "Anna Bianchi", appRole: "PARENT", gender: "FEMALE", birthDate: new Date("1982-09-05") },
  });
  await prisma.child.upsert({
    where: { id: "mock-child-bianchi-1" },
    update: {},
    create: { id: "mock-child-bianchi-1", parentId: g2.id, name: "Sofia Bianchi", sportRole: 2, gender: "FEMALE", birthDate: new Date("2012-02-14") },
  });
  await prisma.child.upsert({
    where: { id: "mock-child-bianchi-2" },
    update: {},
    create: { id: "mock-child-bianchi-2", parentId: g2.id, name: "Luca Bianchi", gender: "MALE", birthDate: new Date("2015-07-30") },
  });
  console.log("✅ Famiglie mock create.");
}

// ─────────────────────────────────────────────────────────────────────────────

const command = process.argv[2];

const run =
  command === "cleanup" ? cleanup :
  command === "demo"    ? demo :
  command === "families"? seedFamilies :
  isNaN(Number(command))? demo : seedLegacy;

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
