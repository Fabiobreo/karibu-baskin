/**
 * Karibu Baskin — simulazione TrueSkill multi-stagione
 *
 * Crea uno storico realistico su PIÙ stagioni per "rodare" il sistema di rating:
 *  • ~85 atleti su due squadre (Montekki / Kapuleti) con skill NASCOSTE
 *  • 3 stagioni di allenamenti/partitelle (vero modello generativo TrueSkill)
 *  • giocatori che ENTRANO ed ESCONO nel tempo (ex giocatori = senza tessera né
 *    sessioni recenti: il loro rating resta "congelato" all'ultima partita)
 *  • CAMBI di squadra tra una stagione e l'altra (TeamMembership per stagione)
 *  • presenze variabili: a volte uniti, a volte una sola squadra, a volte per ruolo
 *
 * Comandi:
 *   npx tsx prisma/scripts/simulate-trueskill.ts run    → nuke + simula (default)
 *   npx tsx prisma/scripts/simulate-trueskill.ts nuke   → elimina i dati di simulazione
 *
 * Dati isolati: utenti @sim.test, squadre/stagioni con marcatore "(sim)",
 * allenamenti con prefisso "Sim –". Non tocca il seed mock (@mock.test).
 */

import { PrismaClient, Gender, Prisma } from "@prisma/client";
import { generateTeams, type Athlete } from "../../src/lib/season/teamGenerator";
import {
  buildRostersSnapshot,
  recomputeRatings,
  type RegistrationRefMap,
} from "../../src/lib/rating/ratingEngine";
import { ordinal } from "../../src/lib/rating/trueskill";

const prisma = new PrismaClient();

const SIM_DOMAIN = "@sim.test";
const SIM_TITLE_PREFIX = "Sim –";
const SIM_TEAM_TAG = "(sim)"; // marcatore nel nome squadra per il nuke
const SESSIONS_PER_SEASON = 36;
const SQUADS = ["Montekki", "Kapuleti"] as const;
type Squad = (typeof SQUADS)[number];
const SQUAD_COLOR: Record<Squad, string> = { Montekki: "#E65100", Kapuleti: "#1565C0" };

// ── Stagioni (3, ancorate alla data odierna) ──────────────────────────────────

