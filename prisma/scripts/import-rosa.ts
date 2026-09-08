/**
 * Import della rosa di una stagione da CSV.
 *
 *   npx tsx prisma/scripts/import-rosa.ts                      # dry-run (default)
 *   npx tsx prisma/scripts/import-rosa.ts --apply              # scrive davvero
 *   npx tsx prisma/scripts/import-rosa.ts --apply --season 2025-26 --file prisma/scripts/rosa-2025-26.csv
 *
 * Scrive DIRETTAMENTE su Prisma, senza passare dalle API: le route di dominio
 * inviano push e notifiche in-app, che per un caricamento massivo significherebbe
 * bombardare tutti. Qui non parte nessuna notifica.
 *
 * Idempotente: ri-eseguibile senza creare duplicati (upsert su chiavi naturali,
 * `User.email` e `TeamMembership[teamId,userId|childId]`). Non cancella nulla e
 * non tocca campi già valorizzati a mano dallo staff (nome, ruolo, immagine).
 *
 * Il CSV NON è versionato (`prisma/scripts/*.csv` è in .gitignore): contiene nome,
 * cognome ed email di persone reali, minori compresi, e questa repo è pubblica.
 * Va tenuto solo in locale.
 *
 * Formato CSV — colonne: squadra,ruolo,cognome,nome,email,tipo,nome_genitore
 *   tipo = "atleta"   → l'email è dell'atleta       → User(ATHLETE) + TeamMembership
 *   tipo = "genitore" → l'email è di un familiare   → User(PARENT) + Child(atleta) + TeamMembership sul Child
 *   nome_genitore     → nome del genitore (solo se tipo=genitore). Se vuoto, si
 *                       usa un segnaposto "Genitore di <atleta>", da correggere poi in admin.
 */
import { readFileSync } from "node:fs";
import { prisma } from "../../src/lib/db";
import { generateUserSlug, generateChildSlug } from "../../src/lib/slugUtils";
import { getCurrentSeason } from "../../src/lib/season/seasonUtils";
import type { AppRole } from "@prisma/client";

// ── Configurazione squadre (dalle pagine 3 e 4 del foglio societario) ──────────
const TEAMS: Record<string, { championship: string; color: string }> = {
  Montekki: { championship: "Silver", color: "#E65100" },
  Kapuleti: { championship: "Gold", color: "#1A1A1A" },
};

interface Row {
  squadra: string;
  ruolo: string;
  cognome: string;
  nome: string;
  email: string;
  tipo: string;
  nome_genitore: string;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  return {
    apply: argv.includes("--apply"),
    // `isCurrent` è ESCLUSIVA (vedi /api/competitive-teams/seasons/current) e decide
    // cosa il sito considera archivio. Di default non la tocchiamo: importare una
    // stagione passata non deve spostare il sito indietro nel tempo.
    current: argv.includes("--current"),
    season: get("--season", "2025-26"),
    file: get("--file", "prisma/scripts/rosa-2025-26.csv"),
  };
}

function parseCsv(path: string): Row[] {
  const lines = readFileSync(path, "utf-8").trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])) as unknown as Row;
  });
}

