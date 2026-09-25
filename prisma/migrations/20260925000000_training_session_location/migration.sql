-- Luogo dell'allenamento (UX-15). Facoltativo: null vuol dire la sede
-- abituale del club (CLUB_VENUE in src/lib/clubVenue.ts), cosi' gli
-- allenamenti gia' esistenti non richiedono un aggiornamento dei dati.

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "location" TEXT;
