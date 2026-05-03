import { z } from "zod";

const EventBaseSchema = z.object({
  endDate: z.string().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const EventCreateSchema = EventBaseSchema.extend({
  title: z.string().min(1, "Titolo obbligatorio").max(200),
  date: z.string().min(1, "Data obbligatoria"),
  location: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

export const EventUpdateSchema = EventBaseSchema.extend({
  title: z.string().min(1, "Il titolo non può essere vuoto").max(200).optional(),
  date: z.string().min(1).optional(),
});
