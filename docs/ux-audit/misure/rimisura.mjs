/**
 * Rimisura dell'audit UX di settembre 2026, nelle stesse condizioni.
 *
 * Uso (dalla radice del progetto, con il dev server avviato e ENABLE_TEST_LOGIN=true):
 *   node docs/ux-audit/misure/rimisura.mjs
 *   node docs/ux-audit/misure/rimisura.mjs --base=http://localhost:3001
 *
 * Scrive `test-results/ux-riaudit/misure-<data>.json` con la stessa forma di
 * `baseline-2026-09-24.json` (chiavi `axe` e `dom`) e stampa il confronto con
 * la baseline per le pagine presenti in entrambe.
 *
 * Condizioni dell'audit originale, da non cambiare se si vuole confrontare:
 * - desktop 1440×900 e mobile 390×844 (isMobile + hasTouch), locale it-IT;
 * - tema chiaro; solo le misure dal DOM dell'atleta su mobile erano in tema scuro
 *   (axe, target e tastiera sempre in chiaro);
 * - axe-core con tutte le gravità e i tag wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice;
 * - dev server, con gli strumenti di sviluppo visibili come allora;
 * - consenso cookie già dato (mappe rifiutate) e banner di installazione chiuso.
 *
 * Utenti: E2E_ATHLETE_EMAIL, E2E_ADMIN_EMAIL, UX_GUEST_EMAIL; se mancano, il
 * primo ATHLETE / ADMIN / GUEST del database. Gli URL con un id sono quelli
 * dell'audit se esistono ancora, altrimenti si ricavano dal database.
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
dotenv.config({ path: join(ROOT, ".env.test"), quiet: true });
dotenv.config({ path: join(ROOT, ".env"), quiet: true });

const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? "http://localhost:3000";
const PASSWORD = process.env.TEST_PASSWORD ?? "karibu-test";
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

// ─── Utenti e URL ─────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
async function firstEmail(appRole, env) {
  if (process.env[env]) return process.env[env];
  const u = await prisma.user.findFirst({
    where: { appRole },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });
  return u?.email ?? null;
}

async function exists(path) {
  // Le pagine admin chiedono il login: per quelle basta che la partita esista.
  const adminMatch = path.match(/^\/admin\/partite\/([^/]+)\//);
  if (adminMatch) {
    return !!(await prisma.match.findUnique({
      where: { id: adminMatch[1] },
      select: { id: true },
    }));
  }
  try {
    const r = await fetch(BASE + path, { redirect: "manual" });
    return r.status === 200;
  } catch {
    return false;
  }
}

// URL dell'audit originale e ricerca di riserva nel database.
async function pick(auditPath, fallback) {
  if (await exists(auditPath)) return auditPath;
  const alt = await fallback();
  if (!alt) console.warn(`! ${auditPath}: non risponde e non ho trovato un sostituto`);
  else console.warn(`! ${auditPath} non risponde, uso ${alt}`);
  return alt;
}

const now = new Date();
const trainingUrl = async (where, orderBy) => {
  const t = await prisma.trainingSession.findFirst({
    where,
    orderBy: { date: orderBy },
    select: { id: true, dateSlug: true },
  });
  return t ? `/allenamento/${t.dateSlug ?? t.id}` : null;
};
const matchWithResult = () =>
  prisma.match.findFirst({
    where: { date: { lt: now }, result: { not: null }, team: { isMixed: false } },
    orderBy: { date: "desc" },
    select: { id: true, slug: true },
  });

const U = {
  futureTraining: await pick("/allenamento/202706081800", () =>
    trainingUrl({ date: { gte: now } }, "asc")
  ),
  pastTraining: await pick("/allenamento/202607151800", () =>
    trainingUrl(
      { date: { lt: now }, registrations: { some: {} }, NOT: { title: { startsWith: "[UX]" } } },
      "desc"
    )
  ),
  playedMatch: await pick("/partite/montekki-vs-orsi-bassano-2026-06-30", async () => {
    const m = await matchWithResult();
    return m ? `/partite/${m.slug ?? m.id}` : null;
  }),
  futureMatch: await pick("/partite/karibu-vs-tigri-treviso-2026-10-02", async () => {
    const m = await prisma.match.findFirst({
      where: { date: { gte: now } },
      orderBy: { date: "asc" },
      select: { id: true, slug: true },
    });
    return m ? `/partite/${m.slug ?? m.id}` : null;
  }),
  player: await pick("/giocatori/marco-verdi", async () => {
    const html = await (await fetch(BASE + "/marcatori")).text();
    return html.match(/href="(\/giocatori\/[^"?]+)"/)?.[1] ?? null;
  }),
  stats: await pick("/admin/partite/cmq6bbt660005ky04tkaozesb/statistiche", async () => {
    const m = await matchWithResult();
    return m ? `/admin/partite/${m.id}/statistiche` : null;
  }),
  callups: await pick("/admin/partite/cmtwy4azq0005vuksz46u5xi2/convocazioni", async () => {
    const m = await prisma.match.findFirst({
      where: { date: { gte: now } },
      orderBy: { date: "asc" },
      select: { id: true },
    });
    return m ? `/admin/partite/${m.id}/convocazioni` : null;
  }),
};

// Stessi insiemi di pagine dell'audit (nomi uguali a quelli della baseline).
const P = (name, url, click) => ({ name, url, click });
const PUBLIC = [
  P("home", "/"),
  P("allenamenti", "/allenamenti"),
  P("allenamento_futuro", U.futureTraining),
  P("allenamento_passato", U.pastTraining),
  P("calendario", "/calendario"),
  P("partite", "/partite"),
  P("partita", U.futureMatch),
  P("partita_giocata", U.playedMatch),
  P("risultati", "/risultati"),
  P("squadre", "/squadre"),
  P("squadra", "/squadre", "main a[href^='/squadre/20']"),
  P("classifiche", "/classifiche"),
  P("marcatori", "/marcatori"),
  P("giocatore", U.player),
  P("news", "/news"),
  P("news_det", "/news", "main a[href^='/news/']"),
  P("eventi", "/eventi"),
  P("evento", "/eventi", "main a[href^='/eventi/']"),
  P("il-baskin", "/il-baskin"),
  P("faq", "/faq"),
  P("contatti", "/contatti"),
  P("sponsor", "/sponsor"),
  P("gallery", "/gallery"),
  P("login", "/login"),
  P("notfound", "/pagina-inesistente"),
];
const ATHLETE = [
  P("home", "/"),
  P("profilo", "/profilo"),
  P("disponibilita", "/profilo/disponibilita"),
  P("notifiche", "/notifiche"),
  P("allenamento_futuro", U.futureTraining),
  P("allenamento_passato", U.pastTraining),
  P("partita_giocata", U.playedMatch),
  P("sfida", "/squadre/sfida"),
];
const ADMIN = [
  P("dashboard", "/admin"),
  P("allenamenti", "/admin/allenamenti"),
  P("partite", "/admin/partite"),
  P("convocazioni", U.callups),
  P("statistiche", U.stats),
  P("eventi", "/admin/eventi"),
  P("squadre", "/admin/squadre"),
  P("gironi", "/admin/gironi"),
  P("avversarie", "/admin/avversarie"),
  P("news", "/admin/news"),
  P("gallery", "/admin/gallery"),
  P("utenti", "/admin/utenti"),
  P("metriche", "/admin/metriche"),
  P("sviluppo", "/admin/sviluppo"),
  P("audit", "/admin/audit"),
  P("esporta", "/admin/esporta"),
  P("suggerimenti", "/admin/suggerimenti"),
  P("nuovo_utente", "/admin/utenti/nuovo"),
];

// Le pagine su cui l'audit ha misurato anche axe, target e tastiera.
const AXE_SET = {
  anon: [
    "home",
    "allenamenti",
    "allenamento_futuro",
    "calendario",
    "partita_giocata",
    "risultati",
    "marcatori",
    "giocatore",
    "contatti",
    "login",
    "eventi",
  ],
  athlete: ["home", "profilo", "disponibilita", "allenamento_passato", "notifiche"],
  admin: ["dashboard", "allenamenti", "partite", "utenti", "statistiche"],
};

// `dom`: misure dal DOM (come le schermate dell'audit); `axe`: axe, target e tastiera.
const RUNS = [
  {
    who: "anon",
    label: "desktop anon",
    device: DESKTOP,
    scheme: "light",
    pages: PUBLIC,
    dom: true,
    axe: true,
  },
  {
    who: "anon",
    label: "mobile anon",
    device: MOBILE,
    scheme: "light",
    pages: PUBLIC,
    dom: true,
    axe: true,
  },
  {
    who: "guest",
    label: "desktop guest",
    device: DESKTOP,
    scheme: "light",
    pages: [P("home", "/"), P("profilo", "/profilo")],
    dom: true,
  },
  {
    who: "athlete",
    label: "desktop athlete",
    device: DESKTOP,
    scheme: "light",
    pages: ATHLETE,
    dom: true,
    axe: true,
  },
  // L'audit ha fotografato l'atleta su mobile in tema scuro, ma ha passato axe in chiaro.
  {
    who: "athlete",
    label: "mobile athlete",
    device: MOBILE,
    scheme: "dark",
    pages: ATHLETE,
    dom: true,
  },
  {
    who: "athlete",
    label: "mobile athlete",
    device: MOBILE,
    scheme: "light",
    pages: ATHLETE,
    axe: true,
  },
  {
    who: "admin",
    label: "desktop admin",
    device: DESKTOP,
    scheme: "light",
    pages: ADMIN,
    dom: true,
    axe: true,
  },
  {
    who: "admin",
    label: "mobile admin",
    device: MOBILE,
    scheme: "light",
    pages: ADMIN,
    dom: true,
    axe: true,
  },
];

const EMAILS = {
  anon: null,
  guest: await firstEmail("GUEST", "UX_GUEST_EMAIL"),
  athlete: await firstEmail("ATHLETE", "E2E_ATHLETE_EMAIL"),
  admin: await firstEmail("ADMIN", "E2E_ADMIN_EMAIL"),
};
await prisma.$disconnect();

// ─── Misure ───────────────────────────────────────────────────────────────────

function domMetrics() {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const all = [...document.querySelectorAll("body *")].filter(vis);
  const sizes = new Set();
  const weights = new Set();
  let tiny = 0;
  for (const el of all) {
    if (!hasText(el)) continue;
    const s = getComputedStyle(el);
    sizes.add(s.fontSize);
    weights.add(s.fontWeight);
    if (parseFloat(s.fontSize) < 12) tiny++;
  }
  const small32 = [...document.querySelectorAll("a,button,[role=button],input,select,[role=tab]")]
    .filter(vis)
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height < 32 || r.width < 32;
    }).length;
  return {
    dimensioniTesto: sizes.size,
    pesiTesto: weights.size,
    nodiTestoSotto12px: tiny,
    targetSotto32px: small32,
    altezzaPx: document.documentElement.scrollHeight,
    scrollOrizzontalePx: document.documentElement.scrollWidth - innerWidth,
    immaginiSenzaAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
  };
}

function touchTargets() {
  const els = [
    ...document.querySelectorAll("a,button,[role=button],input,select,[role=tab],[role=checkbox]"),
  ].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  const min = (e) => {
    const r = e.getBoundingClientRect();
    return Math.min(r.width, r.height);
  };
  return {
    totale: els.length,
    sotto44: els.filter((e) => min(e) < 44).length,
    sotto24: els.filter((e) => min(e) < 24).length,
  };
}

async function tabsToMain(page) {
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
  await page.mouse.click(1, 1).catch(() => {});
  await page.keyboard.press("Tab");
  for (let n = 1; n < 40; n++) {
    const inMain = await page.evaluate(
      () => !!document.activeElement?.closest("main,#main-content,[role=main]")
    );
    if (inMain) return n;
    await page.keyboard.press("Tab");
  }
  return ">40";
}

const out = { data: new Date().toISOString().slice(0, 10), base: BASE, urls: U, axe: {}, dom: {} };
const browser = await chromium.launch();

for (const run of RUNS) {
  const email = EMAILS[run.who];
  if (run.who !== "anon" && !email) {
    console.warn(`! nessun utente ${run.who}: salto ${run.label}`);
    continue;
  }
  const ctx = await browser.newContext({ ...run.device, colorScheme: run.scheme, locale: "it-IT" });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("kb-cookie-consent", JSON.stringify({ maps: false, v: 1 }));
      localStorage.setItem("kb-install-dismissed", String(Date.now()));
    } catch {}
  });
  if (run.scheme === "dark") {
    // Come in e2e/a11y.mjs: la preferenza si legge da questo cookie.
    await ctx.addCookies([{ name: "karibu-color-mode", value: "dark", url: BASE }]);
  }
  if (email) {
    const r = await ctx.request.post(BASE + "/api/test-login", {
      data: { email, password: PASSWORD },
    });
    if (!r.ok()) throw new Error(`login ${run.who}: ${r.status()} ${await r.text()}`);
  }
  const page = await ctx.newPage();
  const mobile = !!run.device.isMobile;

  for (const p of run.pages) {
    if (!p.url) continue;
    if (!run.dom && !AXE_SET[run.who]?.includes(p.name)) continue;
    try {
      await page.goto(BASE + p.url, { waitUntil: "networkidle", timeout: 90_000 });
      if (p.click) {
        await page.locator(p.click).first().click({ timeout: 5000 });
        await page.waitForLoadState("networkidle");
      }
      await page.waitForTimeout(800);
    } catch (e) {
      console.warn(`! ${run.label} ${p.name}: ${e.message.split("\n")[0]}`);
      continue;
    }

    if (run.dom) {
      out.dom[`${run.label} ${p.name}`] = {
        url: p.url + (p.click ? ` (poi clic su ${p.click})` : ""),
        ...(await page.evaluate(domMetrics)),
      };
    }

    if (run.axe && AXE_SET[run.who]?.includes(p.name)) {
      const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const entry = {
        regole: Object.fromEntries(
          res.violations.map((v) => [v.id, { impatto: v.impact, nodi: v.nodes.length }])
        ),
      };
      if (mobile) entry.target = await page.evaluate(touchTargets);
      else entry.tabPrimaDelContenuto = await tabsToMain(page);
      out.axe[`${mobile ? "mobile" : "desktop"} ${run.who} ${p.url}`] = entry;
    }
    process.stdout.write(".");
  }
  await ctx.close();
}
await browser.close();

const dir = join(ROOT, "test-results", "ux-riaudit");
mkdirSync(dir, { recursive: true });
const file = join(dir, `misure-${out.data}.json`);
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log(`\nScritto ${file}`);

// ─── Confronto con la baseline ────────────────────────────────────────────────

const base = JSON.parse(readFileSync(join(HERE, "baseline-2026-09-24.json"), "utf8"));
const grave = (e) =>
  Object.values(e.regole).reduce(
    (a, r) => a + (r.impatto === "critical" || r.impatto === "serious" ? r.nodi : 0),
    0
  );
const totale = (e) => Object.values(e.regole).reduce((a, r) => a + r.nodi, 0);
// Le chiavi axe contengono l'URL: si confrontano per profilo + nome di pagina.
const byName = (axe, dom) => {
  const m = {};
  for (const [k, v] of Object.entries(axe)) {
    const [vp, who, url] = k.split(" ");
    const label = `${vp} ${who}`;
    const name = Object.entries(dom).find(
      ([dk, dv]) => dk.startsWith(label + " ") && dv.url.split(" ")[0] === url
    )?.[0];
    m[name ?? k] = v;
  }
  return m;
};
const a0 = byName(base.axe, base.dom);
const a1 = byName(out.axe, out.dom);
const rows = [];
for (const k of Object.keys(a0)) {
  if (!a1[k]) continue;
  rows.push({
    pagina: k,
    "axe gravi prima": grave(a0[k]),
    "axe gravi ora": grave(a1[k]),
    "axe tutti prima": totale(a0[k]),
    "axe tutti ora": totale(a1[k]),
    "<44px prima": a0[k].target?.sotto44 ?? a0[k].tabPrimaDelContenuto ?? "",
    "<44px ora": a1[k].target?.sotto44 ?? a1[k].tabPrimaDelContenuto ?? "",
  });
}
console.log("\nAxe (per il desktop le ultime due colonne sono i Tab prima del contenuto)");
console.table(rows);
const drows = [];
for (const k of Object.keys(base.dom)) {
  if (!out.dom[k]) continue;
  const b = base.dom[k];
  const n = out.dom[k];
  drows.push({
    pagina: k,
    "dim. testo": `${b.dimensioniTesto} → ${n.dimensioniTesto}`,
    pesi: `${b.pesiTesto} → ${n.pesiTesto}`,
    "testo <12px": `${b.nodiTestoSotto12px} → ${n.nodiTestoSotto12px}`,
    "target <32px": `${b.targetSotto32px} → ${n.targetSotto32px}`,
    altezza: `${b.altezzaPx} → ${n.altezzaPx}`,
  });
}
console.log("\nMisure dal DOM");
console.table(drows);
