/**
 * Conteggi statici sul codice, gli stessi usati dall'audit UX di settembre 2026.
 *
 * Uso (dalla radice del progetto):  node docs/ux-audit/misure/misura-codice.mjs
 *
 * Sono ricerche con espressioni regolari, non un'analisi del codice: servono
 * a confrontare l'andamento fra due momenti, non a contare con esattezza.
 * Le regex sono quelle dell'audit originale, per rendere i numeri confrontabili.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = join(ROOT, "src");

function walk(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(f) && !/\.stories\.|\.test\./.test(f)) acc.push(p);
  }
  return acc;
}

const files = walk(SRC);
const count = {};
const filesWith = {};
const inc = (key, n, file) => {
  if (!n) return;
  count[key] = (count[key] ?? 0) + n;
  (filesWith[key] ??= new Set()).add(file);
};

for (const f of files) {
  const t = readFileSync(f, "utf8");
  const rel = f.slice(ROOT.length + 1);
  const isTheme = /theme\.ts$|heroStyles\.ts$|typeScale\.ts$/.test(f);

  // Tipografia (UX-10, UX-27): all'audit 967 letterali, 0,6-0,68 rem in circa 180.
  // Le righe con un'icona MUI si contano a parte: la dimensione di un'icona
  // non è testo e la regola ESLint di UX-27 non la riguarda.
  for (const line of t.split("\n")) {
    const n = (line.match(/fontSize:\s*["'`{]?[\d.]+(rem|px|em)?/g) ?? []).length;
    inc(/Icon\b/.test(line) ? "fontSize letterali su icone" : "fontSize letterali", n, rel);
  }
  inc(
    "fontSize sotto 0,75rem",
    (t.match(/fontSize:\s*["'`]0\.(5\d|6\d|7[0-4])rem/g) ?? []).length,
    rel
  );
  inc(
    "fontWeight 700-900 a mano",
    (t.match(/fontWeight:\s*["']?(700|800|900)/g) ?? []).length,
    rel
  );

  // Grigio come testo (UX-09): all'audit 293 usi in 96 file.
  inc("text.disabled", (t.match(/text\.disabled/g) ?? []).length, rel);

  // Link dentro bottoni (UX-04): all'audit 42.
  inc(
    "<Link><Button>",
    (t.match(/<(Link|NextLink)\b[^>]*>\s*<(Button|IconButton)\b/g) ?? []).length,
    rel
  );

  // Colori scritti a mano fuori dal tema.
  if (!isTheme)
    inc(
      "colori esadecimali fuori dal tema",
      (t.match(/["'`]#[0-9A-Fa-f]{3,8}\b/g) ?? []).length,
      rel
    );

  // Zoom bloccato (UX-02).
  inc("maximumScale", (t.match(/maximumScale\s*:/g) ?? []).length, rel);
}

const rows = Object.keys(count)
  .sort()
  .map((k) => ({ misura: k, occorrenze: count[k], file: filesWith[k].size }));
for (const k of ["maximumScale", "<Link><Button>", "text.disabled"]) {
  if (!count[k]) rows.push({ misura: k, occorrenze: 0, file: 0 });
}
console.log(`File analizzati in src/: ${files.length}`);
console.table(rows);
