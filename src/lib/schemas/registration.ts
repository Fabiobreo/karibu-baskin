import { z } from "zod";

export const RegistrationPostSchema = z.object({
  sessionId: z.string().min(1),
  role: z.number().int().min(1).max(5),
  name: z.string().max(60).optional(),
  roleVariant: z.string().max(4).optional(),
  childId: z.string().optional(),
  note: z.string().max(300).optional(),
  anonymousEmail: z.string().email().max(254).optional().or(z.literal("")),
  registeredAsCoach: z.boolean().optional(),
});

export const RegistrationPatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  name: z.string().min(1).max(60).optional(),
  anonymousEmail: z.string().email().max(254).or(z.literal("")).nullable().optional(),
  role: z.number().int().min(1).max(5).optional(),
});

export const TeamMemberSchema = z
  .object({
    userId: z.string().optional(),
    childId: z.string().optional(),
    isCaptain: z.boolean().optional(),
  })
  .refine((b) => !!b.userId !== !!b.childId, {
    message: "Esattamente uno tra userId e childId è richiesto",
  });

/**
 * Iscrizione fatta dallo staff (`POST /api/sessions/[sessionId]/registrations`),
 * anche ad allenamenti passati o chiusi: serve a ricostruire le presenze.
 * Esattamente uno tra `userId` e `childId`. `role` serve solo se la persona
 * non ha ancora un ruolo Baskin: altrimenti vale quello a profilo.
 */
export const StaffRegistrationCreateSchema = z
  .object({
    userId: z.string().min(1).optional(),
    childId: z.string().min(1).optional(),
    role: z.number().int().min(1).max(5).optional(),
    attended: z.boolean().nullable().optional(),
  })
  .refine((d) => !!d.userId !== !!d.childId, {
    message: "Indica una sola persona da iscrivere",
  });
