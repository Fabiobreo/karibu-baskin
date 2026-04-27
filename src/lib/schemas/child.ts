import { z } from "zod";

const GenderEnum = z.enum(["MALE", "FEMALE"]).nullable().optional();
const SportRoleField = z.number().int().min(1).max(5).nullable().optional();

export const ChildCreateSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio").max(60),
  sportRole: SportRoleField,
  sportRoleVariant: z.string().max(50).nullable().optional(),
  gender: GenderEnum,
  birthDate: z.string().nullable().optional(),
});

export const ChildPatchSchema = z.object({
  name: z.string().min(1, "Il nome non può essere vuoto").max(60).optional(),
  sportRole: SportRoleField,
  sportRoleVariant: z.string().max(50).nullable().optional(),
  gender: GenderEnum,
  birthDate: z.string().nullable().optional(),
  linkEmail: z.string().email("Email non valida").optional(),
  linkUserId: z.string().optional(),
  unlinkAccount: z.boolean().optional(),
});
