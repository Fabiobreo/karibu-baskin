import { z } from "zod";

const sportRoleArray = z.array(z.number().int().min(1).max(5)).optional();

export const SessionCreateSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio").max(200),
  date: z.string().min(1, "Data obbligatoria"),
  endTime: z.string().optional(),
  dateSlug: z.string().optional(),
  allowedRoles: sportRoleArray,
  restrictTeamId: z.string().nullable().optional(),
  openRoles: sportRoleArray,
});

export const SessionUpdateSchema = z.object({
  title: z.string().min(1, "Il titolo non può essere vuoto").max(200).optional(),
  date: z.string().min(1).optional(),
  endTime: z.string().nullable().optional(),
  dateSlug: z.string().optional(),
  allowedRoles: sportRoleArray,
  restrictTeamId: z.string().nullable().optional(),
  openRoles: sportRoleArray,
});
