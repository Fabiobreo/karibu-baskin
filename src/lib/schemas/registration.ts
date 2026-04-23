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

export const TeamMemberSchema = z.object({
  userId: z.string().optional(),
  childId: z.string().optional(),
  isCaptain: z.boolean().optional(),
}).refine(
  (b) => !!(b.userId) !== !!(b.childId),
  { message: "Esattamente uno tra userId e childId è richiesto" }
);
