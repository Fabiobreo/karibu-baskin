-- Domande per partita di un quiz, scelte dall'admin (5 per i quiz che ci sono).
-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 5;

