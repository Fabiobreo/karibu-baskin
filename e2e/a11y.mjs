/**
 * Controllo di accessibilità ripetibile (UX-01): `npm run a11y`.
 *
 * Misura con axe-core un insieme fisso di pagine, per tre profili (anonimo,
 * atleta, admin), due viewport (desktop 1440×900, mobile 390×844) e i due temi
 * (chiaro e scuro, UX-22: il contrasto va verificato in entrambi), contro un
 * server già in esecuzione (default http://localhost:3000, `A11Y_BASE_URL` per
 * cambiarlo) con `ENABLE_TEST_LOGIN=true`.
 *
 * Esce con codice 1 se compare una violazione `critical` o `serious` che non
 * è nella baseline (`e2e/a11y-baseline.json`). La chiave della baseline è
 * profilo + pagina + viewport + regola: una regola già nota che colpisce più
 * nodi di prima viene segnalata ma non fa fallire.
 *
 * Su mobile misura anche la larghezza (UX-20): a 360 px la pagina non deve
 * essere più larga dello schermo. Axe non lo vede e le schermate a pagina
 * intera nemmeno; una pagina che sborda fa fallire lo script, senza baseline.
 *
 * Opzioni:
 *   --update-baseline   riscrive la baseline con le violazioni gravi di adesso
 *   --only=anon,athlete filtra i profili
 *
 * Utenti: `E2E_ATHLETE_EMAIL` e `E2E_ADMIN_EMAIL` (come l'e2e). Se mancano, il
 * primo ATHLETE e il primo ADMIN del database per data di creazione.
 * Le pagine con un id (allenamento, partita, profilo) si ricavano dal database
 * o, per il profilo giocatore, dal primo link di /marcatori, così seguono le
 * regole di visibilità del sito.
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(ROOT, ".env.test"), quiet: true });
dotenv.config({ path: join(ROOT, ".env"), quiet: true });

const BASE_URL = process.env.A11Y_BASE_URL ?? "http://localhost:3000";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "karibu-test";
const BASELINE_PATH = join(ROOT, "e2e", "a11y-baseline.json");
const REPORT_DIR = join(ROOT, "test-results", "a11y");
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const GRAVE = new Set(["critical", "serious"]);

const DESKTOP = { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
// Il tema scuro si sceglie col cookie della preferenza (`karibu-color-mode`),
// non con `karibu-scheme`: in modalità "system" lo script in <head> riscrive
// quest'ultimo seguendo il sistema, che in Playwright è chiaro.
const VIEWPORTS = [
  { name: "desktop", ...DESKTOP, scheme: "light" },
  { name: "mobile", ...MOBILE, scheme: "light" },
  { name: "desktop-dark", ...DESKTOP, scheme: "dark" },
  { name: "mobile-dark", ...MOBILE, scheme: "dark" },
];

const args = process.argv.slice(2);
const UPDATE_BASELINE = args.includes("--update-baseline");
const ONLY = args
  .find((a) => a.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",");

// Strumenti di sviluppo: il bottone di React Query e l'indicatore di Next
// producono falsi `target-size` e non esistono in produzione.
// Animazioni ferme: il nastro sponsor scorre, e senza fermarlo la sovrapposizione
// con i bottoni vicini (quindi `target-size`) cambierebbe da un giro all'altro.
const SCAN_CSS = `
  nextjs-portal, .tsqd-parent-container, .tsqd-open-btn-container { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
`;

// Il telefono più stretto su cui misurare lo sbordamento orizzontale (UX-20).
const NARROW_WIDTH = 360;

const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

// ─── URL dinamici ───────────────────────────────────────────────────────────

async function resolveTargets(prisma) {
  const now = new Date();
  const [upcoming, lastTraining, pastTraining, match, admin, athlete] = await Promise.all([
    prisma.trainingSession.findFirst({
      where: { date: { gte: now } },
      orderBy: { date: "asc" },
      select: { id: true, dateSlug: true },
    }),
    prisma.trainingSession.findFirst({
      where: { date: { lt: now } },
      orderBy: { date: "desc" },
      select: { id: true, dateSlug: true },
    }),
    prisma.trainingSession.findFirst({
      // Esclusi gli allenamenti del seed UX-26: non hanno squadre, e la pagina
      // misurata perderebbe proprio le parti che si vedono dopo l'allenamento.
      where: {
        date: { lt: now },
        registrations: { some: {} },
        NOT: { title: { startsWith: "[UX]" } },
      },
      orderBy: { date: "desc" },
      select: { id: true, dateSlug: true },
    }),
    prisma.match.findFirst({
      where: { date: { lt: now }, result: { not: null }, team: { isMixed: false } },
      orderBy: { date: "desc" },
      select: { id: true, slug: true },
    }),
    process.env.E2E_ADMIN_EMAIL
      ? { email: process.env.E2E_ADMIN_EMAIL }
      : prisma.user.findFirst({
          where: { appRole: "ADMIN" },
          orderBy: { createdAt: "asc" },
          select: { email: true },
        }),
    process.env.E2E_ATHLETE_EMAIL
      ? { email: process.env.E2E_ATHLETE_EMAIL }
      : prisma.user.findFirst({
          where: {
            appRole: "ATHLETE",
            sportRole: { not: null },
            NOT: { email: { endsWith: "@sim.test" } },
          },
          orderBy: { createdAt: "asc" },
          select: { email: true },
        }),
  ]);
  const training = upcoming ?? lastTraining;
  return {
    training: training ? `/allenamento/${training.dateSlug ?? training.id}` : null,
    pastTraining: pastTraining ? `/allenamento/${pastTraining.dateSlug ?? pastTraining.id}` : null,
    match: match ? `/partite/${match.slug ?? match.id}` : null,
    matchStats: match ? `/admin/partite/${match.id}/statistiche` : null,
    adminEmail: admin?.email ?? null,
    athleteEmail: athlete?.email ?? null,
  };
}

/** Primo profilo giocatore linkato da /marcatori (visibile a un anonimo). */
async function resolvePlayerProfile(browser) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  try {
    const page = await context.newPage();
    await gotoWithRetry(page, "/marcatori");
    const href = await page
      .locator('a[href^="/giocatori/"]:not([href^="/giocatori/confronta"])')
      .first()
      .getAttribute("href", { timeout: 5_000 })
      .catch(() => null);
    return href;
  } finally {
    await context.close();
  }
}

