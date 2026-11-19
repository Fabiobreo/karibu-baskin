-- CreateEnum
CREATE TYPE "DrillVisibility" AS ENUM ('MEMBERS', 'PUBLIC');

-- AlterTable
ALTER TABLE "Drill" ADD COLUMN     "visibility" "DrillVisibility" NOT NULL DEFAULT 'MEMBERS';

