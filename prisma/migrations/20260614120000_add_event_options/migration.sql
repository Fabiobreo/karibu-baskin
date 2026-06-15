-- CreateEnum
CREATE TYPE "EventOptionKind" AS ENUM ('SESSIONE', 'PASTO', 'PERNOTTO', 'ALTRO');

-- AlterTable
ALTER TABLE "EventAttendance" ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "EventOption" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "kind" "EventOptionKind" NOT NULL DEFAULT 'ALTRO',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOptionSelection" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT,
    "childId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOptionSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventOption_eventId_idx" ON "EventOption"("eventId");

-- CreateIndex
CREATE INDEX "EventOptionSelection_optionId_idx" ON "EventOptionSelection"("optionId");

-- CreateIndex
CREATE INDEX "EventOptionSelection_userId_idx" ON "EventOptionSelection"("userId");

-- CreateIndex
CREATE INDEX "EventOptionSelection_childId_idx" ON "EventOptionSelection"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOptionSelection_optionId_userId_key" ON "EventOptionSelection"("optionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOptionSelection_optionId_childId_key" ON "EventOptionSelection"("optionId", "childId");

-- AddForeignKey
ALTER TABLE "EventOption" ADD CONSTRAINT "EventOption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOptionSelection" ADD CONSTRAINT "EventOptionSelection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "EventOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOptionSelection" ADD CONSTRAINT "EventOptionSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOptionSelection" ADD CONSTRAINT "EventOptionSelection_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

