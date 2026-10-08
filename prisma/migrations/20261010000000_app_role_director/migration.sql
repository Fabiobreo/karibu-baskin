-- Ruolo utente "Dirigente": fa parte della direzione, non allena e non è
-- necessariamente atleta o genitore. Sta fra Genitore e Allenatore, così
-- l'ordinamento per ruolo segue la gerarchia.
ALTER TYPE "AppRole" ADD VALUE 'DIRECTOR' BEFORE 'COACH';
