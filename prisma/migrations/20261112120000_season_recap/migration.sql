-- UX-60: "La tua stagione", riepilogo personale di fine stagione
ALTER TYPE "AppNotificationType" ADD VALUE 'SEASON_RECAP';

-- AlterTable
ALTER TABLE "Season" ADD COLUMN "recapPublishedAt" TIMESTAMP(3);