const NOW = new Date();
const CURRENT_START_YEAR = NOW.getMonth() >= 8 ? NOW.getFullYear() : NOW.getFullYear() - 1;
const SEASON_START_YEARS = [CURRENT_START_YEAR - 2, CURRENT_START_YEAR - 1, CURRENT_START_YEAR];
const SEASON_LABELS = SEASON_START_YEARS.map(
  (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`
);

/** Data dentro la finestra della stagione (Set → Mag, troncata a oggi se corrente). */
function dateInSeason(seasonIdx: number, frac: number): Date {
  const y = SEASON_START_YEARS[seasonIdx];
  const start = new Date(y, 8, 1).getTime(); // 1 settembre
  let end = new Date(y + 1, 4, 31).getTime(); // 31 maggio
  if (end > NOW.getTime()) end = NOW.getTime() - 2 * 86_400_000; // stagione corrente: fino a ~oggi
  return new Date(start + frac * (end - start));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
/** Rumore gaussiano (Box-Muller). */
function gauss(mean: number, sd: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pick<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0, Math.min(n, a.length)));
}
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
/** Correlazione di rango di Spearman tra due serie di pari lunghezza. */
function rankCorrelation(xs: number[], ys: number[]): number {
  const rank = (arr: number[]): number[] => {
    const idx = arr.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(arr.length);
    idx.forEach(([, i], pos) => (r[i] = pos));
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

// ── Roster all-time: presenza per stagione + squadra per stagione ─────────────

interface AlltimeDef {
  name: string;
  role: number;
  gender: Gender;
  kind: "user" | "child";
  trueSkill: number;
  /** Indici stagione in cui l'atleta è attivo (0,1,2). */
  activeSeasons: number[];
  /** Squadra per indice stagione (solo per le stagioni attive). */
  squadBySeason: Record<number, Squad>;
}

const FIRST_NAMES = [
  "Marco",
  "Luca",
  "Sara",
  "Giulia",
  "Matteo",
  "Anna",
  "Davide",
  "Elena",
  "Paolo",
  "Chiara",
  "Andrea",
  "Martina",
  "Simone",
  "Federica",
  "Alessandro",
  "Valentina",
  "Giorgio",
  "Beatrice",
  "Stefano",
  "Ilaria",
  "Nicola",
  "Francesca",
  "Riccardo",
  "Alice",
  "Tommaso",
  "Sofia",
  "Filippo",
  "Aurora",
  "Edoardo",
  "Camilla",
  "Gabriele",
  "Greta",
  "Lorenzo",
  "Noemi",
  "Emanuele",
  "Viola",
  "Cristian",
  "Rebecca",
  "Mattia",
  "Ginevra",
];
const ROLE_SURNAME: Record<number, string> = {
  1: "Statico",
  2: "Pivot",
  3: "Corsa",
  4: "Motorio",
  5: "Completo",
};
const ROLE_WEIGHTS: [number, number][] = [
  [1, 0.1],
  [2, 0.1],
  [3, 0.27],
  [4, 0.27],
  [5, 0.26],
];

function weightedRole(): number {
  let r = Math.random();
  for (const [role, w] of ROLE_WEIGHTS) {
    if (r < w) return role;
    r -= w;
  }
  return 5;
}

/**
 * Profilo di carriera: quali stagioni l'atleta frequenta. Mix di veterani,
 * ex giocatori (usciti), e nuovi arrivi.
 */
function careerSeasons(): number[] {
  const r = Math.random();
  if (r < 0.58) return [0, 1, 2]; // veterano (tutte e 3)
  if (r < 0.68) return [0]; // uscito dopo la 1ª
  if (r < 0.78) return [0, 1]; // uscito dopo la 2ª
  if (r < 0.88) return [1, 2]; // entrato in 2ª stagione
  return [2]; // nuovo arrivo (solo stagione corrente)
}

function buildRoster(total = 85): AlltimeDef[] {
  const out: AlltimeDef[] = [];
  for (let i = 0; i < total; i++) {
    const role = weightedRole();
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const name = `${first} ${ROLE_SURNAME[role]} ${i + 1}`;
    const gender: Gender = Math.random() < 0.45 ? "FEMALE" : "MALE";
    const kind: "user" | "child" = role >= 3 && Math.random() < 0.1 ? "child" : "user";
    const trueSkill = Math.max(12, Math.min(40, Math.round(gauss(25, 6))));

    const activeSeasons = careerSeasons();
    // Squadra base + eventuale cambio in una stagione successiva.
    let squad: Squad = SQUADS[randInt(0, 1)];
    const squadBySeason: Record<number, Squad> = {};
    const switchAt =
      activeSeasons.length > 1 && Math.random() < 0.22
        ? activeSeasons[randInt(1, activeSeasons.length - 1)]
        : -1;
    for (const s of activeSeasons) {
      if (s === switchAt) squad = squad === "Montekki" ? "Kapuleti" : "Montekki";
      squadBySeason[s] = squad;
    }

    out.push({ name, role, gender, kind, trueSkill, activeSeasons, squadBySeason });
  }
  return out;
}

const ROSTER: AlltimeDef[] = buildRoster();

interface RosterPlayer extends AlltimeDef {
  userId: string | null;
  childId: string | null;
  key: string; // "u:<id>" | "c:<id>"
}

// ── Nuke ──────────────────────────────────────────────────────────────────────

async function nuke() {
  console.log("💥 Rimozione dati di simulazione...");

  const delSessions = await prisma.trainingSession.deleteMany({
    where: { title: { startsWith: SIM_TITLE_PREFIX } },
  });
  // Squadre sim → cascade su TeamMembership.
  const delTeams = await prisma.competitiveTeam.deleteMany({
    where: { name: { contains: SIM_TEAM_TAG } },
  });
  // Utenti @sim.test → cascade su RatingUpdate/TeamMembership; i figli del
  // genitore sim si cancellano col genitore (Child.parent onDelete: Cascade).
  const simUsers = await prisma.user.findMany({
    where: { email: { endsWith: SIM_DOMAIN } },
    select: { id: true },
  });
  if (simUsers.length > 0) {
    await prisma.user.deleteMany({ where: { email: { endsWith: SIM_DOMAIN } } });
  }

  console.log(
    `  ✓ ${delSessions.count} allenamenti, ${delTeams.count} squadre, ${simUsers.length} utenti sim eliminati`
  );
}

// ── Creazione del "mondo": stagioni, squadre, atleti, tesseramenti ────────────

interface World {
  players: RosterPlayer[];
  /** teamId per (indice stagione, squadra). */
  teamId: (seasonIdx: number, squad: Squad) => string;
}

async function createWorld(): Promise<World> {
  // Niente record Season: il sistema calcola la stagione corrente dalla data
  // (seasonUtils), quindi useremo le label reali sulle squadre — così la colonna
  // "Squadra" in /admin/utenti riconosce i tesseramenti della stagione corrente.

  // Squadre per stagione (label reale "YYYY-YY"; isolamento via nome "(sim)").
  const teamMap = new Map<string, string>(); // `${seasonIdx}:${squad}` → teamId
  for (let s = 0; s < SEASON_LABELS.length; s++) {
    for (const squad of SQUADS) {
      const t = await prisma.competitiveTeam.create({
        data: {
          name: `${squad} ${SIM_TEAM_TAG}`,
          season: SEASON_LABELS[s],
          color: SQUAD_COLOR[squad],
        },
      });
      teamMap.set(`${s}:${squad}`, t.id);
    }
  }
  const teamId = (seasonIdx: number, squad: Squad) => teamMap.get(`${seasonIdx}:${squad}`)!;

  // Genitore "tecnico" per i figli.
  const parent = await prisma.user.create({
    data: { name: "Genitore Sim", email: `genitore${SIM_DOMAIN}`, appRole: "PARENT" },
  });

  // Atleti + tesseramenti per ogni stagione attiva.
  const players: RosterPlayer[] = [];
  const memberships: Prisma.TeamMembershipCreateManyInput[] = [];
  for (let i = 0; i < ROSTER.length; i++) {
    const def = ROSTER[i];
    let userId: string | null = null;
    let childId: string | null = null;
    if (def.kind === "user") {
      const u = await prisma.user.create({
        data: {
          name: def.name,
          email: `${slugify(def.name)}-${i}${SIM_DOMAIN}`,
          appRole: "ATHLETE",
          sportRole: def.role,
          gender: def.gender,
          slug: `${slugify(def.name)}-${i}`,
        },
      });
      userId = u.id;
    } else {
      const c = await prisma.child.create({
        data: {
          parentId: parent.id,
          name: def.name,
          slug: slugify(def.name),
          sportRole: def.role,
          gender: def.gender,
          parentalConsentAt: new Date(),
        },
      });
      childId = c.id;
    }
    const key = userId ? `u:${userId}` : `c:${childId}`;
    players.push({ ...def, userId, childId, key });

    for (const s of def.activeSeasons) {
      memberships.push({ teamId: teamId(s, def.squadBySeason[s]), userId, childId });
    }
  }
  await prisma.teamMembership.createMany({ data: memberships });

  console.log(
    `  ✓ ${players.length} atleti, ${memberships.length} tesseramenti, ` +
      `${SEASON_LABELS.length} stagioni, ${SQUADS.length * SEASON_LABELS.length} squadre`
  );
  return { players, teamId };
}

// ── Modello di punteggio (vero generativo TrueSkill) ──────────────────────────

function teamSkillSum(team: { id: string }[], skillById: Map<string, number>): number {
  return team.reduce((s, a) => s + (skillById.get(a.id) ?? 25), 0);
}

const SCORE_K = 0.9; // skill→punti
const SIM_BETA = 25 / 6; // β della performance per giocatore

function simulateScore(
  sumA: number,
  nA: number,
  sumB: number,
  nB: number
): { scoreA: number; scoreB: number } {
  const perfA = sumA + gauss(0, SIM_BETA * Math.sqrt(Math.max(1, nA)));
  const perfB = sumB + gauss(0, SIM_BETA * Math.sqrt(Math.max(1, nB)));
  const margin = Math.round((perfA - perfB) * SCORE_K);
  if (margin === 0) {
    const tie = randInt(42, 56);
    return { scoreA: tie, scoreB: tie };
  }
  const loser = randInt(34, 52);
  const gap = Math.min(Math.abs(margin), 40);
  return margin > 0
    ? { scoreA: loser + gap, scoreB: loser }
    : { scoreA: loser, scoreB: loser + gap };
}

// ── Simulazione di un allenamento ─────────────────────────────────────────────

async function runSession(
  world: World,
  seasonIdx: number,
  index: number,
  globalNo: number
): Promise<void> {
  const date = dateInSeason(seasonIdx, (index - 0.5) / SESSIONS_PER_SEASON);
  const active = world.players.filter((p) => p.activeSeasons.includes(seasonIdx));

  // Pool di presenze: uniti / una sola squadra / ristretto per ruolo.
  const r = Math.random();
  let pool = active;
  let label = "uniti";
  let teamRefId: string | null = null;
  if (r < 0.3) {
    const squad = SQUADS[randInt(0, 1)];
    pool = active.filter((p) => p.squadBySeason[seasonIdx] === squad);
    label = squad;
    teamRefId = world.teamId(seasonIdx, squad);
  } else if (r < 0.45) {
    const high = Math.random() < 0.5;
    pool = active.filter((p) => (high ? p.role >= 3 : p.role <= 3));
    label = high ? "ruoli 3-5" : "ruoli 1-3";
  }

  const maxAtt = Math.min(pool.length, 40);
  if (maxAtt < 4) return; // pool troppo piccolo, salta
  const attendees = pick(pool, randInt(Math.min(10, maxAtt), maxAtt));
  const numTeams: 2 | 3 = attendees.length >= 24 && Math.random() < 0.6 ? 3 : 2;

  // 1) Allenamento
  const session = await prisma.trainingSession.create({
    data: {
      title: `${SIM_TITLE_PREFIX} ${SEASON_LABELS[seasonIdx]} #${index} (${label})`,
      date,
      createdAt: date,
      managedAt: date,
      dateSlug: `sim-${globalNo}-${date.getTime()}`,
      registrationOpen: false,
      teamId: teamRefId,
    },
  });

  // 2) Iscrizioni (createMany + rilettura per ottenere gli id)
  await prisma.registration.createMany({
    data: attendees.map((p) => ({
      sessionId: session.id,
      name: p.name,
      role: p.role,
      userId: p.userId,
      childId: p.childId,
      createdAt: date,
    })),
  });
  const regs = await prisma.registration.findMany({
    where: { sessionId: session.id },
    select: { id: true, name: true, role: true, userId: true, childId: true },
  });

  const byKey = new Map(attendees.map((p) => [p.key, p]));
  const refs: RegistrationRefMap = new Map();
  const skillByRegId = new Map<string, number>();
  const athletes: Athlete[] = [];
  for (const reg of regs) {
    const key = reg.userId ? `u:${reg.userId}` : `c:${reg.childId}`;
    const p = byKey.get(key)!;
    refs.set(reg.id, { userId: reg.userId, childId: reg.childId });
    skillByRegId.set(reg.id, p.trueSkill);
    athletes.push({ id: reg.id, name: reg.name, role: reg.role, gender: p.gender });
  }

  // 3) Squadre (vero algoritmo; nessun rating ancora usato per lo split)
  const teams = generateTeams(athletes, `sim-seed-${session.id}`, numTeams);
  const mapTeam = (t: Athlete[]) =>
    t.map((a) => ({ id: a.id, name: a.name, role: a.role, gender: a.gender }));
  const teamsJson = {
    teamA: mapTeam(teams.teamA),
    teamB: mapTeam(teams.teamB),
    ...(teams.teamC ? { teamC: mapTeam(teams.teamC) } : {}),
    numTeams,
    coaches: [],
    generated: true,
  };
  await prisma.trainingSession.update({
    where: { id: session.id },
    data: { teams: teamsJson },
  });

  // 4) Partitelle
  const matchups = numTeams === 3 ? ["AB", "AC", "BC"] : ["AB"];
  const byLetter = { A: teams.teamA, B: teams.teamB, C: teams.teamC ?? [] } as const;
  let offset = 0;
  for (const m of matchups) {
    const left = byLetter[m[0] as "A" | "B" | "C"];
    const right = byLetter[m[1] as "A" | "B" | "C"];
    if (left.length === 0 || right.length === 0) continue;

    const { scoreA, scoreB } = simulateScore(
      teamSkillSum(left, skillByRegId),
      left.length,
      teamSkillSum(right, skillByRegId),
      right.length
    );
    const snapshot = buildRostersSnapshot(teamsJson, m, refs);
    await prisma.trainingMatchResult.create({
      data: {
        sessionId: session.id,
        matchup: m,
        scoreA,
        scoreB,
        rostersSnapshot: snapshot as object,
        createdAt: new Date(date.getTime() + offset * 15 * 60_000),
      },
    });
    offset++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  await nuke();
  console.log(
    `\n🏀 Simulazione multi-stagione: ${SEASON_LABELS.join(", ")} — roster all-time ${ROSTER.length}\n`
  );

  const world = await createWorld();

  let globalNo = 0;
  for (let s = 0; s < SEASON_LABELS.length; s++) {
    for (let i = 1; i <= SESSIONS_PER_SEASON; i++) {
      globalNo++;
      await runSession(world, s, i, globalNo);
      process.stdout.write(`  · ${SEASON_LABELS[s]} ${i}/${SESSIONS_PER_SEASON}   \r`);
    }
  }
  console.log(`\n  ✓ ${globalNo} allenamenti simulati su ${SEASON_LABELS.length} stagioni`);

  console.log("\n⚙️  Calcolo rating TrueSkill dal log completo...");
  await recomputeRatings(prisma);

  // ── Riepilogo ──
  const users = await prisma.user.findMany({
    where: { email: { endsWith: SIM_DOMAIN }, ratingMu: { not: null } },
    select: { id: true, name: true, ratingMu: true, ratingSigma: true },
  });
  const childIds = world.players.filter((p) => p.childId).map((p) => p.childId!) as string[];
  const children = await prisma.child.findMany({
    where: { id: { in: childIds }, ratingMu: { not: null } },
    select: { id: true, name: true, ratingMu: true, ratingSigma: true },
  });

  const skillByName = new Map(ROSTER.map((d) => [d.name, d.trueSkill]));
  const currentActive = new Set(
    world.players
      .filter((p) => p.activeSeasons.includes(SEASON_LABELS.length - 1))
      .map((p) => p.name)
  );

  const all = [...users, ...children]
    .filter((p) => p.ratingMu != null)
    .map((p) => ({
      name: p.name ?? "?",
      mu: p.ratingMu!,
      sigma: p.ratingSigma!,
      ordinal: ordinal({ mu: p.ratingMu!, sigma: p.ratingSigma! }),
      trueSkill: skillByName.get(p.name ?? "") ?? NaN,
      current: currentActive.has(p.name ?? ""),
    }))
    .sort((a, b) => b.ordinal - a.ordinal);

  const spearman = rankCorrelation(
    all.map((p) => p.mu),
    all.map((p) => p.trueSkill)
  );
  const avgSigma = all.reduce((s, p) => s + p.sigma, 0) / all.length;
  const formerCount = all.filter((p) => !p.current).length;

  console.log("\n📊 Risultati simulazione:\n");
  console.log(`  Atleti valutati: ${all.length}  (di cui ex giocatori: ${formerCount})`);
  console.log(`  Correlazione di rango μ ↔ true skill: ${spearman.toFixed(3)} (1.0 = perfetta)`);
  console.log(`  σ media: ${avgSigma.toFixed(2)} (parte da ${(25 / 3).toFixed(2)})`);

  const fmt = (p: (typeof all)[number]) =>
    `  ${p.mu.toFixed(1).padStart(5)}  ${p.sigma.toFixed(1).padStart(4)}  ${p.ordinal
      .toFixed(1)
      .padStart(5)}  ${String(p.trueSkill).padStart(5)}  ${p.current ? "  " : "ex"}  ${p.name}`;

  console.log("\n  Top 12 (μ stimato):");
  console.log("    μ      σ     ord    true       nome");
  all.slice(0, 12).forEach((p) => console.log(fmt(p)));
  console.log("\n  Bottom 6:");
  all.slice(-6).forEach((p) => console.log(fmt(p)));

  console.log(
    "\n✅ Fatto. Apri /admin/utenti per la colonna Skill e /admin/squadre per i tesseramenti."
  );
}

const command = process.argv[2] ?? "run";
const fn = command === "nuke" ? nuke : run;

fn()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
