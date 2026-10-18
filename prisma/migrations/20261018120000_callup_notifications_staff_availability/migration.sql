-- Convocazioni e disponibilità segnate dallo staff.
-- Due tipi di notifica nuovi: la convocazione (e il suo ritiro) e la
-- disponibilità segnata dallo staff o cambiata da un convocato.
ALTER TYPE "AppNotificationType" ADD VALUE 'MATCH_CALLUP';
ALTER TYPE "AppNotificationType" ADD VALUE 'MATCH_AVAILABILITY';

-- Chi ha dato la risposta: false = la persona o un genitore (tutte quelle già
-- salvate), true = lo staff, con "Segna disponibile" nelle convocazioni.
ALTER TABLE "MatchAvailability" ADD COLUMN "setByStaff" BOOLEAN NOT NULL DEFAULT false;