// ─── Navigazione e misura ───────────────────────────────────────────────────

/**
 * Turbopack alla prima richiesta di una rotta può servire una pagina di
 * compilazione o andare in timeout: si riprova finché la risposta è stabile.
 */
async function gotoWithRetry(page, path, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await page.goto(path, { waitUntil: "load", timeout: 90_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      if (!res || res.status() >= 500) {
        lastError = new Error(`HTTP ${res?.status()}`);
        continue;
      }
      // Ogni pagina vera passa dal layout radice, che ha <main id="contenuto">.
      // Senza, è una schermata intermedia del dev server: si riprova.
      const ready = await page
        .waitForSelector("main#contenuto", { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!ready) {
        lastError = new Error("pagina senza <main id=contenuto>");
        continue;
      }
      // Sezioni in Suspense: si misura il contenuto, non lo skeleton.
      await page
        .waitForFunction(() => !document.querySelector(".MuiSkeleton-root"), null, {
          timeout: 15_000,
        })
        .catch(() => {});
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function newContext(browser, vp, email) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: vp.viewport,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  });
  await context.addCookies([{ name: "karibu-color-mode", value: vp.scheme, url: BASE_URL }]);
  // Immagini esterne (foto Google, Vercel Blob) servite con un PNG locale:
  // l'Avatar MUI mette il suo <img> solo a caricamento riuscito, quindi con la
  // rete vera le violazioni sulle immagini cambierebbero da un giro all'altro.
  await context.route(
    (url) => !url.href.startsWith(BASE_URL),
    (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({ contentType: "image/png", body: PIXEL_PNG })
        : route.continue()
  );
  // Consenso cookie già dato: il banner coprirebbe la pagina e verrebbe misurato ovunque.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("kb-cookie-consent", JSON.stringify({ maps: false, v: 1 }));
    } catch {}
  });
  if (email) {
    const res = await context.request.post("/api/test-login", {
      data: { email, password: TEST_PASSWORD },
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok()) {
      throw new Error(`Test login fallito per ${email} (${res.status()}): ${await res.text()}`);
    }
  }
  return context;
}

