-- AlterEnum
ALTER TYPE "DrillStatus" ADD VALUE 'PROPOSED';

-- AlterEnum
ALTER TYPE "SuggestionCategory" ADD VALUE 'ESERCIZIO';

-- AlterTable
ALTER TABLE "Drill" ADD COLUMN     "adoptedAt" TIMESTAMP(3),
ADD COLUMN     "proposedAt" TIMESTAMP(3),
ADD COLUMN     "showAuthor" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "suggestionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Drill_suggestionId_key" ON "Drill"("suggestionId");

-- CreateIndex
CREATE INDEX "Drill_createdById_status_idx" ON "Drill"("createdById", "status");

-- AddForeignKey
ALTER TABLE "Drill" ADD CONSTRAINT "Drill_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

