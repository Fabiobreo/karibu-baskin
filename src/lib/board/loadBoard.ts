import type { AppRole } from "@prisma/client";
import { hasRole, isMemberRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { parseDrillContent } from "@/lib/schemas/drill";
import type { DrillContent } from "./content";
import { DRILL_PUBLIC_SELECT, VISIBLE_DRILL_WHERE } from "./drillAdmin";

/**
 * Letture della lavagna per le pagine pubbliche (UX-72). Gli schemi sono dei
 * tesserati: chi non lo e' non riceve nemmeno il disegno, solo l'avviso.
 */

export type BoardViewer = "anonymous" | "guest" | "member" | "staff";

export function boardViewer(role: AppRole | null | undefined, signedIn: boolean): BoardViewer {
  if (role && hasRole(role, "COACH")) return "staff";
  if (isMemberRole(role)) return "member";
  return signedIn ? "guest" : "anonymous";
}

export interface PublicDrill {
  id: string;
  slug: string;
  title: string;
  kind: "ATTACK" | "DEFENSE" | "TRANSITION" | "SET_PLAY" | "EXERCISE" | "WARMUP";
  court: "FULL" | "HALF";
  description: string | null;
  durationMin: number | null;
  team: { id: string; name: string; season: string } | null;
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
    content,
  };
}

/** Gli schemi pubblicati, dal piu' recente. */
export async function loadBoardLibrary(): Promise<PublicDrill[]> {
  const rows = await prisma.drill.findMany({
    where: VISIBLE_DRILL_WHERE,
    orderBy: { publishedAt: "desc" },
    select: SELECT,
  });
  return rows.map(toPublic).filter((d): d is PublicDrill => d !== null);
}

export interface BoardDrillPage {
  drill: PublicDrill;
  /** Bozza vista dallo staff in anteprima. */
  preview: boolean;
  trainings: { id: string; href: string; title: string; date: Date }[];
}

/** Gli ultimi allenamenti in cui lo schema e' stato in scaletta. */
const RECENT_TRAININGS = 5;

/**
 * Uno schema per la sua pagina: pubblicato e non archiviato, oppure (solo per
 * lo staff) in bozza, in anteprima. `null` = 404.
 */
export async function loadBoardDrill(slug: string, staff: boolean): Promise<BoardDrillPage | null> {
  const row = await prisma.drill.findUnique({
    where: { slug },
    select: {
      ...SELECT,
      status: true,
      archivedAt: true,
      trainings: {
        orderBy: { session: { date: "desc" } },
        take: RECENT_TRAININGS,
        select: { session: { select: { id: true, dateSlug: true, title: true, date: true } } },
      },
    },
  });
  if (!row) return null;
  const visible = row.status === "PUBLISHED" && !row.archivedAt;
  if (!visible && !staff) return null;
  const drill = toPublic(row);
  if (!drill) return null;
  return {
    drill,
    preview: !visible,
    trainings: row.trainings.map(({ session: s }) => ({
      id: s.id,
      href: `/allenamento/${s.dateSlug ?? s.id}`,
      title: s.title,
      date: s.date,
    })),
  };
}