async function scan(page) {
  // Con lo streaming Next inserisce il <title> dopo il `load`: misurare prima
  // dà `document-title` a intermittenza.
  await page
    .waitForFunction(() => document.title.trim() !== "", null, { timeout: 5_000 })
    .catch(() => {});
  await page.addStyleTag({ content: SCAN_CSS });
  const results = await new AxeBuilder({ page }).withTags(TAGS).exclude("nextjs-portal").analyze();
  return results.violations
    .map((v) => {
      // "Vai al contenuto" è ritagliato a 1px finché non riceve il focus:
      // per target-size è un falso positivo.
      const nodes =
        v.id === "target-size"
          ? v.nodes.filter((n) => !n.html.includes('href="#contenuto"'))
          : v.nodes;
      return {
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: nodes.length,
        targets: nodes.slice(0, 5).map((n) => n.target.join(" ")),
      };
    })
    .filter((v) => v.nodes > 0);
}

/**
 * Larghezza della pagina a NARROW_WIDTH. Con `isMobile` il viewport di layout
 * segue il contenuto, quindi si confronta `scrollWidth` con la larghezza
 * impostata, non con `clientWidth`. Se sborda, restituisce anche gli elementi
 * più a destra che non stanno dentro un antenato con `overflow` nascosto.
 */
