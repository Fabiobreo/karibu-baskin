import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Inventario di chi può leggere cosa (revisione esposizione dati, settembre 2026).
 *
 * Ogni rotta API con una GET deve comparire qui con il suo livello di accesso.
 * Il test fallisce quando:
 * - si aggiunge una rotta con GET senza classificarla (o ne resta una sparita);
 * - una rotta perde il controllo che il suo livello richiede;
 * - una GET pubblica seleziona campi riservati, usa `birthDate` senza passare
 *   dalle regole di @/lib/minors, o restituisce record interi di modelli che
 *   non sono dichiarati sicuri qui sotto.
 *
 * I controlli sono statici e volutamente semplici: non dimostrano che una rotta
 * è sicura, costringono a guardarla quando cambia. Se un controllo scatta a
 * torto, correggere la rotta o documentare l'eccezione in `EXCEPTIONS`, mai
 * togliere il controllo.
 */

type Access =
  | "public" // chiunque, anche anonimo
  | "authenticated" // qualunque sessione, anche GUEST
  | "self" // solo i dati di chi chiama
  | "member" // tesserati (ATHLETE o superiore)
  | "staff" // COACH o ADMIN
  | "admin"
  | "cron" // Vercel Cron con CRON_SECRET
  | "dev" // solo sviluppo
  | "authjs"; // gestore di Auth.js

const ROUTES: Record<string, Access> = {
  "admin/audit": "staff",
  "admin/export": "staff",
  "admin/people": "staff",
  "auth/[...nextauth]": "authjs",
  calendar: "public",
  "calendar/export.ics": "public",
  "children/[childId]/season-stats": "public",
  "competitive-teams": "public",
  "competitive-teams/[teamId]": "public",
  "cron/birthday-notifications": "cron",
  "cron/cleanup-notifications": "cron",
  "cron/instagram-sync": "cron",
  "cron/match-availability-reminder": "cron",
  "cron/match-callup-reminder": "cron",
  "cron/match-coverage-alert": "cron",
  "cron/training-open-reminder": "cron",
  events: "public",
  "events/[eventId]/attendance": "public",
  "events/[eventId]/options": "public",
  groups: "public",
  "groups/[groupId]": "public",
  "link-requests": "self",
  matches: "public",
  "matches/[matchId]": "public",
  "matches/[matchId]/callups": "public",
  "matches/[matchId]/mvps": "public",
  "matches/[matchId]/stats": "public",
  "matches/[matchId]/tabellino": "public",
  notifications: "self",
  "notifications/unread-count": "self",
  "opposing-teams": "public",
  posts: "public",
  "posts/[id]": "public",
  "posts/admin": "staff",
  "push/vapid-public-key": "public",
  registrations: "member",
  search: "public",
  sessions: "public",
  "sessions/[sessionId]": "public",
  "sessions/[sessionId]/match-results": "public",
  suggestions: "staff",
  "teams/[sessionId]": "member",
  "test-login": "dev",
  users: "admin",
  "users/[userId]/season-stats": "public",
  "users/lookup": "authenticated",
  "users/me": "self",
  "users/me/availabilities": "self",
  "users/me/children": "self",
  "users/me/export": "self",
  "users/me/notif-prefs": "self",
};

