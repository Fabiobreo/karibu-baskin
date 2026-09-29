import { z } from "zod";

/**
 * Istante ISO 8601 **con fuso** (`2026-10-05T16:00:00.000Z` o `…+02:00`).
 *
 * Il server gira in UTC: una stringa senza fuso come `"2026-10-05T18:00"`
 * (quella di un `<input type="datetime-local">`) verrebbe letta come 18:00 UTC,
 * cioè le 20:00 a Roma. Il client converte con `localInputToIso` da
 * `@/lib/datetimeLocal`; qui la si rifiuta, così l'errore non arriva al DB.
 */
export const isoDateTime = (message = "Data e ora non valide (manca il fuso orario)") =>
  z.string().datetime({ offset: true, message });