async function measureOverflow(page, vp) {
  await page.setViewportSize({ width: NARROW_WIDTH, height: vp.viewport.height });
  try {
    await page.waitForTimeout(300);
    return await page.evaluate((limit) => {
      const width = document.documentElement.scrollWidth;
      if (width <= limit) return { width, culprits: [] };
      const contained = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (["hidden", "clip", "auto", "scroll"].includes(cs.overflowX)) return true;
          if (cs.position === "fixed") return true;
        }
        return false;
      };
      const culprits = [...document.body.querySelectorAll("*")]
        .filter((el) => getComputedStyle(el).position !== "fixed")
        .filter((el) => el.getBoundingClientRect().right > limit + 1 && !contained(el))
        .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
        .slice(0, 3)
        .map((el) => {
          const cls = String(el.className).split(" ").slice(0, 2).join(".");
          const text = el.textContent.trim().slice(0, 30);
          const right = Math.round(el.getBoundingClientRect().right);
          return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""} "${text}" → ${right}px`;
        });
      return { width, culprits };
    }, NARROW_WIDTH);
  } finally {
    await page.setViewportSize(vp.viewport);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient();
  const targets = await resolveTargets(prisma).finally(() => prisma.$disconnect());

  const browser = await chromium.launch();
  const playerProfile = await resolvePlayerProfile(browser).catch(() => null);

  const profiles = [
    {
      name: "anon",
      email: null,
      pages: [
        ["home", "/"],
        ["allenamenti", "/allenamenti"],
        ["allenamento", targets.training],
        ["calendario", "/calendario"],
        ["partita", targets.match],
        ["risultati", "/risultati"],
        ["marcatori", "/marcatori"],
        ["giocatore", playerProfile],
        ["contatti", "/contatti"],
        ["login", "/login"],
        ["eventi", "/eventi"],
      ],
    },
    {
      name: "athlete",
      email: targets.athleteEmail,
      pages: [
        ["home", "/"],
        ["profilo", "/profilo"],
        ["disponibilita", "/profilo/disponibilita"],
        ["allenamento-passato", targets.pastTraining],
        ["notifiche", "/notifiche"],
      ],
    },
    {
      name: "admin",
      email: targets.adminEmail,
      pages: [
        ["dashboard", "/admin"],
        ["allenamenti", "/admin/allenamenti"],
        ["partite", "/admin/partite"],
        ["utenti", "/admin/utenti"],
        ["statistiche-partita", targets.matchStats],
      ],
    },
  ].filter((p) => !ONLY || ONLY.includes(p.name));

  const report = [];
  const skipped = [];

  for (const profile of profiles) {
    if (profile.name !== "anon" && !profile.email) {
      skipped.push(
        `${profile.name}: nessun utente (imposta E2E_${profile.name.toUpperCase()}_EMAIL)`
      );
      continue;
    }
    for (const vp of VIEWPORTS) {
      const context = await newContext(browser, vp, profile.email);
      const page = await context.newPage();
      for (const [label, path] of profile.pages) {
        if (!path) {
          if (vp === VIEWPORTS[0]) skipped.push(`${profile.name}/${label}: nessun dato nel DB`);
          continue;
        }
        process.stdout.write(`${profile.name.padEnd(8)} ${vp.name.padEnd(12)} ${path} … `);
        try {
          await gotoWithRetry(page, path);
          const violations = await scan(page);
          // La larghezza non dipende dal tema: basta misurarla in chiaro.
          const measured =
            vp.isMobile && vp.scheme === "light" ? await measureOverflow(page, vp) : null;
          const overflow = measured && measured.width > NARROW_WIDTH ? measured : null;
          report.push({
            profile: profile.name,
            page: label,
            path,
            viewport: vp.name,
            violations,
            ...(overflow ? { overflow } : {}),
          });
          const grave = violations.filter((v) => GRAVE.has(v.impact)).length;
          const wide = overflow ? `, SBORDA: ${overflow.width}px a ${NARROW_WIDTH}px` : "";
          console.log(`${violations.length} regole violate (${grave} gravi)${wide}`);
        } catch (err) {
          console.log(`ERRORE: ${err.message.split("\n")[0]}`);
          report.push({
            profile: profile.name,
            page: label,
            path,
            viewport: vp.name,
            error: String(err.message).split("\n")[0],
          });
        }
      }
      await context.close();
    }
  }
  await browser.close();

  // ─── Riepilogo ────────────────────────────────────────────────────────────

  console.log("\n══ Riepilogo ══");
  for (const r of report) {
    console.log(`\n${r.profile} · ${r.page} · ${r.viewport}  (${r.path})`);
    if (r.error) {
      console.log(`  errore: ${r.error}`);
      continue;
    }
    if (r.overflow) {
      console.log(`  SBORDA    larga ${r.overflow.width}px a ${NARROW_WIDTH}px`);
      for (const c of r.overflow.culprits) console.log(`            ${c}`);
    }
    if (r.violations.length === 0) console.log("  nessuna violazione");
    for (const v of r.violations) {
      console.log(`  ${(v.impact ?? "-").padEnd(9)} ${v.id.padEnd(28)} ${v.nodes} nodi`);
    }
  }
  if (skipped.length) {
    console.log("\nSaltati:");
    for (const s of skipped) console.log(`  ${s}`);
  }

  mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = join(REPORT_DIR, "report.json");
  writeFileSync(
    reportPath,
    JSON.stringify({ baseUrl: BASE_URL, date: new Date(), report }, null, 2)
  );
  console.log(`\nReport completo: ${reportPath}`);

  // ─── Baseline ─────────────────────────────────────────────────────────────

  const current = {};
  for (const r of report) {
    for (const v of r.violations ?? []) {
      if (!GRAVE.has(v.impact)) continue;
      current[`${r.profile}|${r.page}|${r.viewport}|${v.id}`] = {
        impact: v.impact,
        nodes: v.nodes,
      };
    }
  }

  const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : {};
  const measured = new Set(profiles.map((p) => p.name));
  const isMeasured = (key) => measured.has(key.split("|")[0]);

  if (UPDATE_BASELINE) {
    // Con --only si riscrivono solo i profili misurati: gli altri restano come sono.
    const kept = Object.entries(baseline).filter(([k]) => !isMeasured(k));
    const sorted = Object.fromEntries(
      [...kept, ...Object.entries(current)].sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + "\n");
    console.log(`Baseline aggiornata: ${Object.keys(sorted).length} voci in ${BASELINE_PATH}`);
    return 0;
  }

  const nuove = [];
  const peggiorate = [];
  for (const [key, v] of Object.entries(current)) {
    if (!baseline[key]) nuove.push(`${key} (${v.impact}, ${v.nodes} nodi)`);
    else if (v.nodes > baseline[key].nodes)
      peggiorate.push(`${key}: ${baseline[key].nodes} → ${v.nodes} nodi`);
  }
  const risolte = Object.keys(baseline).filter((k) => isMeasured(k) && !current[k]);
  const errori = report.filter((r) => r.error);
  const larghe = report.filter((r) => r.overflow);

  if (peggiorate.length) {
    console.log("\nRegole già in baseline che colpiscono più nodi (non bloccante):");
    for (const p of peggiorate) console.log(`  ${p}`);
  }
  if (risolte.length) {
    console.log(
      `\n${risolte.length} voci della baseline non compaiono più: aggiornala con --update-baseline.`
    );
  }
  if (errori.length) {
    console.log(`\n${errori.length} pagine non misurate per errore.`);
  }
  if (larghe.length) {
    console.log(`\nPagine più larghe dello schermo a ${NARROW_WIDTH}px (UX-20):`);
    for (const r of larghe) console.log(`  ${r.profile} · ${r.page}: ${r.overflow.width}px`);
  }
  if (nuove.length) {
    console.log("\nNuove violazioni gravi (non in baseline):");
    for (const n of nuove) console.log(`  ${n}`);
    return 1;
  }
  console.log("\nNessuna nuova violazione grave.");
  return errori.length || larghe.length ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
