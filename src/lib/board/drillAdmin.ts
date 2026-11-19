import type { Prisma } from "@prisma/client";
import { revalidateTag, unstable_cache } from "next/cache";
import { logAudit, type AuditAction } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugUtils";
import { PUBLIC_TEAM_WHERE } from "@/lib/matches/mixedTeam";
import { EXERCISE_KINDS, RESERVED_DRILL_SLUGS } from "./category";

/**
 * Letture e scritture del Playbook (UX-72) condivise da rotte e
 * pagine. Chi ha creato o modificato uno schema resta nel database (registro e
 * pannello), ma non esce mai verso i tesserati: per loro c'e' `DRILL_PUBLIC_SELECT`.
 */

/** Campi che vede un tesserato. */
export const DRILL_PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  kind: true,
  court: true,
  description: true,
  durationMin: true,
  competitiveTeamId: true,
  visibility: true,
  content: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.DrillSelect;

/** Campi che vede lo staff nel pannello. */
export const DRILL_ADMIN_SELECT = {
  ...DRILL_PUBLIC_SELECT,
  status: true,
  archivedAt: true,
  proposedAt: true,
  adoptedAt: true,
  createdAt: true,
  createdBy: { select: { name: true } },
  updatedBy: { select: { name: true } },
  _count: { select: { trainings: true } },
} satisfies Prisma.DrillSelect;

/** Schemi che un tesserato puo' vedere: pubblicati e non archiviati. */
export const VISIBLE_DRILL_WHERE = {
  status: "PUBLISHED",
  archivedAt: null,
} satisfies Prisma.DrillWhereInput;

/**
 * Quello che vede chi non e' tesserato: solo gli esercizi pubblicati e resi
 * pubblici. Uno schema da partita non c'e' mai, qualunque cosa dica il dato.
 */
export const PUBLIC_DRILL_WHERE = {
  ...VISIBLE_DRILL_WHERE,
  visibility: "PUBLIC",
  kind: { in: [...EXERCISE_KINDS] },
} satisfies Prisma.DrillWhereInput;

export const visibleDrillWhere = (member: boolean): Prisma.DrillWhereInput =>
  member ? VISIBLE_DRILL_WHERE : PUBLIC_DRILL_WHERE;

/** Cache di quello che dipende dal Playbook pubblico (menu, sitemap). */
export const PLAYBOOK_TAG = "playbook";

/** Quanti esercizi pubblici ci sono: decide se il Playbook va nel menu di tutti. */
export const loadPublicExerciseCount = unstable_cache(
  () => prisma.drill.count({ where: PUBLIC_DRILL_WHERE }),
  ["playbook-public-count"],
  { tags: [PLAYBOOK_TAG], revalidate: 300 }
);

/** Slug libero a partire dal titolo ("pick-and-roll", "pick-and-roll-2"). */
export async function freeDrillSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title) || "schema";
  const taken = await prisma.drill.findMany({
    where: { slug: { startsWith: base }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { slug: true },
  });
  // "esercizi" e "schemi" sono le pagine delle due categorie.
  const used = new Set([...taken.map((d) => d.slug), ...RESERVED_DRILL_SLUGS]);
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Registro attivita' di una scrittura sugli schemi, dopo la risposta. */
export function auditDrill(input: {
  actorId: string;
  action: AuditAction;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /** "Drill" di default; la scaletta registra l'allenamento. */
  targetType?: "Drill" | "TrainingSession";
}) {
  // Ogni scrittura puo' cambiare cosa c'e' di pubblico: menu e sitemap rileggono.
  revalidateTag(PLAYBOOK_TAG, { expire: 0 });
  inBackground(logAudit({ targetType: "Drill", ...input }), "audit playbook");
}

type AdminDrillRecord = Prisma.DrillGetPayload<{ select: typeof DRILL_ADMIN_SELECT }>;

/** Riga del pannello, senza il disegno e senza gli id delle persone. */
export function toAdminDrillRow(d: AdminDrillRecord) {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    kind: d.kind,
    court: d.court,
    description: d.description,
    durationMin: d.durationMin,
    competitiveTeamId: d.competitiveTeamId,
    visibility: d.visibility,
    // Le proposte (UX-73) non arrivano qui: hanno la loro scheda.
    status: d.status === "PUBLISHED" ? ("PUBLISHED" as const) : ("DRAFT" as const),
    archived: d.archivedAt !== null,
    usedIn: d._count.trainings,
    updatedAt: d.updatedAt.toISOString(),
    updatedBy: d.updatedBy?.name ?? d.createdBy?.name ?? null,
  };
}

/** Squadre fra cui scegliere quella di riferimento: le pubbliche, dalla stagione piu' recente. */
export async function loadDrillTeamOptions() {
  return prisma.competitiveTeam.findMany({
    where: PUBLIC_TEAM_WHERE,
    orderBy: [{ season: "desc" }, { name: "asc" }],
    select: { id: true, name: true, season: true },
  });
}
