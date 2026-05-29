import { prisma } from "@/lib/db";

/**
 * Converte una stringa in un slug URL-safe.
 * es. "Mario Rossi" → "mario-rossi", "Élodie Müller" → "elodie-muller"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // decompone i caratteri accentati
    .replace(/[\u0300-\u036f]/g, "") // rimuove i diacritici
    .replace(/[^a-z0-9\s_-]/g, "") // rimuove tutto tranne lettere, cifre, spazi, underscore, trattini
    .trim()
    .replace(/[\s_]+/g, "-") // sostituisce spazi e underscore con trattini
    .replace(/-+/g, "-") // collassa trattini multipli
    .replace(/^-+|-+$/g, ""); // rimuove trattini iniziali/finali
}

/**
 * Genera uno slug univoco per un utente a partire dal nome.
 * Se "mario-rossi" esiste già, prova "mario-rossi-2", "mario-rossi-3", ecc.
 * Restituisce stringa vuota se il nome non produce uno slug valido.
 */
export async function generateUserSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) return "";

  // Prova il base slug
  const existing = await prisma.user.findUnique({ where: { slug: base } });
  if (!existing) return base;

  // Trova il primo suffix libero
  let n = 2;
  while (n < 1000) {
    const candidate = `${base}-${n}`;
    const found = await prisma.user.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    n++;
  }
  return ""; // fallback estremo (non dovrebbe mai succedere)
}

/**
 * Genera uno slug univoco per un figlio a partire dal nome (modello Child).
 * Se "mario-rossi" esiste già, prova "mario-rossi-2", ecc.
 */
export async function generateChildSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) return "";

  const existing = await prisma.child.findUnique({ where: { slug: base } });
  if (!existing) return base;

  let n = 2;
  while (n < 1000) {
    const candidate = `${base}-${n}`;
    const found = await prisma.child.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    n++;
  }
  return "";
}

/**
 * Genera il dateSlug per una TrainingSession a partire dai valori locali del form.
 * es. date="2025-03-15", time="18:00" → "2025-03-15T18:00"
 */
export function sessionDateSlug(date: string, time: string): string {
  return `${date}T${time}`;
}

/**
 * Genera uno slug univoco per una squadra avversaria a partire dal nome.
 * Se "basket-vicenza" esiste già, prova "basket-vicenza-2", "basket-vicenza-3", ecc.
 * Restituisce stringa vuota se il nome non produce uno slug valido.
 */
export async function generateOpposingTeamSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) return "";

  const existing = await prisma.opposingTeam.findUnique({ where: { slug: base } });
  if (!existing) return base;

  let n = 2;
  while (n < 1000) {
    const candidate = `${base}-${n}`;
    const found = await prisma.opposingTeam.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    n++;
  }
  return "";
}

/**
 * Genera uno slug univoco per un girone a partire da stagione e nome.
 * es. season="2025-26", name="Girone A Ovest" → "2025-26-girone-a-ovest"
 */
export async function generateGroupSlug(name: string, season: string): Promise<string> {
  const base = slugify(`${season} ${name}`);
  if (!base) return "";

  const existing = await prisma.group.findUnique({ where: { slug: base } });
  if (!existing) return base;

  let n = 2;
  while (n < 1000) {
    const candidate = `${base}-${n}`;
    const found = await prisma.group.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    n++;
  }
  return "";
}

/**
 * Genera uno slug univoco per un Post a partire dal titolo.
 */
export async function generatePostSlug(title: string): Promise<string> {
  const base = slugify(title);
  if (!base) return cuid();

  const existing = await prisma.post.findUnique({ where: { slug: base } });
  if (!existing) return base;

  let n = 2;
  while (n < 1000) {
    const candidate = `${base}-${n}`;
    const found = await prisma.post.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    n++;
  }
  return base;
}

function cuid(): string {
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Genera uno slug univoco per una partita.
 * Formato: "{team-slug}-vs-{opponent-slug}-{YYYY-MM-DD}"
 * Se esiste già, aggiunge suffisso numerico: "-2", "-3", ecc.
 */
export async function generateMatchSlug(
  teamName: string,
  opponentName: string,
  date: Date
): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const base = `${slugify(teamName)}-vs-${slugify(opponentName)}-${dateStr}`;

  const existing = await prisma.match.findUnique({ where: { slug: base } });
  if (!existing) return base;

  let n = 2;
  while (n < 1000) {
    const candidate = `${base}-${n}`;
    const found = await prisma.match.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    n++;
  }
  return base; // fallback (non dovrebbe mai succedere)
}
