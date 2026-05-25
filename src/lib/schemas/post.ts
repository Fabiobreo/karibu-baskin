import { z } from "zod";

export const PollOptionSchema = z.object({
  text: z.string().min(1, "Il testo dell'opzione è obbligatorio").max(200),
  order: z.number().int().min(0).default(0),
});

export const PollSchema = z.object({
  question: z.string().min(3, "La domanda è obbligatoria").max(500),
  multiSelect: z.boolean().default(false),
  closesAt: z.string().datetime({ offset: true }).nullable().optional(),
  options: z.array(PollOptionSchema).min(2, "Servono almeno 2 opzioni").max(8, "Massimo 8 opzioni"),
});

export const PostCreateSchema = z.object({
  title: z
    .string()
    .min(3, "Il titolo è obbligatorio")
    .max(200, "Titolo troppo lungo (max 200 caratteri)"),
  body: z.string().min(1, "Il contenuto è obbligatorio").max(50000, "Contenuto troppo lungo"),
  publish: z.boolean().default(false),
  poll: PollSchema.nullable().optional(),
});

export const PostUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.string().min(1).max(50000).optional(),
  publish: z.boolean().optional(),
  unpublish: z.boolean().optional(),
  poll: PollSchema.nullable().optional(),
});

export const PollVoteSchema = z.object({
  optionIds: z.array(z.string().cuid()).min(1, "Seleziona almeno un'opzione").max(8),
});

export type PostCreateInput = z.infer<typeof PostCreateSchema>;
export type PostUpdateInput = z.infer<typeof PostUpdateSchema>;
export type PollInput = z.infer<typeof PollSchema>;
export type PollVoteInput = z.infer<typeof PollVoteSchema>;
