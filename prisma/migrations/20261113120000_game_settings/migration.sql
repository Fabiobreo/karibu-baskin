-- UX-66: chi vede un gioco (quiz, pronostico, simulatore), deciso dall'admin
-- CreateEnum
CREATE TYPE "GameVisibility" AS ENUM ('OFF', 'MEMBERS', 'PUBLIC');

-- CreateTable
CREATE TABLE "GameSetting" (
    "game" TEXT NOT NULL,
    "visibility" "GameVisibility" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "GameSetting_pkey" PRIMARY KEY ("game")
);

