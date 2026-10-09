import { z } from "zod";
import { isoDateTime } from "./dateTime";

const EventBaseSchema = z.object({
  endDate: isoDateTime().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  // Esterni (+1): ammessi o no, e quanti al massimo per chi risponde.
  allowGuests: z.boolean().optional(),
  maxGuests: z.number().int().min(1).max(20).nullable().optional(),
});

export const EventCreateSchema = EventBaseSchema.extend({
  title: z.string().min(1, "Titolo obbligatorio").max(200),
  date: isoDateTime(),
  location: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  // Spunta "Avvisa tutti del nuovo evento": spenta, l'evento nasce in silenzio.
  notify: z.boolean().default(true),
});

export const EventUpdateSchema = EventBaseSchema.extend({
  title: z.string().min(1, "Il titolo non può essere vuoto").max(200).optional(),
  date: isoDateTime().optional(),
});

const AttendanceStatusSchema = z.enum(["GOING", "MAYBE", "NOT_GOING"]);

export const EventAttendanceSchema = z.object({
  status: AttendanceStatusSchema,
  // Se valorizzato, l'utente risponde per conto di un proprio figlio.
  childId: z.string().optional(),
});

export const EVENT_OPTION_KINDS = ["SESSIONE", "PASTO", "PERNOTTO", "ALTRO"] as const;

// Una sotto-opzione in input dall'admin (id presente = esistente da aggiornare).
export const EventOptionInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Etichetta obbligatoria").max(120),
  startsAt: isoDateTime().nullable().optional(),
  kind: z.enum(EVENT_OPTION_KINDS).default("ALTRO"),
  order: z.number().int().min(0).default(0),
});

// Sostituisce in blocco l'elenco opzioni di un evento.
export const EventOptionsReplaceSchema = z.object({
  options: z.array(EventOptionInputSchema).max(50),
});

// Risposta a un evento con opzioni: presenza all'evento, opzioni (extra) e note,
// per sé o per un figlio. Presenza e opzioni sono indipendenti: si può venire
// all'evento senza il pranzo, o solo al pranzo.
export const EventSelectionsSchema = z.object({
  // Facoltativo solo per le pagine della versione precedente, ancora aperte:
  // senza, lo stato si ricava dalle opzioni come prima.
  status: AttendanceStatusSchema.optional(),
  optionIds: z.array(z.string()).max(50),
  childId: z.string().optional(),
  note: z.string().max(500).nullable().optional(),
});

// Risposta di una famiglia (PUT /api/events/[eventId]/rsvp): una voce per
// persona della famiglia (`key` da `eventFamily`) e gli esterni di chi
// risponde, che sostituiscono in blocco quelli salvati.
const RsvpNoteSchema = z.string().max(500).nullable().optional();

export const EventRsvpSchema = z.object({
  people: z
    .array(
      z.object({
        key: z.string().regex(/^[uc]:.+$/, "Persona non valida"),
        status: AttendanceStatusSchema.nullable(),
        optionIds: z.array(z.string()).max(50),
        note: RsvpNoteSchema,
      })
    )
    .max(30),
  guests: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().max(80).nullable().optional(),
        status: AttendanceStatusSchema,
        optionIds: z.array(z.string()).max(50),
        note: RsvpNoteSchema,
      })
    )
    .max(20),
});
