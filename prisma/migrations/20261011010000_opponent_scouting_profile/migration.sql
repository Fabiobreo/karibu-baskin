-- La scheda dell'avversaria (valutazione per ruolo e nota) passa dalla singola
-- partita alla squadra: si compila quando si vuole, anche prima di averci
-- giocato. `scoutingUpdatedAt` dice quanto è vecchia la valutazione.
ALTER TABLE "OpposingTeam" ADD COLUMN "scoutingProfile" JSONB;
ALTER TABLE "OpposingTeam" ADD COLUMN "scoutingUpdatedAt" TIMESTAMP(3);

-- Storico: per ogni avversaria la scheda compilata sulla partita più recente
-- diventa la scheda della squadra, datata con quella partita. Si copia solo la
-- valutazione per ruolo: le note parlavano di quella partita e restano lì
-- (`OfficialMatch.opponentProfile` non si tocca).
UPDATE "OpposingTeam" o
SET "scoutingProfile" = jsonb_build_object('categories', src.profile -> 'categories'),
    "scoutingUpdatedAt" = src."date"
FROM (
  SELECT DISTINCT ON ("opponentId")
    "opponentId",
    "opponentProfile" AS profile,
    "date"
  FROM "OfficialMatch"
  WHERE "opponentId" IS NOT NULL
    AND "opponentProfile" IS NOT NULL
    AND jsonb_typeof("opponentProfile") = 'object'
    AND jsonb_typeof("opponentProfile" -> 'categories') = 'object'
    AND "opponentProfile" -> 'categories' <> '{}'::jsonb
  ORDER BY "opponentId", "date" DESC
) src
WHERE o."id" = src."opponentId";
