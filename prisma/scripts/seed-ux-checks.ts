/**
 * Dati di prova per le verifiche nel browser rimaste in sospeso (UX-26).
 *
 * Comandi:
 *   npx tsx prisma/scripts/seed-ux-checks.ts seed    → crea o aggiorna (default)
 *   npx tsx prisma/scripts/seed-ux-checks.ts clean   → cancella tutto ciò che ha creato
 *
 * Idempotente: id ed email fissi, quindi due `seed` di fila aggiornano le stesse
 * righe (le date ripartono da oggi) e due `clean` di fila non trovano niente.
 * Tutto è riconoscibile: email `@ux.test`, titoli e avversarie con "[UX]".
 * `npm run db:check-seed` li segnala, così non arrivano in produzione.
 *
 * Cosa crea:
 *   - un allenamento futuro con le iscrizioni aperte (questionario per un figlio);
 *   - un genitore di prova con un figlio SENZA ruolo;
 *   - un atleta di prova e due allenamenti passati con iscrizioni anonime al
 *     suo nome ("Ti riconosco!" in /profilo confronta il nome, non l'email);
 *   - due partite future, di sabato, con avversarie dal nome lungo;
 *   - un evento futuro con risposta Ci sarò/Forse/No (UX-25), con un "Pranzo" e
 *     gli esterni ammessi (massimo 2);
 *   - una famiglia per la risposta "uno per tutti": due genitori dello stesso
 *     figlio e una figlia adulta con un suo account e una scheda figlio legata
 *     a entrambi (come un atleta figlio di tesserati).
 *
 * Per entrare come gli utenti di prova serve `ENABLE_TEST_LOGIN=true`: il
 * login di test in /login accetta le email qui sotto.
 * `clean` cancella anche gli allenamenti "[UX]" creati a mano dall'admin
 * durante le prove (UX-14).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const UX_EMAIL_DOMAIN = "@ux.test";
const UX_MARKER = "[UX]";

const PARENT = { email: `genitore${UX_EMAIL_DOMAIN}`, name: "Paola Provini" };
const PARENT2 = { email: `genitore2${UX_EMAIL_DOMAIN}`, name: "Marco Provini" };
const ADULT_CHILD = { email: `figlia${UX_EMAIL_DOMAIN}`, name: "Giulia Provini" };
const ADULT_CHILD_ID = "ux-child-adult";
const ATHLETE = { email: `atleta${UX_EMAIL_DOMAIN}`, name: "Luca Riconoscimento" };
const CHILD_ID = "ux-child";

const TRAINING_OPEN = "ux-training-open";
const TRAINING_PAST = ["ux-training-past-1", "ux-training-past-2"];
const OPPONENTS = [
  { id: "ux-opp-1", name: `${UX_MARKER} Polisportiva Dilettantistica Baskin Valle dell'Agno` },
  { id: "ux-opp-2", name: `${UX_MARKER} Associazione Sportiva Inclusiva Riviera Berica` },
];
const MATCHES = ["ux-match-1", "ux-match-2"];
const EVENT_ID = "ux-event";
const EVENT_LUNCH_ID = "ux-event-lunch";

// ─── Date ───────────────────────────────────────────────────────────────────

function atDaysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Il sabato fra almeno `minDays` giorni: la data lunga da provare è "sabato 17 ottobre". */
function saturdayAfter(minDays: number, hour: number): Date {
  const d = atDaysFromNow(minDays, hour);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d;
}