async function main() {
  const { apply, current, season, file } = parseArgs();
  const rows = parseCsv(file);

  console.log(
    `\n${apply ? "APPLY" : "DRY-RUN"} — stagione ${season}, ${rows.length} righe da ${file}`
  );
  if (!apply) console.log("(nessuna scrittura: rilancia con --apply per applicare)\n");

  // Validazione preliminare: meglio fermarsi prima di scrivere metà rosa.
  const errors: string[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const n = i + 2; // riga nel file, header incluso
    if (!TEAMS[r.squadra]) errors.push(`riga ${n}: squadra sconosciuta "${r.squadra}"`);
    if (!/^[1-5]$/.test(r.ruolo)) errors.push(`riga ${n}: ruolo non valido "${r.ruolo}"`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
      errors.push(`riga ${n}: email non valida "${r.email}"`);
    if (!["atleta", "genitore"].includes(r.tipo))
      errors.push(`riga ${n}: tipo "${r.tipo}" (atteso atleta|genitore)`);
    if (!r.cognome || !r.nome) errors.push(`riga ${n}: nome o cognome mancante`);
    const key = `${r.email}|${r.cognome} ${r.nome}`;
    if (seen.has(key)) errors.push(`riga ${n}: duplicato ${key}`);
    seen.add(key);
  });
  if (errors.length) {
    console.error(`\n${errors.length} errori nel CSV:`);
    errors.forEach((e) => console.error("  ·", e));
    process.exit(1);
  }

  const stats = { seasons: 0, teams: 0, users: 0, children: 0, memberships: 0 };

  // ── 1. Stagione ─────────────────────────────────────────────────────────────
  if (apply) {
    if (current) {
      // Stessa semantica dell'endpoint seasons/current: una sola corrente alla volta.
      await prisma.season.updateMany({ data: { isCurrent: false } });
    }
    await prisma.season.upsert({
      where: { label: season },
      update: current ? { isCurrent: true } : {},
      create: { label: season, isCurrent: current },
    });
  }
  stats.seasons++;
  const currentLabel = (await prisma.season.findFirst({ where: { isCurrent: true } }))?.label;
  console.log(
    `Stagione ${season}${current ? " → marcata come CORRENTE" : ""}` +
      (!current && currentLabel && currentLabel !== season
        ? `  (la corrente resta ${currentLabel})`
        : "")
  );
  if (!current && season !== getCurrentSeason()) {
    console.log(
      `  nota: oggi la stagione in corso sarebbe ${getCurrentSeason()}; ` +
        `passa --current solo se vuoi che il sito consideri ${season} come attuale.`
    );
  }

  // ── 2. Squadre ──────────────────────────────────────────────────────────────
  const teamIds = new Map<string, string>();
  for (const [name, cfg] of Object.entries(TEAMS)) {
    if (!rows.some((r) => r.squadra === name)) continue;
    const existing = await prisma.competitiveTeam.findFirst({ where: { name, season } });
    if (existing) {
      teamIds.set(name, existing.id);
      console.log(`  = squadra ${name} (${season}) già presente`);
    } else if (apply) {
      const created = await prisma.competitiveTeam.create({
        data: { name, season, championship: cfg.championship, color: cfg.color },
      });
      teamIds.set(name, created.id);
      stats.teams++;
      console.log(`  + squadra ${name} (${season}, ${cfg.championship})`);
    } else {
      teamIds.set(name, `dry-run:${name}`);
      stats.teams++;
      console.log(`  + squadra ${name} (${season}, ${cfg.championship})`);
    }
  }

  // ── 3. Persone + appartenenze ───────────────────────────────────────────────
  for (const r of rows) {
    const fullName = `${r.cognome} ${r.nome}`;
    const sportRole = parseInt(r.ruolo, 10);
    const teamId = teamIds.get(r.squadra)!;

    if (r.tipo === "atleta") {
      // L'email è dell'atleta: un solo User, ruolo ATHLETE.
      const existing = await prisma.user.findUnique({ where: { email: r.email } });
      let userId = existing?.id;

      if (!existing) {
        console.log(`  + atleta  ${fullName.padEnd(26)} ${r.email}  R${sportRole}  [${r.squadra}]`);
        if (apply) {
          const slug = await generateUserSlug(fullName);
          const created = await prisma.user.create({
            data: {
              name: fullName,
              email: r.email,
              appRole: "ATHLETE" as AppRole,
              sportRole,
              slug,
            },
          });
          userId = created.id;
        }
        stats.users++;
      } else {
        console.log(`  = atleta  ${fullName.padEnd(26)} ${r.email}  (già presente, non toccato)`);
      }

      if (apply && userId) {
        await prisma.teamMembership.upsert({
          where: { teamId_userId: { teamId, userId } },
          update: {},
          create: { teamId, userId },
        });
        stats.memberships++;
      } else if (!apply) {
        stats.memberships++;
      }
    } else {
      // L'email è di un familiare: User PARENT (l'adulto) + Child (l'atleta).
      const parentName = r.nome_genitore.trim() || `Genitore di ${fullName}`;
      const existingParent = await prisma.user.findUnique({ where: { email: r.email } });
      let parentId = existingParent?.id;

      if (!existingParent) {
        console.log(`  + genitore ${parentName.padEnd(25)} ${r.email}`);
        if (apply) {
          const slug = await generateUserSlug(parentName);
          const created = await prisma.user.create({
            data: { name: parentName, email: r.email, appRole: "PARENT" as AppRole, slug },
          });
          parentId = created.id;
        }
        stats.users++;
      } else {
        console.log(
          `  = genitore ${(existingParent.name ?? parentName).padEnd(25)} ${r.email}  (già presente)`
        );
      }

      // Child: nessuna chiave unica naturale, si cerca per genitore + nome.
      let childId: string | undefined;
      if (parentId) {
        const existingChild = await prisma.child.findFirst({
          where: { parentId, name: fullName },
        });
        childId = existingChild?.id;
        if (!existingChild) {
          console.log(`    + atleta ${fullName.padEnd(24)} R${sportRole}  [${r.squadra}]`);
          if (apply) {
            const slug = await generateChildSlug(fullName);
            const created = await prisma.child.create({
              data: { parentId, name: fullName, sportRole, slug },
            });
            childId = created.id;
          }
          stats.children++;
        } else {
          console.log(`    = atleta ${fullName.padEnd(24)} (già presente, non toccato)`);
        }
      } else {
        stats.children++; // dry-run: il genitore non esiste ancora
        console.log(`    + atleta ${fullName.padEnd(24)} R${sportRole}  [${r.squadra}]`);
      }

      if (apply && childId) {
        await prisma.teamMembership.upsert({
          where: { teamId_childId: { teamId, childId } },
          update: {},
          create: { teamId, childId },
        });
        stats.memberships++;
      } else if (!apply) {
        stats.memberships++;
      }
    }
  }

  console.log(
    `\n${apply ? "Applicato" : "Da applicare"}: ` +
      `${stats.teams} squadre, ${stats.users} utenti, ${stats.children} figli, ` +
      `${stats.memberships} appartenenze.`
  );
  if (!apply) console.log("Rilancia con --apply per scrivere sul database.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
