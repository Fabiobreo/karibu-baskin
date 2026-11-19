import { prisma } from "@/lib/db";
import {
  DrillAssignmentsSchema,
  parseDrillContent,
  type DrillAssignments,
} from "@/lib/schemas/drill";
import type { DrillContent } from "./content";

/**
 * La scaletta di un allenamento (UX-72): gli schemi nell'ordine dello staff,
 * con la nota e gli scambi di nomi salvati. Condivisa dalla rotta e dal
 * pannello.
 */

export interface TrainingDrillItem {
  drillId: string;
  slug: string;
  title: string;
  kind: "ATTACK" | "DEFENSE" | "TRANSITION" | "SET_PLAY" | "EXERCISE" | "WARMUP";
  court: "FULL" | "HALF";
  durationMin: number | null;
  note: string | null;
  assignments: DrillAssignments | null;
  content: DrillContent;
  /** Tornato in bozza o archiviato dopo essere entrato in scaletta. */
  published: boolean;
}

/**
 * Agli altri gli schemi tornati in bozza non arrivano; quelli archiviati si',
 * perche' un allenamento passato deve continuare a mostrare cosa si e' fatto.
 */
export async function loadTrainingDrills(
  sessionId: string,
  staff: boolean
): Promise<TrainingDrillItem[]> {
  const rows = await prisma.trainingDrill.findMany({
    where: { sessionId, ...(staff ? {} : { drill: { status: "PUBLISHED" } }) },
    orderBy: { position: "asc" },
    select: {
      note: true,
      assignments: true,
      drill: {
        select: {
          id: true,
          slug: true,
          title: true,
          kind: true,
          court: true,
          durationMin: true,
          content: true,
          status: true,
          archivedAt: true,
        },
      },
    },
  });
  return rows.flatMap(({ note, assignments, drill }) => {
    const content = parseDrillContent(drill.content, drill.court);
    if (!content) return [];
    const parsedAssignments = DrillAssignmentsSchema.safeParse(assignments);
    return [
      {
        drillId: drill.id,
        slug: drill.slug,
        title: drill.title,
        kind: drill.kind,
        court: drill.court,
        durationMin: drill.durationMin,
        note,
        assignments: parsedAssignments.success ? parsedAssignments.data : null,
        content,
        published: drill.status === "PUBLISHED" && !drill.archivedAt,
      },
    ];
  });
}
