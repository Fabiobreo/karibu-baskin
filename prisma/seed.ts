/**
 * Karibu Baskin — seed / mock data
 *
 * Comandi:
 *   npx tsx prisma/seed.ts seed      → nuke + inserisce tutto (default)
 *   npx tsx prisma/seed.ts nuke      → elimina tutti i dati mock dal DB
 *   npx tsx prisma/seed.ts cleanup   → alias di nuke (retrocompatibilità)
 *   npx tsx prisma/seed.ts demo      → alias di seed (retrocompatibilità)
 */

import { PrismaClient, MatchType, MatchResult, AppRole, Gender } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function past(daysAgo: number, hour = 15): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function future(daysAhead: number, hour = 15): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Genera uno slug leggibile dal nome (es. "Mario Rossi" → "mario-rossi") */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Genera uno slug per una partita: "{team-slug}-vs-{opp-slug}-YYYY-MM-DD" */
function toMatchSlug(teamName: string, oppName: string, date: Date): string {
  const dateStr = date.toISOString().slice(0, 10);
  return `${toSlug(teamName)}-vs-${toSlug(oppName)}-${dateStr}`;
}

/** Email mock da nome */
function toEmail(name: string): string {
  return `${name.toLowerCase().replace(/ /g, ".")}@mock.test`;
}

