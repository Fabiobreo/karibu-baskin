import { cache } from "react";
import type { AppRole } from "@prisma/client";
import { hasRole, isMemberRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { parseDrillContent } from "@/lib/schemas/drill";
import type { DrillContent } from "./content";
import { effectiveVisibility, kindsOf, type DrillCategory } from "./category";
import { DRILL_PUBLIC_SELECT, PUBLIC_DRILL_WHERE, visibleDrillWhere } from "./drillAdmin";
import { proposalAuthorLabel } from "./proposals";

/**
 * Letture del Playbook per le pagine pubbliche (UX-72). Gli esercizi resi
 * pubblici li vede chiunque; tutto il resto (gli altri esercizi e tutti gli
 * schemi) solo i tesserati. Chi non lo e' non riceve nemmeno il disegno.
 */

export type BoardViewer = "anonymous" | "guest" | "member" | "staff";

export function boardViewer(role: AppRole | null | undefined, signedIn: boolean): BoardViewer {
  if (role && hasRole(role, "COACH")) return "staff";
  if (isMemberRole(role)) return "member";
  return signedIn ? "guest" : "anonymous";
}

export const isMemberViewer = (v: BoardViewer) => v === "member" || v === "staff";

export interface PublicDrill {
  id: string;
  slug: string;
  title: string;
  kind: "ATTACK" | "DEFENSE" | "TRANSITION" | "SET_PLAY" | "EXERCISE" | "WARMUP";
  court: "FULL" | "HALF";
  description: string | null;
  durationMin: number | null;
  team: { id: string; name: string; season: string } | null;
  /** Lo vede chiunque (esercizio reso pubblico): pagina indicizzabile. */
  isPublic: boolean;
  content: DrillContent;
}

const SELECT = {
  ...DRILL_PUBLIC_SELECT,
  competitiveTeam: { select: { id: true, name: true, season: true } },
} as const;

type Row = {
  id: string;
  slug: string;
  title: string;
  kind: PublicDrill["kind"];
  court: PublicDrill["court"];
  description: string | null;
  durationMin: number | null;
  visibility: "MEMBERS" | "PUBLIC";
  content: unknown;
  competitiveTeam: PublicDrill["team"];
};

function toPublic(row: Row): PublicDrill | null {
  const content = parseDrillContent(row.content, row.court);
  if (!content) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    court: row.court,
    description: row.description,
    durationMin: row.durationMin,
    team: row.competitiveTeam,
    isPublic: effectiveVisibility(row.kind, row.visibility) === "PUBLIC",
    content,
  };
}

/** Esercizi o schemi pubblicati che chi guarda puo' vedere, dal piu' recente. */
export async function loadBoardLibrary(
  category: DrillCategory,
  member: boolean
): Promise<PublicDrill[]> {
  const rows = await prisma.drill.findMany({
    where: { AND: [visibleDrillWhere(member), { kind: { in: [...kindsOf(category)] } }] },
    orderBy: { publishedAt: "desc" },
    select: SELECT,
  });
  return rows.map(toPublic).filter((d): d is PublicDrill => d !== null);
}

/** Quanti esercizi vedono solo i tesserati: l'anonimo legge che ce ne sono altri. */
export async function countMembersOnlyExercises(): Promise<number> {
  const [all, open] = await Promise.all([
    prisma.drill.count({
      where: { AND: [visibleDrillWhere(true), { kind: { in: [...kindsOf("exercises")] } }] },
    }),
    prisma.drill.count({ where: PUBLIC_DRILL_WHERE }),
  ]);
  return all - open;
}

export interface BoardDrillPage {
  drill: PublicDrill;
  /** Bozza vista dallo staff in anteprima. */
  preview: boolean;
  /** Ultimi allenamenti con questo in scaletta: solo per i tesserati. */
  trainings: { id: string; href: string; title: string; date: Date }[];
  /**
   * Nome di battesimo di chi l'ha proposto, per "Idea di …" (UX-73): solo ai
   * tesserati, mai su un esercizio pubblico, mai per un minore.
   */
  ideaOf: string | null;
}

const RECENT_TRAININGS = 5;

/**
 * Un esercizio o uno schema per la sua pagina. `null` = chi guarda non lo puo'
 * vedere (o non c'e'). Lo staff vede anche bozze e archiviati, in anteprima;
 * un tesserato i pubblicati; gli altri solo un esercizio reso pubblico. In
 * cache per richiesta: lo leggono metadati e pagina.
 */
export const loadBoardDrill = cache(
  async (slug: string, viewer: BoardViewer): Promise<BoardDrillPage | null> => {
    const member = isMemberViewer(viewer);
    const row = await prisma.drill.findUnique({
      where: { slug },
      select: {
        ...SELECT,
        status: true,
        archivedAt: true,
        proposedAt: true,
        adoptedAt: true,
        showAuthor: true,
        // Solo per decidere "Idea di …": nome e data di nascita non escono da qui.
        createdBy: { select: { name: true, birthDate: true } },
        trainings: {
          orderBy: { session: { date: "desc" } },
          take: RECENT_TRAININGS,
          select: { session: { select: { id: true, dateSlug: true, title: true, date: true } } },
        },
      },
    });
    if (!row) return null;
    const published = row.status === "PUBLISHED" && !row.archivedAt;
    const drill = toPublic(row);
    if (!drill) return null;
    // La bozza di una proposta non ancora inviata (UX-73) e' solo dell'autore.
    const privateDraft = row.status === "PROPOSED" && !row.proposedAt;
    const allowed =
      (viewer === "staff" && !privateDraft) || (published && (member || drill.isPublic));
    if (!allowed) return null;
    const isPublic = published && drill.isPublic;
    return {
      drill: { ...drill, isPublic },
      ideaOf: proposalAuthorLabel(
        { adoptedAt: row.adoptedAt, showAuthor: row.showAuthor, isPublic },
        row.createdBy,
        { member }
      ),
      preview: !published,
      trainings: (member ? row.trainings : []).map(({ session: s }) => ({
        id: s.id,
        href: `/allenamento/${s.dateSlug ?? s.id}`,
        title: s.title,
        date: s.date,
      })),
    };
  }
);
