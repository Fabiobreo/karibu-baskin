import { z } from "zod";
import { isoDateTime } from "./dateTime";

const sportRoleArray = z.array(z.number().int().min(1).max(5)).optional();

// ── TeamsData — struttura JSON salvata in TrainingSession.teams ──────────────

const TeamAthleteSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.number().int(),
});

const CoachSchema = z.object({ id: z.string(), name: z.string() });

export const TeamsDataSchema = z.object({
  teamA: z.array(TeamAthleteSchema),
  teamB: z.array(TeamAthleteSchema),
  teamC: z.array(TeamAthleteSchema).optional(),
  coaches: z.array(CoachSchema).optional(),
  numTeams: z.union([z.literal(2), z.literal(3)]),
  generated: z.boolean().default(true),
});

export type TeamsData = z.infer<typeof TeamsDataSchema>;

/** Parsa in modo sicuro il campo JSON `teams` da Prisma. Ritorna null se mancante o malformato. */
export function parseTeamsData(value: unknown): TeamsData | null {
  if (value == null) return null;
  const result = TeamsDataSchema.safeParse(value);
  return result.success ? result.data : null;
}

// ── Session schemas ───────────────────────────────────────────────────────────

export const SessionCreateSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio").max(200),
  date: isoDateTime(),
  endTime: isoDateTime().nullable().optional(),
  // Luogo (UX-15): vuoto = sede abituale del club.
  location: z.string().trim().max(200).nullable().optional(),
  dateSlug: z.string().optional(),
  allowedRoles: sportRoleArray,
  restrictTeamId: z.string().nullable().optional(),
  openRoles: sportRoleArray,
  openImmediately: z.boolean().optional(),
});

export const SessionUpdateSchema = z.object({
  title: z.string().min(1, "Il titolo non può essere vuoto").max(200).optional(),
  date: isoDateTime().optional(),
  endTime: isoDateTime().nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  dateSlug: z.string().optional(),
  allowedRoles: sportRoleArray,
  restrictTeamId: z.string().nullable().optional(),
  openRoles: sportRoleArray,
});
