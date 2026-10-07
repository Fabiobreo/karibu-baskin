-- CreateEnum
CREATE TYPE "AlbumVisibility" AS ENUM ('MEMBERS', 'PUBLIC');

-- CreateTable
CREATE TABLE "PhotoAlbum" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "visibility" "AlbumVisibility" NOT NULL DEFAULT 'MEMBERS',
    "coverPhotoId" TEXT,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "otherFiles" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreachableAt" TIMESTAMP(3),
    "eventId" TEXT,
    "matchId" TEXT,
    "permissionDeclaredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumPhoto" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AlbumPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoAlbum_slug_key" ON "PhotoAlbum"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoAlbum_driveFolderId_key" ON "PhotoAlbum"("driveFolderId");

-- CreateIndex
CREATE INDEX "PhotoAlbum_date_idx" ON "PhotoAlbum"("date");

-- CreateIndex
CREATE INDEX "PhotoAlbum_eventId_idx" ON "PhotoAlbum"("eventId");

-- CreateIndex
CREATE INDEX "PhotoAlbum_matchId_idx" ON "PhotoAlbum"("matchId");

-- CreateIndex
CREATE INDEX "AlbumPhoto_albumId_position_idx" ON "AlbumPhoto"("albumId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumPhoto_albumId_driveFileId_key" ON "AlbumPhoto"("albumId", "driveFileId");

-- AddForeignKey
ALTER TABLE "PhotoAlbum" ADD CONSTRAINT "PhotoAlbum_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAlbum" ADD CONSTRAINT "PhotoAlbum_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "OfficialMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAlbum" ADD CONSTRAINT "PhotoAlbum_permissionDeclaredById_fkey" FOREIGN KEY ("permissionDeclaredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "PhotoAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

