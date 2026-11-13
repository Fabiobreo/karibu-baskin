-- Disegno della card del quiz in /giochi (elenco chiuso QUIZ_ARTS).
ALTER TABLE "Quiz" ADD COLUMN "art" TEXT NOT NULL DEFAULT 'questions';