/** Statistiche per partita calibrate per ruolo */
function statsForRole(sportRole: number) {
  switch (sportRole) {
    case 1: return { points: randInt(0, 6),  baskets: randInt(0, 2), assists: randInt(0, 1), rebounds: randInt(0, 3), fouls: randInt(0, 2) };
    case 2: return { points: randInt(0, 10), baskets: randInt(0, 4), assists: randInt(0, 2), rebounds: randInt(0, 5), fouls: randInt(0, 3) };
    case 3: return { points: randInt(0, 12), baskets: randInt(0, 5), assists: randInt(0, 3), rebounds: randInt(0, 6), fouls: randInt(0, 4) };
    case 4: return { points: randInt(2, 16), baskets: randInt(1, 6), assists: randInt(0, 4), rebounds: randInt(1, 7), fouls: randInt(0, 4) };
    case 5: return { points: randInt(2, 18), baskets: randInt(1, 7), assists: randInt(1, 6), rebounds: randInt(1, 8), fouls: randInt(0, 5) };
    default: return { points: 0, baskets: 0, assists: 0, rebounds: 0, fouls: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Costanti stagione
// ─────────────────────────────────────────────────────────────────────────────

const SEASON = "2025-26";

// ─────────────────────────────────────────────────────────────────────────────
// Definizione dati mock
// ─────────────────────────────────────────────────────────────────────────────

type AthleteSpec = {
  name: string;
  gender: Gender;
  sportRole: number;
  variant?: string;
  captain?: boolean;
  birthYear?: number;
};

const COACHES: { name: string; gender: Gender }[] = [
  { name: "Alessandro Merlin", gender: "MALE"   },
  { name: "Roberta Pasin",     gender: "FEMALE" },
];

type ParentSpec = {
  name: string;
  gender: Gender;
  birthYear: number;
  children: { name: string; gender: Gender; sportRole?: number; birthYear: number }[];
};

const PARENTS: ParentSpec[] = [
  {
    name: "Roberto Ferrari", gender: "MALE", birthYear: 1978,
    children: [
      { name: "Tommaso Ferrari", gender: "MALE",   sportRole: 3, birthYear: 2010 },
      { name: "Lucia Ferrari",   gender: "FEMALE", sportRole: 2, birthYear: 2013 },
    ],
  },
  {
    name: "Maria Grasso", gender: "FEMALE", birthYear: 1982,
    children: [
      { name: "Davide Grasso", gender: "MALE", sportRole: 1, birthYear: 2008 },
    ],
  },
  {
    name: "Claudio Santini", gender: "MALE", birthYear: 1975,
    children: [
      { name: "Elena Santini",   gender: "FEMALE", sportRole: 4, birthYear: 2009 },
      { name: "Mattia Santini",  gender: "MALE",   sportRole: 3, birthYear: 2011 },
    ],
  },
];

const KAPULETI_ATHLETES: AthleteSpec[] = [
  { name: "Marco Verdi",       gender: "MALE",   sportRole: 5, captain: true, birthYear: 1992 },
  { name: "Elena Fontana",     gender: "FEMALE", sportRole: 4,                birthYear: 1996 },
  { name: "Davide Conti",      gender: "MALE",   sportRole: 3,                birthYear: 1990 },
  { name: "Valentina Mele",    gender: "FEMALE", sportRole: 3,                birthYear: 1998 },
  { name: "Luca Ferrero",      gender: "MALE",   sportRole: 4,                birthYear: 1994 },
  { name: "Chiara Gallo",      gender: "FEMALE", sportRole: 2, variant: "P",  birthYear: 2001 },
  { name: "Simone Greco",      gender: "MALE",   sportRole: 5,                birthYear: 1989 },
  { name: "Marta Russo",       gender: "FEMALE", sportRole: 3,                birthYear: 2000 },
  { name: "Federico Marino",   gender: "MALE",   sportRole: 2, variant: "T",  birthYear: 2003 },
  { name: "Beatrice Caruso",   gender: "FEMALE", sportRole: 4,                birthYear: 1995 },
  { name: "Nicola Romano",     gender: "MALE",   sportRole: 1,                birthYear: 1988 },
  { name: "Alessia Ricci",     gender: "FEMALE", sportRole: 5,                birthYear: 1997 },
  { name: "Giorgio Esposito",  gender: "MALE",   sportRole: 3,                birthYear: 2002 },
  { name: "Sara Lombardi",     gender: "FEMALE", sportRole: 2, variant: "S",  birthYear: 2005 },
];

const MONTEKKI_ATHLETES: AthleteSpec[] = [
  { name: "Andrea Costa",      gender: "MALE",   sportRole: 3, captain: true, birthYear: 1993 },
  { name: "Irene Barbieri",    gender: "FEMALE", sportRole: 2,                birthYear: 2002 },
  { name: "Matteo Villa",      gender: "MALE",   sportRole: 4,                birthYear: 1991 },
  { name: "Francesca Serra",   gender: "FEMALE", sportRole: 3,                birthYear: 1999 },
  { name: "Lorenzo Colombo",   gender: "MALE",   sportRole: 1, variant: "S",  birthYear: 1985 },
  { name: "Giulia Moretti",    gender: "FEMALE", sportRole: 5,                birthYear: 1996 },
  { name: "Stefano Ferrari",   gender: "MALE",   sportRole: 2, variant: "R",  birthYear: 2001 },
  { name: "Alice Bruno",       gender: "FEMALE", sportRole: 4,                birthYear: 1994 },
  { name: "Riccardo Leone",    gender: "MALE",   sportRole: 5,                birthYear: 1990 },
  { name: "Martina Vitale",    gender: "FEMALE", sportRole: 3,                birthYear: 2003 },
  { name: "Emanuele Poli",     gender: "MALE",   sportRole: 2,                birthYear: 2006 },
  { name: "Noemi Gatti",       gender: "FEMALE", sportRole: 1,                birthYear: 2004 },
];

const OPPOSING_TEAMS: { name: string; city: string }[] = [
  { name: "Falchi Vicenza",  city: "Vicenza"              },
  { name: "Aquile Padova",   city: "Padova"               },
  { name: "Leoni Verona",    city: "Verona"               },
  { name: "Tigri Treviso",   city: "Treviso"              },
  { name: "Orsi Bassano",    city: "Bassano del Grappa"   },
  { name: "Delfini Rovigo",  city: "Rovigo"               },
  { name: "Lupi Belluno",    city: "Belluno"              },
];

type MatchDef = {
  oppName: string;
  date: Date;
  isHome: boolean;
  our?: number;
  their?: number;
  result?: MatchResult;
};

const KAPULETI_MATCHES: MatchDef[] = [
  { oppName: "Falchi Vicenza", date: past(91),   isHome: true,  our: 72, their: 58, result: "WIN"  },
  { oppName: "Aquile Padova",  date: past(77),   isHome: false, our: 45, their: 61, result: "LOSS" },
  { oppName: "Leoni Verona",   date: past(63),   isHome: true,  our: 83, their: 67, result: "WIN"  },
  { oppName: "Tigri Treviso",  date: past(56),   isHome: false, our: 60, their: 55, result: "WIN"  },
  { oppName: "Orsi Bassano",   date: past(49),   isHome: true,  our: 78, their: 74, result: "WIN"  },
  { oppName: "Delfini Rovigo", date: past(42),   isHome: false, our: 55, their: 66, result: "LOSS" },
  { oppName: "Leoni Verona",   date: past(35),   isHome: false, our: 71, their: 68, result: "WIN"  },
  { oppName: "Falchi Vicenza", date: past(21),   isHome: false, our: 63, their: 59, result: "WIN"  },
  { oppName: "Tigri Treviso",  date: past(7),    isHome: true,  our: 80, their: 72, result: "WIN"  },
  { oppName: "Orsi Bassano",   date: future(7),  isHome: false },
  { oppName: "Aquile Padova",  date: future(21), isHome: true  },
  { oppName: "Delfini Rovigo", date: future(35), isHome: true  },
];

const MONTEKKI_MATCHES: MatchDef[] = [
  { oppName: "Lupi Belluno",   date: past(88),   isHome: true,  our: 52, their: 48, result: "WIN"  },
  { oppName: "Tigri Treviso",  date: past(74),   isHome: false, our: 38, their: 55, result: "LOSS" },
  { oppName: "Falchi Vicenza", date: past(60),   isHome: true,  our: 61, their: 61, result: "DRAW" },
  { oppName: "Aquile Padova",  date: past(46),   isHome: false, our: 44, their: 50, result: "LOSS" },
  { oppName: "Leoni Verona",   date: past(32),   isHome: true,  our: 58, their: 47, result: "WIN"  },
  { oppName: "Lupi Belluno",   date: past(18),   isHome: false, our: 49, their: 53, result: "LOSS" },
  { oppName: "Orsi Bassano",   date: past(4),    isHome: true,  our: 67, their: 52, result: "WIN"  },
  { oppName: "Tigri Treviso",  date: future(4),  isHome: false },
  { oppName: "Falchi Vicenza", date: future(18), isHome: true  },
  { oppName: "Aquile Padova",  date: future(32), isHome: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// NUKE — rimuove tutto il mock data
// ─────────────────────────────────────────────────────────────────────────────

async function nuke() {
  console.log("💥 Nuke — rimozione dati mock...\n");

  // 1. Utenti @mock.test (cascade: TeamMembership, PlayerMatchStats, Registration, Child, ecc.)
  const mocks = await prisma.user.findMany({
    where: { email: { endsWith: "@mock.test" } },
    select: { id: true, name: true },
  });

  if (mocks.length > 0) {
    // Scolleghiamo prima i Child dal loro account (userId), così non vengono
    // eliminati a cascata ma rimangono per la deleteMany successiva
    await prisma.child.updateMany({
      where: { userId: { in: mocks.map((u) => u.id) } },
      data: { userId: null },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: "@mock.test" } },
    });
    // Child orfani (parentId già eliminato via cascade, rimangono solo quelli
    // con id prefissato "mock-child-")
    await prisma.child.deleteMany({
      where: { id: { startsWith: "mock-child-" } },
    });
    console.log(`  ✓ ${mocks.length} utenti mock eliminati`);
  } else {
    console.log("  — Nessun utente @mock.test trovato");
  }

  // 2. Squadre competitive stagione mock → cascade: TeamMembership, Match,
  //    PlayerMatchStats, MatchCallup, Group
  const mockTeams = await prisma.competitiveTeam.findMany({
    where: { season: SEASON },
    select: { id: true, name: true },
  });
  if (mockTeams.length > 0) {
    await prisma.competitiveTeam.deleteMany({ where: { season: SEASON } });
    console.log(`  ✓ ${mockTeams.length} squadre competitive (${SEASON}) eliminate`);
  }

  // 3. Squadre avversarie senza più partite
  const orphanOpp = await prisma.opposingTeam.findMany({
    where: { matches: { none: {} } },
    select: { id: true, name: true },
  });
  if (orphanOpp.length > 0) {
    await prisma.opposingTeam.deleteMany({
      where: { id: { in: orphanOpp.map((o) => o.id) } },
    });
    console.log(`  ✓ ${orphanOpp.length} squadre avversarie orfane eliminate`);
  }

  // 4. Stagione mock
  await prisma.season.deleteMany({ where: { label: SEASON } });

  console.log("\n✅ Nuke completato.\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED — inserisce tutto il mock data
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  await nuke();

  console.log(`🏀 Seed Karibu Baskin — stagione ${SEASON}\n`);

  // ── Stagione ────────────────────────────────────────────────────────────────
  await prisma.season.create({ data: { label: SEASON, isCurrent: true } });
  console.log(`✓ Stagione ${SEASON}\n`);

  // ── Allenatori ───────────────────────────────────────────────────────────────
  console.log("👟 Allenatori...");
  for (const c of COACHES) {
    await prisma.user.upsert({
      where:  { email: toEmail(c.name) },
      update: {},
      create: {
        email:   toEmail(c.name),
        name:    c.name,
        slug:    toSlug(c.name),
        appRole: "COACH" as AppRole,
        gender:  c.gender,
      },
    });
    console.log(`  ✓ ${c.name} (COACH)`);
  }

  // ── Genitori + figli ─────────────────────────────────────────────────────────
  console.log("\n👨‍👧 Genitori e figli...");
  for (const p of PARENTS) {
    const parent = await prisma.user.upsert({
      where:  { email: toEmail(p.name) },
      update: {},
      create: {
        email:     toEmail(p.name),
        name:      p.name,
        slug:      toSlug(p.name),
        appRole:   "PARENT" as AppRole,
        gender:    p.gender,
        birthDate: new Date(`${p.birthYear}-06-15`),
      },
    });
    console.log(`  ✓ ${p.name} (PARENT)`);
    for (const ch of p.children) {
      const childId = `mock-child-${toSlug(ch.name)}`;
      await prisma.child.upsert({
        where:  { id: childId },
        update: {},
        create: {
          id:        childId,
          parentId:  parent.id,
          name:      ch.name,
          gender:    ch.gender,
          sportRole: ch.sportRole ?? null,
          birthDate: new Date(`${ch.birthYear}-03-20`),
        },
      });
      console.log(`    ✓ figlio/a: ${ch.name}${ch.sportRole ? ` (R${ch.sportRole})` : ""}`);
    }
  }

  // ── Atleti Kapuleti ──────────────────────────────────────────────────────────
  console.log("\n👥 Atleti Kapuleti...");
  const kapUserIds: { id: string; sportRole: number; captain: boolean }[] = [];
  for (const a of KAPULETI_ATHLETES) {
    const user = await prisma.user.upsert({
      where:  { email: toEmail(a.name) },
      update: {},
      create: {
        email:            toEmail(a.name),
        name:             a.name,
        slug:             toSlug(a.name),
        appRole:          "ATHLETE" as AppRole,
        gender:           a.gender,
        sportRole:        a.sportRole,
        sportRoleVariant: a.variant ?? null,
        birthDate:        new Date(`${a.birthYear ?? 1993}-05-10`),
      },
    });
    kapUserIds.push({ id: user.id, sportRole: a.sportRole, captain: !!a.captain });
    console.log(`  ✓ ${a.name} (R${a.sportRole}${a.variant ?? ""})`);
  }

  // ── Atleti Montekki ──────────────────────────────────────────────────────────
  console.log("\n👥 Atleti Montekki...");
  const monUserIds: { id: string; sportRole: number; captain: boolean }[] = [];
  for (const a of MONTEKKI_ATHLETES) {
    const user = await prisma.user.upsert({
      where:  { email: toEmail(a.name) },
      update: {},
      create: {
        email:            toEmail(a.name),
        name:             a.name,
        slug:             toSlug(a.name),
        appRole:          "ATHLETE" as AppRole,
        gender:           a.gender,
        sportRole:        a.sportRole,
        sportRoleVariant: a.variant ?? null,
        birthDate:        new Date(`${a.birthYear ?? 1995}-08-22`),
      },
    });
    monUserIds.push({ id: user.id, sportRole: a.sportRole, captain: !!a.captain });
    console.log(`  ✓ ${a.name} (R${a.sportRole}${a.variant ?? ""})`);
  }

  // ── Squadre competitive ──────────────────────────────────────────────────────
  console.log("\n🏆 Squadre competitive...");

  const kapuleti = await prisma.competitiveTeam.create({
    data: {
      name:         "Kapuleti",
      season:       SEASON,
      championship: "Campionato Veneto — Gold Ovest",
      color:        "#E65100",
      description:  "La formazione dei Kapuleti milita nel campionato Veneto Gold Ovest. " +
                    "Nata nel 2021 da un gruppo di giocatori affiatati, punta ogni anno al vertice del girone.",
    },
  });
  console.log("  ✓ Kapuleti — Gold Ovest");

  const montekki = await prisma.competitiveTeam.create({
    data: {
      name:         "Montekki",
      season:       SEASON,
      championship: "Campionato Veneto — Silver Ovest",
      color:        "#546E7A",
      description:  "La formazione dei Montekki milita nel campionato Veneto Silver Ovest. " +
                    "Mix di giovani leve e giocatori esperti, è il vivaio del club.",
    },
  });
  console.log("  ✓ Montekki — Silver Ovest");

  // ── Gironi ──────────────────────────────────────────────────────────────────
  console.log("\n📋 Gironi...");

  const kapGroup = await prisma.group.create({
    data: {
      name:         "Girone A Ovest — Gold",
      season:       SEASON,
      championship: "Gold",
      teamId:       kapuleti.id,
    },
  });
  console.log("  ✓ Girone Kapuleti (Gold)");

  const monGroup = await prisma.group.create({
    data: {
      name:         "Girone B Ovest — Silver",
      season:       SEASON,
      championship: "Silver",
      teamId:       montekki.id,
    },
  });
  console.log("  ✓ Girone Montekki (Silver)");

  // ── Rosa squadre ─────────────────────────────────────────────────────────────
  console.log("\n  Popolamento rose...");
  for (const { id, captain } of kapUserIds) {
    await prisma.teamMembership.create({
      data: { teamId: kapuleti.id, userId: id, isCaptain: captain },
    });
  }
  console.log(`  ✓ ${kapUserIds.length} atleti → Kapuleti`);

  for (const { id, captain } of monUserIds) {
    await prisma.teamMembership.create({
      data: { teamId: montekki.id, userId: id, isCaptain: captain },
    });
  }
  console.log(`  ✓ ${monUserIds.length} atleti → Montekki`);

  // Aggiungi anche i figli mock come membri Montekki (i figli con sportRole)
  const mockChildren = await prisma.child.findMany({
    where: { id: { startsWith: "mock-child-" }, sportRole: { not: null } },
    select: { id: true, sportRole: true },
  });
  for (const ch of mockChildren) {
    await prisma.teamMembership.create({
      data: { teamId: montekki.id, childId: ch.id },
    });
  }
  if (mockChildren.length) console.log(`  ✓ ${mockChildren.length} figli mock → Montekki`);

  // ── Squadre avversarie ───────────────────────────────────────────────────────
  console.log("\n🆚 Squadre avversarie...");
  const opponents: Record<string, string> = {};
  for (const opp of OPPOSING_TEAMS) {
    const existing = await prisma.opposingTeam.findFirst({ where: { name: opp.name } });
    const team = existing ?? await prisma.opposingTeam.create({ data: { name: opp.name, city: opp.city } });
    opponents[opp.name] = team.id;
    console.log(`  ✓ ${opp.name}`);
  }

  // ── Partite + statistiche ────────────────────────────────────────────────────

  async function createMatches(
    teamId: string,
    groupId: string,
    defs: MatchDef[],
    rosterIds: { id: string; sportRole: number }[],
    label: string,
  ) {
    console.log(`\n🏅 Partite ${label}...`);
    for (const m of defs) {
      const match = await prisma.match.create({
        data: {
          slug:       toMatchSlug(label, m.oppName, m.date),
          teamId,
          groupId,
          opponentId: opponents[m.oppName],
          date:       m.date,
          isHome:     m.isHome,
          matchType:  "LEAGUE" as MatchType,
          ourScore:   m.our   ?? null,
          theirScore: m.their ?? null,
          result:     m.result ?? null,
          venue:      m.isHome ? "PalaKaribu, Montecchio Maggiore" : undefined,
        },
      });

      const score = m.our !== undefined
        ? `${m.our}–${m.their} (${m.result})`
        : "da giocare";
      console.log(`  ✓ vs ${m.oppName} ${m.isHome ? "C" : "T"} — ${score}`);

      // Statistiche solo per partite già disputate
      if (!m.result) continue;

      // ~10 giocatori casuali partecipano
      const participants = [...rosterIds]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(10, rosterIds.length));

      for (const { id: userId, sportRole } of participants) {
        await prisma.playerMatchStats.create({
          data: { matchId: match.id, userId, ...statsForRole(sportRole) },
        });
      }
    }
  }

  await createMatches(kapuleti.id, kapGroup.id, KAPULETI_MATCHES, kapUserIds, "Kapuleti");
  await createMatches(montekki.id, monGroup.id, MONTEKKI_MATCHES, monUserIds, "Montekki");

  // ── Allenamenti ──────────────────────────────────────────────────────────────
  console.log("\n📅 Allenamenti...");

  const trainingDefs = [
    {
      title: "Allenamento Kapuleti",
      date: future(3, 18),
      endTime: future(3, 20),
      teamId: kapuleti.id,
      allowedRoles: [],
    },
    {
      title: "Allenamento Montekki",
      date: future(4, 18),
      endTime: future(4, 20),
      teamId: montekki.id,
      allowedRoles: [],
    },
    {
      title: "Allenamento congiunto",
      date: future(10, 18),
      endTime: future(10, 21),
      teamId: null,
      allowedRoles: [],
    },
    {
      title: "Allenamento Kapuleti",
      date: future(17, 18),
      endTime: future(17, 20),
      teamId: kapuleti.id,
      allowedRoles: [],
    },
    {
      title: "Allenamento Montekki",
      date: future(18, 18),
      endTime: future(18, 20),
      teamId: montekki.id,
      allowedRoles: [],
    },
  ];

  for (const t of trainingDefs) {
    const isoSlug = t.date.toISOString().slice(0, 16); // "2025-05-03T18:00"
    await prisma.trainingSession.upsert({
      where:  { dateSlug: isoSlug },
      update: {},
      create: {
        title:        t.title,
        date:         t.date,
        endTime:      t.endTime,
        dateSlug:     isoSlug,
        teamId:       t.teamId,
        allowedRoles: t.allowedRoles,
      },
    });
    console.log(`  ✓ ${t.title} — ${t.date.toLocaleDateString("it-IT")}`);
  }

  // ── Riepilogo ────────────────────────────────────────────────────────────────
  const kapPlayed = KAPULETI_MATCHES.filter((m) => m.result).length;
  const monPlayed = MONTEKKI_MATCHES.filter((m) => m.result).length;

  console.log(`
✅ Seed completato!

   👟 Allenatori:        ${COACHES.length}
   👨‍👧 Genitori:          ${PARENTS.length} (${PARENTS.reduce((n, p) => n + p.children.length, 0)} figli)
   👥 Atleti Kapuleti:   ${KAPULETI_ATHLETES.length}
   👥 Atleti Montekki:   ${MONTEKKI_ATHLETES.length}
   🏆 Squadre:           Kapuleti (Gold) · Montekki (Silver)
   📋 Gironi:            2
   🆚 Avversarie:        ${OPPOSING_TEAMS.length}
   🏅 Partite Kapuleti:  ${KAPULETI_MATCHES.length} (${kapPlayed} giocate)
   🏅 Partite Montekki:  ${MONTEKKI_MATCHES.length} (${monPlayed} giocate)
   📅 Allenamenti:       ${trainingDefs.length} futuri

   Per pulire: npx tsx prisma/seed.ts nuke
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// Backfill slug su partite esistenti senza slug
// ─────────────────────────────────────────────────────────────────────────────

async function backfillMatchSlugs() {
  console.log("\n🔧 Backfill slug partite...");
  const matches = await prisma.match.findMany({
    where: { slug: null },
    select: {
      id:       true,
      date:     true,
      team:     { select: { name: true } },
      opponent: { select: { name: true } },
    },
  });

  if (matches.length === 0) {
    console.log("  ✓ Nessuna partita senza slug.");
    return;
  }

  // Traccia slug già usati in questo backfill per gestire duplicati
  const usedSlugs = new Set<string>();

  for (const m of matches) {
    const base = toMatchSlug(m.team.name, m.opponent.name, m.date);
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${n++}`;
    }
    usedSlugs.add(slug);
    await prisma.match.update({ where: { id: m.id }, data: { slug } });
    console.log(`  ✓ ${m.id} → ${slug}`);
  }

  console.log(`\n✅ Backfill completato: ${matches.length} partite aggiornate.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

const command = process.argv[2] ?? "seed";

const run =
  command === "nuke"     ? nuke :
  command === "cleanup"  ? nuke :                // retrocompatibilità
  command === "seed"     ? seed :
  command === "demo"     ? seed :                // retrocompatibilità
  command === "backfill" ? backfillMatchSlugs :  // backfill slug partite esistenti
  seed;

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
