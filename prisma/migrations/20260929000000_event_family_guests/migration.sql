-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allowGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxGuests" INTEGER;

-- AlterTable
ALTER TABLE "EventOptionSelection" ADD COLUMN     "guestId" TEXT;

-- AlterTable
ALTER TABLE "EventAttendance" ADD COLUMN     "guestId" TEXT,
ADD COLUMN     "respondedById" TEXT;

-- CreateTable
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventGuest_eventId_idx" ON "EventGuest"("eventId");

-- CreateIndex
CREATE INDEX "EventGuest_addedById_idx" ON "EventGuest"("addedById");

-- CreateIndex
CREATE INDEX "EventOptionSelection_guestId_idx" ON "EventOptionSelection"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOptionSelection_optionId_guestId_key" ON "EventOptionSelection"("optionId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendance_guestId_key" ON "EventAttendance"("guestId");

-- AddForeignKey
ALTER TABLE "EventOptionSelection" ADD CONSTRAINT "EventOptionSelection_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "EventGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "EventGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

