import { z } from "zod";

const EventBaseSchema = z.object({
  endDate: z.string().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export const EventCreateSchema = EventBaseSchema.extend({
  title: z.string().min(1, "Titolo obbligatorio").max(200),
  date: z.string().min(1, "Data obbligatoria"),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const EventUpdateSchema = EventBaseSchema.extend({
  title: z.string().min(1, "Il titolo non può essere vuoto").max(200).optional(),
  date: z.string().min(1).optional(),
});

export const EventAttendanceSchema = z.object({
  status: z.enum(["GOING", "MAYBE", "NOT_GOING"]),
  // Se valorizzato, l'utente risponde per conto di un proprio figlio.
  childId: z.string().optional(),
});

export const EVENT_OPTION_KINDS = ["SESSIONE", "PASTO", "PERNOTTO", "ALTRO"] as const;

// Una sotto-opzione in input dall'admin (id presente = esistente da aggiornare).
export const EventOptionInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Etichetta obbligatoria").max(120),
  startsAt: z.string().nullable().optional(),
  kind: z.enum(EVENT_OPTION_KINDS).default("ALTRO"),
  order: z.number().int().min(0).default(0),
});

// Sostituisce in blocco l'elenco opzioni di un evento.
export const EventOptionsReplaceSchema = z.object({
  options: z.array(EventOptionInputSchema).max(50),
});

// Selezione del partecipante: quali opzioni + note (per sé o per un figlio).
export const EventSelectionsSchema = z.object({
  optionIds: z.array(z.string()).max(50),
  childId: z.string().optional(),
  note: z.string().max(500).nullable().optional(),
});
