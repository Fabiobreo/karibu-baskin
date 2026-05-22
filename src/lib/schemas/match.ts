import { z } from "zod";
import { MatchType, MatchResult } from "@prisma/client";

/** Derives WIN/LOSS/DRAW from raw scores. */
export function deriveResult(ourScore: number, theirScore: number): MatchResult {
  if (ourScore > theirScore) return "WIN";
  if (ourScore < theirScore) return "LOSS";
  return "DRAW";
}

const MatchBaseSchema = z.object({
  isHome: z.boolean().optional(),
  venue: z.string().max(200).nullable().optional(),
  matchType: z.nativeEnum(MatchType).optional(),
  result: z.nativeEnum(MatchResult).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  matchday: z.number().int().min(1).nullable().optional(),
  groupId: z.string().nullable().optional(),
});

export const MatchCreateSchema = MatchBaseSchema.extend({
  teamId: z.string().min(1),
  // Esattamente uno tra opponentId (esterno) e opponentTeamId (interno) dev'essere fornito.
  opponentId: z.string().min(1).nullable().optional(),
  opponentTeamId: z.string().min(1).nullable().optional(),
  date: z.string().datetime({ offset: true }).or(z.string().min(1)),
  ourScore: z.number().int().min(0).nullable().optional(),
  theirScore: z.number().int().min(0).nullable().optional(),
})
  .refine((d) => !!d.opponentId !== !!d.opponentTeamId, {
    message: "Specifica esattamente un avversario (esterno OPPURE interno)",
    path: ["opponentId"],
  })
  .refine((d) => !d.opponentTeamId || d.opponentTeamId !== d.teamId, {
    message: "Una squadra non può giocare contro se stessa",
    path: ["opponentTeamId"],
  })
  .refine((d) => !d.opponentTeamId || d.matchType === "FRIENDLY" || d.matchType === undefined, {
    message: "Le partite tra squadre interne possono essere solo amichevoli",
    path: ["matchType"],
  });

export const MatchUpdateSchema = MatchBaseSchema.extend({
  date: z.string().min(1).optional(),
  opponentId: z.string().min(1).nullable().optional(),
  opponentTeamId: z.string().min(1).nullable().optional(),
  ourScore: z.number().int().min(0).nullable().optional(),
  theirScore: z.number().int().min(0).nullable().optional(),
});

export const PlayerStatsEntrySchema = z
  .object({
    userId: z.string().optional(),
    childId: z.string().optional(),
    twoPointers: z.number().int().min(0).max(999).optional(),
    threePointers: z.number().int().min(0).max(999).optional(),
    freeThrows: z.number().int().min(0).max(999).optional(),
    fouls: z.number().int().min(0).max(99).optional(),
    illegalFouls: z.number().int().min(0).max(99).optional(),
    shotsAttempted: z.number().int().min(0).max(999).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((s) => !!s.userId !== !!s.childId, {
    message: "Esattamente uno tra userId e childId è richiesto",
  });

export const PlayerStatsBatchSchema = z.array(PlayerStatsEntrySchema).max(50);

export function computePoints(s: {
  twoPointers?: number | null;
  threePointers?: number | null;
  freeThrows?: number | null;
}): number {
  return (s.twoPointers ?? 0) * 2 + (s.threePointers ?? 0) * 3 + (s.freeThrows ?? 0);
}

export type StatField =
  | "twoPointers"
  | "threePointers"
  | "freeThrows"
  | "fouls"
  | "illegalFouls"
  | "shotsAttempted";

// Campi statistici per ruolo Baskin (1-5). I valori non ammessi vengono salvati come 0.
export const STAT_FIELDS_BY_ROLE: Record<number, readonly StatField[]> = {
  1: ["twoPointers", "threePointers"],
  2: ["twoPointers", "threePointers"],
  3: ["freeThrows", "twoPointers", "threePointers", "fouls"],
  4: ["freeThrows", "twoPointers", "threePointers", "fouls", "illegalFouls"],
  5: ["freeThrows", "twoPointers", "threePointers", "fouls", "illegalFouls", "shotsAttempted"],
};

export function isStatFieldAllowed(role: number | null | undefined, field: StatField): boolean {
  if (!role) return true; // ruolo sconosciuto → nessuna restrizione
  return STAT_FIELDS_BY_ROLE[role]?.includes(field) ?? false;
}

export const MvpsSchema = z.object({
  userIds: z.array(z.string().min(1)).max(3).default([]),
  childIds: z.array(z.string().min(1)).max(3).default([]),
});

export const AvailabilitySchema = z.object({
  available: z.boolean(),
  // Per i genitori che marcano la disponibilità di un figlio
  childId: z.string().min(1).optional(),
});

export const CallupsSchema = z.object({
  // Per le amichevoli interne specificare la squadra (match.teamId o match.opponentTeamId).
  // Se omesso, le convocazioni si applicano a match.teamId (comportamento legacy).
  teamId: z.string().min(1).optional(),
  userIds: z.array(z.string().min(1)).max(100).default([]),
  childIds: z.array(z.string().min(1)).max(100).default([]),
});
