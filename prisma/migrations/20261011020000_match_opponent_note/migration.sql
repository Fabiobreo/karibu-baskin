-- Nota dello staff sull'avversaria in una partita giocata: il diario della
-- scheda dell'avversaria. In una tabella a parte, così una riga di
-- "OfficialMatch" letta intera non la porta mai con sé.
CREATE TABLE "MatchOpponentNote" (
    "matchId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchOpponentNote_pkey" PRIMARY KEY ("matchId")
);

ALTER TABLE "MatchOpponentNote" ADD CONSTRAINT "MatchOpponentNote_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "OfficialMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Storico: le note scritte nelle vecchie schede compilate dopo la partita
-- diventano le prime note di partita, datate con la partita.
INSERT INTO "MatchOpponentNote" ("matchId", "note", "updatedAt")
SELECT m."id", btrim(m."opponentProfile" ->> 'notes'), m."date"
FROM "OfficialMatch" m
WHERE m."opponentId" IS NOT NULL
  AND jsonb_typeof(m."opponentProfile") = 'object'
  AND btrim(coalesce(m."opponentProfile" ->> 'notes', '')) <> '';