/** Almeno uno di questi deve comparire nel file della rotta. */
const REQUIRED: Partial<Record<Access, RegExp>> = {
  authenticated: /\bauth\(\)/,
  self: /\bauth\(\)/,
  member: /\bisMember(Role)?\(/,
  staff: /\b(staffGuard|isCoachOrAdmin|isAdminUser)\(/,
  admin: /\bisAdminUser\(/,
  cron: /CRON_SECRET/,
  dev: /\bisTestLoginEnabled\(/,
};

/** Campi che una GET pubblica non seleziona mai. */
const FORBIDDEN_IN_PUBLIC = [
  /\bemail:\s*true/,
  /\banonymousEmail:\s*true/,
  /\bratingMu\b/,
  /\bratingSigma\b/,
  /\brostersSnapshot:\s*true/,
  /\bopponentProfile:\s*true/,
  /\bnotifPrefs\b/,
];

/** `birthDate` in una GET pubblica è ammesso solo se passa dalle regole sui minori. */
const MINORS_HELPERS = /\b(publicSubjects|isMinor|isMinorChild|isMinorSubject|notMinorFilter)\b/;

/**
 * Modelli che una GET pubblica può restituire interi (senza `select` né
 * `omit`): nessuna colonna riservata. Aggiungerne uno qui è una decisione:
 * guardare lo schema prima.
 */
const SAFE_FULL_ROW_MODELS = new Set([
  "event",
  "eventOption",
  "competitiveTeam",
  "group",
  "opposingTeam",
  "post",
  // Numeri di gioco e riferimenti ai giocatori; i minori li filtra publicSubjects.
  "playerMatchStats",
  "matchCallup",
  "matchMvp",
]);

/** Eccezioni documentate, per rotta e modello. */
const EXCEPTIONS: Record<string, string[]> = {
  // Il record include `teams` (nomi degli atleti): la rotta lo azzera per chi
  // non è tesserato e toglie i rating a tutti (withoutRatings).
  "sessions/[sessionId]": ["trainingSession"],
  // Legge la partita intera ma risponde con un'immagine: il record non esce.
  "matches/[matchId]/tabellino": ["match"],
};

// ── Lettura dei sorgenti ──────────────────────────────────────────────────────

const API_ROOT = join(process.cwd(), "src", "app", "api");

function findRouteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return findRouteFiles(full);
    return /^route\.tsx?$/.test(name) ? [full] : [];
  });
}

function routeKey(file: string): string {
  return relative(API_ROOT, file)
    .split(sep)
    .join("/")
    .replace(/\/route\.tsx?$/, "");
}

const HAS_GET =
  /export\s+(async\s+function|const|function)\s+GET\b|export\s+const\s+\{[^}]*\bGET\b/;

/** Testo fra la parentesi aperta in `start` e la sua chiusura (esclusa). */
function balanced(src: string, start: number, open: string, close: string): string {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return src.slice(start + 1, i);
    }
  }
  return src.slice(start + 1);
}

/** Toglie i blocchi `omit: { ... }`: lì i campi riservati compaiono per essere esclusi. */
function withoutOmit(body: string): string {
  return body.replace(/\bomit:\s*\{[^}]*\}/g, "");
}

/** Corpo della funzione GET, o stringa vuota se è esportata in altro modo. */
function getBody(src: string): string {
  const at = src.search(/export\s+async\s+function\s+GET\s*\(/);
  if (at < 0) return "";
  const paramsStart = src.indexOf("(", at);
  const params = balanced(src, paramsStart, "(", ")");
  const bodyStart = src.indexOf("{", paramsStart + params.length + 2);
  return balanced(src, bodyStart, "{", "}");
}

/** Chiavi di primo livello di un oggetto letterale. */
function topLevelKeys(objectBody: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let token = "";
  for (const ch of objectBody) {
    if ("{[(".includes(ch)) depth++;
    else if ("}])".includes(ch)) depth--;
    if (depth === 0) {
      if (ch === ":") {
        const key = token
          .trim()
          .split(/[\s,]+/)
          .pop();
        if (key) keys.push(key);
        token = "";
      } else if (ch === ",") token = "";
      else token += ch;
    }
  }
  return keys;
}

/** Modelli letti interi (senza `select` né `omit`) dalle query Prisma del corpo. */
function fullRowModels(body: string): string[] {
  const models: string[] = [];
  const re = /prisma\.(\w+)\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow)\(/g;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    const argStart = body.indexOf("{", m.index + m[0].length - 1);
    if (argStart < 0) {
      models.push(m[1]);
      continue;
    }
    const keys = topLevelKeys(balanced(body, argStart, "{", "}"));
    if (!keys.includes("select") && !keys.includes("omit")) models.push(m[1]);
  }
  return models;
}

const routes = findRouteFiles(API_ROOT)
  .map((file) => ({ key: routeKey(file), src: readFileSync(file, "utf8") }))
  .filter((r) => HAS_GET.test(r.src));

// ── Test ──────────────────────────────────────────────────────────────────────

