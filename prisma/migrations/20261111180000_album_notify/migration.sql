-- UX-57: avviso "Sono arrivate le foto"
ALTER TYPE "AppNotificationType" ADD VALUE 'ALBUM_PUBLISHED';

-- AlterTable
ALTER TABLE "PhotoAlbum" ADD COLUMN "lastNotifiedAt" TIMESTAMP(3);