/** Stesso formato del form admin (`AdminSessionForm`): "202610031830", in ora locale. */
function dateSlug(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Seed ───────────────────────────────────────────────────────────────────

async function upsertTraining(id: string, title: string, date: Date, open: boolean) {
  const data = {
    title,
    date,
    endTime: new Date(date.getTime() + 90 * 60_000),
    dateSlug: dateSlug(date),
    registrationOpen: open,
    registrationOpenedAt: open ? new Date() : null,
  };
  return prisma.trainingSession.upsert({ where: { id }, create: { id, ...data }, update: data });
}

async function seed() {
  const season = await prisma.season.findFirst({ where: { isCurrent: true } });
  const team = await prisma.competitiveTeam.findFirst({
    where: {
      isMixed: false,
      NOT: { name: { contains: "(sim)" } },
      ...(season ? { season: season.label } : {}),
    },
    orderBy: { season: "desc" },
  });
  if (!team) throw new Error("Nessuna squadra agonistica: servono per le partite di prova.");

  const parent = await prisma.user.upsert({
    where: { email: PARENT.email },
    create: { ...PARENT, appRole: "PARENT" },
    update: { name: PARENT.name, appRole: "PARENT" },
  });
  const athlete = await prisma.user.upsert({
    where: { email: ATHLETE.email },
    create: { ...ATHLETE, appRole: "ATHLETE", sportRole: 3, gender: "MALE" },
    update: { name: ATHLETE.name, appRole: "ATHLETE" },
  });

  // Figlio senza ruolo: il form d'iscrizione propone il questionario in terza persona.
  const child = {
    name: "Tommaso Provini",
    gender: "MALE" as const,
    birthDate: new Date("2014-05-10"),
    parentalConsentAt: new Date(),
    sportRole: null,
    sportRoleVariant: null,
  };
  await prisma.child.upsert({
    where: { id: CHILD_ID },
    create: { id: CHILD_ID, ...child },
    update: child,
  });
  await prisma.childGuardian.upsert({
    where: { childId_userId: { childId: CHILD_ID, userId: parent.id } },
    create: { childId: CHILD_ID, userId: parent.id },
    update: {},
  });
  // Famiglia per l'RSVP "uno per tutti": secondo genitore e figlia adulta con
  // account, la cui scheda figlio e' legata al suo account e a entrambi.
  const parent2 = await prisma.user.upsert({
    where: { email: PARENT2.email },
    create: { ...PARENT2, appRole: "PARENT" },
    update: { name: PARENT2.name, appRole: "PARENT" },
  });
  const adultChildUser = await prisma.user.upsert({
    where: { email: ADULT_CHILD.email },
    create: { ...ADULT_CHILD, appRole: "ATHLETE", sportRole: 4, gender: "FEMALE" },
    update: { name: ADULT_CHILD.name, appRole: "ATHLETE" },
  });
  const adultChild = {
    name: ADULT_CHILD.name,
    gender: "FEMALE" as const,
    birthDate: new Date("2001-03-02"),
    userId: adultChildUser.id,
  };
  await prisma.child.upsert({
    where: { id: ADULT_CHILD_ID },
    create: { id: ADULT_CHILD_ID, ...adultChild },
    update: adultChild,
  });
  for (const [childId, userId] of [
    [CHILD_ID, parent2.id],
    [ADULT_CHILD_ID, parent.id],
    [ADULT_CHILD_ID, parent2.id],
  ]) {
    await prisma.childGuardian.upsert({
      where: { childId_userId: { childId, userId } },
      create: { childId, userId },
      update: {},
    });
  }

  // Se una prova precedente ha iscritto il figlio, si riparte da zero.
  await prisma.registration.deleteMany({ where: { childId: CHILD_ID } });

  const open = await upsertTraining(
    TRAINING_OPEN,
    `${UX_MARKER} Allenamento con iscrizioni aperte`,
    atDaysFromNow(3, 18, 30),
    true
  );
  const past = await Promise.all(
    TRAINING_PAST.map((id, i) =>
      upsertTraining(
        id,
        `${UX_MARKER} Allenamento passato`,
        atDaysFromNow(-10 - 7 * i, 18, 30),
        false
      )
    )
  );

  // Iscrizioni anonime al nome dell'atleta di prova, da collegare con "Ti riconosco!".
  // Un collegamento fatto in una prova precedente viene annullato.
  for (const [i, session] of past.entries()) {
    const reg = {
      sessionId: session.id,
      name: ATHLETE.name,
      role: 3,
      anonymousEmail: ATHLETE.email,
      userId: null,
      childId: null,
    };
    await prisma.registration.upsert({
      where: { id: `ux-reg-anon-${i + 1}` },
      create: { id: `ux-reg-anon-${i + 1}`, ...reg },
      update: reg,
    });
  }

  for (const opp of OPPONENTS) {
    const data = { name: opp.name, slug: slugify(opp.name), city: "Vicenza" };
    await prisma.opposingTeam.upsert({
      where: { id: opp.id },
      create: { id: opp.id, ...data },
      update: data,
    });
  }
  for (const [i, id] of MATCHES.entries()) {
    const date = saturdayAfter(5 + 7 * i, 15);
    const data = {
      teamId: team.id,
      opponentId: OPPONENTS[i].id,
      date,
      isHome: i === 0,
      matchType: "FRIENDLY" as const,
      notes: `${UX_MARKER} Partita di prova per le date lunghe su mobile.`,
      slug: `ux-${slugify(team.name)}-vs-${slugify(OPPONENTS[i].name)}-${date.toISOString().slice(0, 10)}`,
      result: null,
      ourScore: null,
      theirScore: null,
    };
    await prisma.match.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const event = {
    title: `${UX_MARKER} Evento di prova`,
    slug: "ux-evento-di-prova",
    date: saturdayAfter(12, 10),
    description: "Evento per provare la risposta Ci sarò / Forse / No.",
    allowGuests: true,
    maxGuests: 2,
  };
  await prisma.event.upsert({
    where: { id: EVENT_ID },
    create: { id: EVENT_ID, ...event },
    update: event,
  });
  // Le prove precedenti (iscrizione, risposta all'evento) si annullano: si riparte da zero.
  await prisma.registration.deleteMany({
    where: { sessionId: TRAINING_OPEN, userId: { in: [parent.id, athlete.id] } },
  });
  await prisma.eventAttendance.deleteMany({ where: { eventId: EVENT_ID } });
  await prisma.eventGuest.deleteMany({ where: { eventId: EVENT_ID } });
  // Solo il pranzo di prova: le opzioni aggiunte a mano nelle prove si tolgono.
  await prisma.eventOption.deleteMany({
    where: { eventId: EVENT_ID, id: { not: EVENT_LUNCH_ID } },
  });
  const lunch = { eventId: EVENT_ID, label: "Pranzo", kind: "PASTO" as const, order: 0 };
  await prisma.eventOption.upsert({
    where: { id: EVENT_LUNCH_ID },
    create: { id: EVENT_LUNCH_ID, ...lunch },
    update: lunch,
  });
  await prisma.eventOptionSelection.deleteMany({ where: { optionId: EVENT_LUNCH_ID } });

  console.log("Dati di prova UX pronti:");
  console.log(`  genitore      ${PARENT.email} (figlio senza ruolo: ${child.name})`);
  console.log(`  famiglia      ${PARENT2.email}, ${ADULT_CHILD.email} (stessa famiglia)`);
  console.log(`  atleta        ${ATHLETE.email} (2 iscrizioni anonime da collegare in /profilo)`);
  console.log(`  allenamento   /allenamento/${open.dateSlug}`);
  console.log(`  partite       ${MATCHES.length} contro avversarie "[UX]", squadra ${team.name}`);
  console.log(`  evento        /eventi/${event.slug} (Pranzo, esterni ammessi)`);
  console.log(`  utenti id     ${parent.id}, ${athlete.id}`);
}

// ─── Pulizia ────────────────────────────────────────────────────────────────

async function clean() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: UX_EMAIL_DOMAIN } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  const trainings = await prisma.trainingSession.findMany({
    where: { OR: [{ id: { startsWith: "ux-" } }, { title: { startsWith: UX_MARKER } }] },
    select: { id: true },
  });
  const trainingIds = trainings.map((t) => t.id);

  // Registration → User/Child è SetNull: senza questo resterebbero iscrizioni orfane.
  const regs = await prisma.registration.deleteMany({
    where: {
      OR: [
        { sessionId: { in: trainingIds } },
        { userId: { in: userIds } },
        { childId: { in: [CHILD_ID, ADULT_CHILD_ID] } },
        { anonymousEmail: { endsWith: UX_EMAIL_DOMAIN } },
      ],
    },
  });
  const sessions = await prisma.trainingSession.deleteMany({ where: { id: { in: trainingIds } } });
  const matches = await prisma.match.deleteMany({
    where: {
      OR: [{ id: { in: MATCHES } }, { opponentId: { in: OPPONENTS.map((o) => o.id) } }],
    },
  });
  const opponents = await prisma.opposingTeam.deleteMany({
    where: {
      OR: [{ id: { in: OPPONENTS.map((o) => o.id) } }, { name: { startsWith: UX_MARKER } }],
    },
  });
  const children = await prisma.child.deleteMany({
    where: { id: { in: [CHILD_ID, ADULT_CHILD_ID] } },
  });
  const events = await prisma.event.deleteMany({
    where: { OR: [{ id: EVENT_ID }, { title: { startsWith: UX_MARKER } }] },
  });
  const notifications = await prisma.appNotification.deleteMany({
    where: { targetUserId: { in: userIds } },
  });
  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log("Dati di prova UX cancellati:");
  console.log(
    `  iscrizioni ${regs.count}, allenamenti ${sessions.count}, partite ${matches.count}`
  );
  console.log(
    `  avversarie ${opponents.count}, figli ${children.count}, utenti ${deletedUsers.count}`
  );
  console.log(`  eventi ${events.count}, notifiche ${notifications.count}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const command = process.argv[2] ?? "seed";

async function main() {
  if (command === "seed") await seed();
  else if (command === "clean") await clean();
  else throw new Error(`Comando sconosciuto: ${command} (usa "seed" o "clean")`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
