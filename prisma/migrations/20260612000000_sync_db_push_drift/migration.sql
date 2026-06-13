-- CreateEnum
CREATE TYPE "AthleteStatus" AS ENUM ('INACTIVE_SEASON', 'FORMER');

-- CreateEnum
CREATE TYPE "RatingUpdateReason" AS ENUM ('TRAINING_MATCH', 'OFFICIAL_MATCH', 'ROLE_CHANGE', 'MANUAL', 'INIT');

-- CreateEnum
CREATE TYPE "SuggestionCategory" AS ENUM ('APP', 'ALLENAMENTI', 'PARTITE_EVENTI', 'ALTRO');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('NUOVO', 'LETTO', 'ARCHIVIATO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppNotificationType" ADD VALUE 'NEW_POST';
ALTER TYPE "AppNotificationType" ADD VALUE 'NEW_POLL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "athleteStatus" "AthleteStatus",
ADD COLUMN     "customImage" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "ratingMu" DOUBLE PRECISION,
ADD COLUMN     "ratingSigma" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SportRoleHistory" ADD COLUMN     "childId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "athleteStatus" "AthleteStatus",
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "ratingMu" DOUBLE PRECISION,
ADD COLUMN     "ratingSigma" DOUBLE PRECISION,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "TrainingMatchResult" ADD COLUMN     "rostersSnapshot" JSONB;

-- AlterTable
ALTER TABLE "CompetitiveTeam" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "OpposingTeam" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "ratingMu" DOUBLE PRECISION,
ADD COLUMN     "ratingSigma" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OfficialMatch" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "opponentProfile" JSONB;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingUpdate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "childId" TEXT,
    "reason" "RatingUpdateReason" NOT NULL,
    "muBefore" DOUBLE PRECISION NOT NULL,
    "sigmaBefore" DOUBLE PRECISION NOT NULL,
    "muAfter" DOUBLE PRECISION NOT NULL,
    "sigmaAfter" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "blobUrls" TEXT[],
    "thumbnailUrl" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "category" "SuggestionCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'NUOVO',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionNote" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_postId_key" ON "Poll"("postId");

-- CreateIndex
CREATE INDEX "Poll_postId_idx" ON "Poll"("postId");

-- CreateIndex
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");

-- CreateIndex
CREATE INDEX "PollVote_pollId_idx" ON "PollVote"("pollId");

-- CreateIndex
CREATE INDEX "PollVote_userId_idx" ON "PollVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_userId_optionId_key" ON "PollVote"("pollId", "userId", "optionId");

-- CreateIndex
CREATE INDEX "RatingUpdate_userId_createdAt_idx" ON "RatingUpdate"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RatingUpdate_childId_createdAt_idx" ON "RatingUpdate"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "RatingUpdate_sourceId_idx" ON "RatingUpdate"("sourceId");

-- CreateIndex
CREATE INDEX "InstagramPost_timestamp_idx" ON "InstagramPost"("timestamp");

-- CreateIndex
CREATE INDEX "InstagramPost_hidden_timestamp_idx" ON "InstagramPost"("hidden", "timestamp");

-- CreateIndex
CREATE INDEX "Suggestion_status_createdAt_idx" ON "Suggestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SuggestionNote_suggestionId_createdAt_idx" ON "SuggestionNote"("suggestionId", "createdAt");

-- CreateIndex
CREATE INDEX "SportRoleHistory_childId_changedAt_idx" ON "SportRoleHistory"("childId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Child_slug_key" ON "Child"("slug");

-- AddForeignKey
ALTER TABLE "SportRoleHistory" ADD CONSTRAINT "SportRoleHistory_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingUpdate" ADD CONSTRAINT "RatingUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingUpdate" ADD CONSTRAINT "RatingUpdate_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionNote" ADD CONSTRAINT "SuggestionNote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionNote" ADD CONSTRAINT "SuggestionNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