describe("inventario delle GET", () => {
  it("ogni rotta con GET è classificata, e ogni voce esiste ancora", () => {
    const found = routes.map((r) => r.key).sort();
    const listed = Object.keys(ROUTES).sort();
    expect(
      found.filter((k) => !listed.includes(k)),
      "rotte da classificare in ROUTES"
    ).toEqual([]);
    expect(
      listed.filter((k) => !found.includes(k)),
      "voci di ROUTES senza più una GET"
    ).toEqual([]);
  });

  it.each(routes.map((r) => [r.key, r] as const))(
    "%s ha il controllo del suo livello",
    (key, r) => {
      const required = REQUIRED[ROUTES[key]];
      if (required) expect(r.src, `${key} (${ROUTES[key]})`).toMatch(required);
    }
  );
});

describe("GET pubbliche", () => {
  const publicRoutes = routes.filter((r) => ROUTES[r.key] === "public");

  it.each(publicRoutes.map((r) => [r.key, withoutOmit(getBody(r.src))] as const))(
    "%s non seleziona campi riservati",
    (key, body) => {
      for (const pattern of FORBIDDEN_IN_PUBLIC) {
        expect(body, `${key}: ${pattern}`).not.toMatch(pattern);
      }
    }
  );

  it.each(publicRoutes.map((r) => [r.key, getBody(r.src)] as const))(
    "%s usa birthDate solo con le regole sui minori",
    (key, body) => {
      if (/\bbirthDate\b/.test(body)) expect(body, key).toMatch(MINORS_HELPERS);
    }
  );

  it.each(publicRoutes.map((r) => [r.key, getBody(r.src)] as const))(
    "%s non restituisce record interi di modelli riservati",
    (key, body) => {
      const allowed = new Set([...SAFE_FULL_ROW_MODELS, ...(EXCEPTIONS[key] ?? [])]);
      expect(
        fullRowModels(body).filter((m) => !allowed.has(m)),
        key
      ).toEqual([]);
    }
  );
});

// ── Pagine pubbliche ──────────────────────────────────────────────────────────

const APP_ROOT = join(process.cwd(), "src", "app");

/** Pagine e immagini fuori da admin e API, dove i dati finiscono nel payload. */
function findPublicPages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      return name === "api" || name === "admin" ? [] : findPublicPages(full);
    }
    return /^(page|layout|opengraph-image|twitter-image|sitemap)\.tsx?$/.test(name) ? [full] : [];
  });
}

/** Pagine che mostrano solo i dati di chi le apre. */
const SELF_PAGES = new Set(["profilo/page.tsx", "profilo/disponibilita/page.tsx"]);

const withoutComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const pages = findPublicPages(APP_ROOT).map((file) => ({
  key: relative(APP_ROOT, file).split(sep).join("/"),
  src: withoutComments(readFileSync(file, "utf8")),
}));

describe("pagine pubbliche", () => {
  it.each(pages.filter((p) => !SELF_PAGES.has(p.key)).map((p) => [p.key, p.src] as const))(
    "%s usa birthDate solo con @/lib/minors",
    (key, src) => {
      if (/\bbirthDate\b/.test(src)) expect(src, key).toMatch(/from "@\/lib\/minors"/);
    }
  );

  it.each(pages.map((p) => [p.key, p.src] as const))(
    "%s non legge il rating TrueSkill",
    (key, src) => {
      // Il TrueSkill è solo per coach e admin: fuori dal pannello non si legge.
      expect(src, key).not.toMatch(/\brating(Mu|Sigma)\b/);
    }
  );
});

describe("strumenti del test", () => {
  it("riconosce select e omit solo al primo livello", () => {
    expect(fullRowModels("prisma.user.findMany({ where: { a: 1 } })")).toEqual(["user"]);
    expect(fullRowModels("prisma.user.findMany({ select: { id: true } })")).toEqual([]);
    expect(fullRowModels("prisma.match.findMany({ omit: { x: true }, include: {} })")).toEqual([]);
    // `select` annidato dentro include non rende la query sicura
    expect(
      fullRowModels("prisma.match.findMany({ include: { team: { select: { name: true } } } })")
    ).toEqual(["match"]);
  });
});
