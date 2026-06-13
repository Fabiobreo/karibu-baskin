-- AlterEnum
ALTER TYPE "AppNotificationType" ADD VALUE 'BADGE_UNLOCKED';

-- CreateTable
CREATE TABLE "EarnedBadge" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "userId" TEXT,
    "childId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarnedBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarnedBadge_userId_idx" ON "EarnedBadge"("userId");

-- CreateIndex
CREATE INDEX "EarnedBadge_childId_idx" ON "EarnedBadge"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "EarnedBadge_userId_badgeId_key" ON "EarnedBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "EarnedBadge_childId_badgeId_key" ON "EarnedBadge"("childId", "badgeId");

-- AddForeignKey
ALTER TABLE "EarnedBadge" ADD CONSTRAINT "EarnedBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarnedBadge" ADD CONSTRAINT "EarnedBadge_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
