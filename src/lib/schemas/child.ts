import { z } from "zod";
import { AthleteStatus, Gender } from "@prisma/client";

const GenderEnum = z.nativeEnum(Gender).nullable().optional();
const SportRoleField = z.number().int().min(1).max(5).nullable().optional();
const AthleteStatusField = z.nativeEnum(AthleteStatus).nullable().optional();

export const ChildCreateSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio").max(60),
  sportRole: SportRoleField,
  sportRoleVariant: z.string().max(50).nullable().optional(),
  gender: GenderEnum,
  birthDate: z.string().nullable().optional(),
  parentalConsent: z.literal(true, {
    message:
      "Devi confermare di essere il genitore/tutore legale e prestare il consenso al trattamento dei dati",
  }),
});

export const ChildPatchSchema = z.object({
  name: z.string().min(1, "Il nome non può essere vuoto").max(60).optional(),
  sportRole: SportRoleField,
  sportRoleVariant: z.string().max(50).nullable().optional(),
  gender: GenderEnum,
  birthDate: z.string().nullable().optional(),
  athleteStatus: AthleteStatusField, // solo staff (gating server-side)
  linkEmail: z.string().email("Email non valida").optional(),
  linkUserId: z.string().min(1).optional(),
  unlinkAccount: z.boolean().optional(),
});

/**
 * Creazione di un figlio da parte dello staff (`POST /api/admin/children`),
 * per preparare i dati senza passare dal profilo del genitore. A differenza
 * di `ChildCreateSchema` il consenso non è obbligatorio: lo staff dichiara solo
 * se il genitore l'ha già dato fuori dall'app (modulo di tesseramento). Senza,
 * `parentalConsentAt` resta null, come per i record creati prima del flag.
 */
export const AdminChildCreateSchema = z.object({
  parentId: z.string().min(1, "Scegli il genitore"),
  name: z.string().trim().min(1, "Il nome è obbligatorio").max(60),
  sportRole: SportRoleField,
  gender: GenderEnum,
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data di nascita non valida")
    .nullable()
    .optional(),
  parentalConsent: z.boolean().optional(),
  /** Porta il genitore da GUEST a PARENT (ignorato per gli altri ruoli). */
  promoteParent: z.boolean().optional(),
});
