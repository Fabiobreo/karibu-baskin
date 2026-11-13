-- UX-67: i quiz passano dal codice al database, con il pannello dell'admin.
-- Il quiz del Baskin (id 'baskin') prende le 40 domande che erano in
-- src/lib/content/baskinQuiz.ts, tutte in prova: il club le approva dal pannello.
-- CreateEnum
CREATE TYPE "QuizQuestionStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "QuizLevel" AS ENUM ('EASY', 'MEDIUM');


-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "titleEn" TEXT,
    "descriptionEn" TEXT,
    "visibility" "GameVisibility" NOT NULL DEFAULT 'OFF',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "status" "QuizQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "level" "QuizLevel" NOT NULL,
    "topic" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answers" TEXT[],
    "correct" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "source" TEXT,
    "textEn" TEXT,
    "answersEn" TEXT[],
    "explanationEn" TEXT,
    "shown" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizBest" (
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "best" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizBest_pkey" PRIMARY KEY ("userId","quizId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_slug_key" ON "Quiz"("slug");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_status_idx" ON "QuizQuestion"("quizId", "status");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizBest" ADD CONSTRAINT "QuizBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizBest" ADD CONSTRAINT "QuizBest_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Il quiz del Baskin, con lo stato che il quiz aveva in /admin/giochi (UX-66).
INSERT INTO "Quiz" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "visibility", "position", "createdAt", "updatedAt")
VALUES ('baskin', 'baskin', 'Quiz del Baskin',
  '5 domande sul baskin e sul Karibu, senza fretta. Dopo ogni risposta leggi la spiegazione.',
  'Baskin quiz',
  '5 questions about Baskin and the Karibu, no rush. After each answer you read the explanation.',
  COALESCE((SELECT "visibility" FROM "GameSetting" WHERE "game" = 'quiz'), 'OFF'),
  0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ora lo stato è del singolo quiz: la riga del gioco "quiz" non serve più.
DELETE FROM "GameSetting" WHERE "game" = 'quiz';

-- Le 40 domande, in prova.
INSERT INTO "QuizQuestion" ("id", "quizId", "status", "level", "topic", "text", "answers", "correct", "explanation", "source", "textEn", "answersEn", "explanationEn", "createdAt", "updatedAt") VALUES
('nato', 'baskin', 'DRAFT', 'EASY', 'storia', 'In che anno è nato il Baskin?', ARRAY['Nel 1995', 'Nel 2001', 'Nel 2015']::TEXT[], 1, 'Il Baskin è nato nel 2001 a Cremona, in una scuola.', '/il-baskin#origini', 'In what year was Baskin born?', ARRAY['In 1995', 'In 2001', 'In 2015']::TEXT[], 'Baskin was born in 2001 in Cremona, in a school.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '0 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '0 seconds'),
('nome', 'baskin', 'DRAFT', 'EASY', 'storia', 'Cosa vuol dire la parola Baskin?', ARRAY['Basket d''inverno', 'Basket in casa', 'Basket inclusivo']::TEXT[], 2, 'Baskin vuol dire basket inclusivo: uno sport dove giocano tutti, insieme.', '/il-baskin#origini', 'What does the word Baskin mean?', ARRAY['Winter basketball', 'Basketball at home', 'Inclusive basketball']::TEXT[], 'Baskin means inclusive basketball: a sport where everyone plays, together.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '1 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '1 seconds'),
('karibu', 'baskin', 'DRAFT', 'EASY', 'club', 'Cosa vuol dire karibu in swahili?', ARRAY['Grazie', 'Benvenuto', 'Squadra']::TEXT[], 1, 'Karibu vuol dire benvenuto. Chiunque voglia giocare è il benvenuto.', '/il-club', 'What does karibu mean in Swahili?', ARRAY['Thank you', 'Welcome', 'Team']::TEXT[], 'Karibu means welcome. Anyone who wants to play is welcome.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '2 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '2 seconds'),
('chi-gioca', 'baskin', 'DRAFT', 'EASY', 'storia', 'Chi gioca a Baskin?', ARRAY['Solo chi ha già giocato a basket', 'Persone con e senza disabilità, insieme', 'Solo i ragazzi sotto i 14 anni']::TEXT[], 1, 'Nel Baskin persone con e senza disabilità giocano nella stessa squadra. Ognuno ha il suo ruolo.', '/il-baskin#in-breve', 'Who plays Baskin?', ARRAY['Only people who already played basketball', 'People with and without disabilities, together', 'Only kids under 14']::TEXT[], 'In Baskin people with and without disabilities play on the same team. Everyone has their role.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '3 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '3 seconds'),
('quanti-ruoli', 'baskin', 'DRAFT', 'EASY', 'ruoli', 'Quanti ruoli ci sono nel Baskin?', ARRAY['3', '5', '10']::TEXT[], 1, 'I ruoli sono 5, da 1 a 5. Ogni giocatore ha il ruolo adatto a lui.', '/il-baskin#ruoli', 'How many roles are there in Baskin?', ARRAY['3', '5', '10']::TEXT[], 'There are 5 roles, from 1 to 5. Every player has the role that suits them.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '4 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '4 seconds'),
('in-campo', 'baskin', 'DRAFT', 'EASY', 'campo', 'Quanti giocatori di una squadra sono in campo?', ARRAY['5', '6', '11']::TEXT[], 1, 'In campo giocano in 6 per squadra.', '/il-baskin#regole', 'How many players of a team are on the court?', ARRAY['5', '6', '11']::TEXT[], 'Each team plays with 6 on the court.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '5 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '5 seconds'),
('tempi', 'baskin', 'DRAFT', 'EASY', 'campo', 'In quanti tempi si gioca una partita?', ARRAY['2', '3', '4']::TEXT[], 2, 'Una partita ha 4 tempi.', '/il-baskin#regole', 'How many periods does a game have?', ARRAY['2', '3', '4']::TEXT[], 'A game has 4 periods.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '6 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '6 seconds'),
('canestri-lato', 'baskin', 'DRAFT', 'EASY', 'campo', 'Oltre ai 2 canestri grandi, cosa c''è nel campo di Baskin?', ARRAY['Dei canestri a lato del campo', 'Una rete in mezzo', 'Due porte come nel calcio']::TEXT[], 0, 'Ai lati del campo ci sono altri canestri, più bassi. Così ogni ruolo ha il suo canestro.', '/il-baskin#campo', 'Besides the 2 big baskets, what is on a Baskin court?', ARRAY['Baskets at the side of the court', 'A net in the middle', 'Two goals, like in football']::TEXT[], 'At the sides of the court there are other, lower baskets. So every role has its own basket.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '7 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '7 seconds'),
('r1-palla-compagno', 'baskin', 'DRAFT', 'EASY', 'ruoli', 'Chi porta la palla al giocatore di Ruolo 1?', ARRAY['Un compagno di squadra', 'L''arbitro', 'L''allenatore']::TEXT[], 0, 'Il Ruolo 1 gioca nella sua zona. Un compagno gli porta la palla.', '/il-baskin#ruoli', 'Who brings the ball to the Role 1 player?', ARRAY['A teammate', 'The referee', 'The coach']::TEXT[], 'Role 1 plays in their own area. A teammate brings them the ball.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '8 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '8 seconds'),
('r1-secondi', 'baskin', 'DRAFT', 'EASY', 'ruoli', 'Quanto tempo ha il Ruolo 1 per tirare?', ARRAY['3 secondi', '10 secondi', '1 minuto']::TEXT[], 1, 'Il Ruolo 1 ha 10 secondi per tirare, da quando riceve la palla.', '/il-baskin#ruoli', 'How long does Role 1 have to shoot?', ARRAY['3 seconds', '10 seconds', '1 minute']::TEXT[], 'Role 1 has 10 seconds to shoot, from when they get the ball.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '9 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '9 seconds'),
('palla-piccola', 'baskin', 'DRAFT', 'EASY', 'ruoli', 'Che palla può usare il Ruolo 1?', ARRAY['Una palla da calcio', 'Solo la palla normale', 'Una palla più piccola']::TEXT[], 2, 'Il Ruolo 1 può usare una palla più piccola. Un cambiamento semplice che aiuta.', '/il-baskin#ruoli', 'Which ball can Role 1 use?', ARRAY['A football', 'Only the normal ball', 'A smaller ball']::TEXT[], 'Role 1 can use a smaller ball. A simple change that helps.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '10 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '10 seconds'),
('r5-canestro', 'baskin', 'DRAFT', 'EASY', 'canestri', 'In quale canestro tira il Ruolo 5?', ARRAY['Nel canestro basso a lato', 'Solo nel canestro grande', 'In tutti i canestri']::TEXT[], 1, 'Il Ruolo 5 tira solo nel canestro grande, come nel basket.', '/il-baskin#ruoli', 'Which basket does Role 5 shoot at?', ARRAY['The low side basket', 'Only the big basket', 'All the baskets']::TEXT[], 'Role 5 shoots only at the big basket, like in basketball.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '11 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '11 seconds'),
('pivot-marcatura', 'baskin', 'DRAFT', 'EASY', 'ruoli', 'Chi può marcare i giocatori di Ruolo 1 e 2?', ARRAY['Nessuno', 'Solo il Ruolo 5', 'Tutti']::TEXT[], 0, 'Nessuno può marcare i Ruoli 1 e 2. Hanno una zona tutta loro.', '/il-baskin#regole', 'Who can mark Role 1 and Role 2 players?', ARRAY['Nobody', 'Only Role 5', 'Everyone']::TEXT[], 'Nobody can mark Roles 1 and 2. They have an area all of their own.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '12 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '12 seconds'),
('valore', 'baskin', 'DRAFT', 'EASY', 'canestri', 'Quanto vale un canestro nel Baskin?', ARRAY['1 punto', '5 punti', '2 o 3 punti']::TEXT[], 2, 'Un canestro vale 2 o 3 punti. Dipende dal ruolo e dal punto in cui si tira.', '/il-baskin#regole', 'How much is a basket worth in Baskin?', ARRAY['1 point', '5 points', '2 or 3 points']::TEXT[], 'A basket is worth 2 or 3 points. It depends on the role and where you shoot from.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '13 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '13 seconds'),
('fondazione', 'baskin', 'DRAFT', 'EASY', 'club', 'In che anno è nato il Karibu?', ARRAY['Nel 2001', 'Nel 2020', 'Nel 2015']::TEXT[], 2, 'Il Karibu è nato nel 2015 a Montecchio Maggiore.', '/il-club', 'In what year was Karibu born?', ARRAY['In 2001', 'In 2020', 'In 2015']::TEXT[], 'Karibu was born in 2015 in Montecchio Maggiore.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '14 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '14 seconds'),
('fondatrici', 'baskin', 'DRAFT', 'EASY', 'club', 'Chi ha fatto nascere il Karibu?', ARRAY['Una squadra di basket di Vicenza', 'Quattro giovani donne', 'Una scuola di Cremona']::TEXT[], 1, 'Il Karibu è nato da un progetto del Comune, spinto da quattro giovani donne che amavano lo sport.', '/il-club', 'Who started Karibu?', ARRAY['A basketball team from Vicenza', 'Four young women', 'A school in Cremona']::TEXT[], 'Karibu started from a project of the town council, driven by four young women who loved sport.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '15 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '15 seconds'),
('citta', 'baskin', 'DRAFT', 'EASY', 'club', 'In che città si allena il Karibu?', ARRAY['Montecchio Maggiore', 'Vicenza', 'Cremona']::TEXT[], 0, 'Il Karibu si allena e gioca a Montecchio Maggiore, in provincia di Vicenza.', '/il-club', 'In which town does Karibu train?', ARRAY['Montecchio Maggiore', 'Vicenza', 'Cremona']::TEXT[], 'Karibu trains and plays in Montecchio Maggiore, near Vicenza.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '16 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '16 seconds'),
('esperienza', 'baskin', 'DRAFT', 'EASY', 'club', 'Serve esperienza per venire al primo allenamento?', ARRAY['Sì, almeno un anno di basket', 'No, puoi venire così come sei', 'Sì, serve un esame']::TEXT[], 1, 'Non serve esperienza. Se vuoi giocare, sei già pronto.', '/contatti#vieni-a-provare', 'Do you need experience to come to your first training session?', ARRAY['Yes, at least a year of basketball', 'No, come as you are', 'Yes, there is a test']::TEXT[], 'No experience needed. If you want to play, you are ready.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '17 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '17 seconds'),
('inventori', 'baskin', 'DRAFT', 'MEDIUM', 'storia', 'Chi ha inventato il Baskin?', ARRAY['Due giocatori di basket americani', 'Antonio Bodini e Fausto Capellini', 'Il Comune di Montecchio Maggiore']::TEXT[], 1, 'L''hanno inventato Antonio Bodini e Fausto Capellini. Volevano uno sport dove ognuno ha un ruolo vero.', '/il-baskin#origini', 'Who invented Baskin?', ARRAY['Two American basketball players', 'Antonio Bodini and Fausto Capellini', 'The town of Montecchio Maggiore']::TEXT[], 'Antonio Bodini and Fausto Capellini invented it. They wanted a sport where everyone has a real role.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '18 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '18 seconds'),
('regole-eisi', 'baskin', 'DRAFT', 'MEDIUM', 'storia', 'Chi cura le regole del Baskin oggi?', ARRAY['L''EISI di Cremona', 'L''NBA americana', 'Ogni squadra fa le sue']::TEXT[], 0, 'Le regole le cura l''Ente Italiano Sport Inclusivi (EISI), che ha sede a Cremona.', '/il-baskin#origini', 'Who looks after the rules of Baskin today?', ARRAY['EISI in Cremona', 'The American NBA', 'Every team makes its own']::TEXT[], 'The rules are looked after by the Italian Inclusive Sports Body (EISI), in Cremona.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '19 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '19 seconds'),
('maglia', 'baskin', 'DRAFT', 'MEDIUM', 'ruoli', 'Sulla maglia, cosa dice la prima cifra del numero?', ARRAY['Il ruolo del giocatore', 'L''età del giocatore', 'Quante partite ha giocato']::TEXT[], 0, 'La prima cifra è il ruolo, da 1 a 5. Le altre sono il numero del giocatore.', '/il-baskin#origini', 'On the jersey, what does the first digit of the number tell you?', ARRAY['The player''s role', 'The player''s age', 'How many games they played']::TEXT[], 'The first digit is the role, from 1 to 5. The others are the player''s number.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '20 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '20 seconds'),
('r1-altezza', 'baskin', 'DRAFT', 'MEDIUM', 'canestri', 'Quanto è alto il canestro del Ruolo 1?', ARRAY['1,10 metri', '2,20 metri', '3,05 metri']::TEXT[], 0, 'Per il Ruolo 1 c''è un canestro basso, alto 1,10 metri.', '/il-baskin#campo', 'How high is the Role 1 basket?', ARRAY['1.10 metres', '2.20 metres', '3.05 metres']::TEXT[], 'For Role 1 there is a low basket, 1.10 metres high.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '21 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '21 seconds'),
('lato-altezza', 'baskin', 'DRAFT', 'MEDIUM', 'canestri', 'Quanto sono alti i canestri a lato del campo?', ARRAY['1,10 metri', '2,20 metri', '3,05 metri']::TEXT[], 1, 'I canestri a lato sono alti 2,20 metri. Quello grande è alto 3,05 metri.', '/il-baskin#campo', 'How high are the baskets at the side of the court?', ARRAY['1.10 metres', '2.20 metres', '3.05 metres']::TEXT[], 'The side baskets are 2.20 metres high. The big one is 3.05 metres high.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '22 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '22 seconds'),
('r1-scelta', 'baskin', 'DRAFT', 'MEDIUM', 'canestri', 'Cosa può scegliere il Ruolo 1 quando tira?', ARRAY['Tre tiri da 1 punto', 'Un tiro da 5 punti', 'Un tiro da 3 punti oppure due tiri da 2 punti']::TEXT[], 2, 'Il Ruolo 1 sceglie: un tiro da 3 punti oppure due tiri da 2 punti.', '/il-baskin#ruoli', 'What can Role 1 choose when shooting?', ARRAY['Three 1-point shots', 'One 5-point shot', 'One 3-point shot or two 2-point shots']::TEXT[], 'Role 1 chooses: one shot for 3 points or two shots for 2 points.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '23 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '23 seconds'),
('r2-palleggi', 'baskin', 'DRAFT', 'MEDIUM', 'ruoli', 'Quanti palleggi fa almeno il Ruolo 2 prima di tirare?', ARRAY['Nessuno', '2', '10']::TEXT[], 1, 'Il Ruolo 2 fa almeno 2 palleggi, poi va nel punto da cui vuole tirare.', '/il-baskin#ruoli', 'How many times does Role 2 dribble at least before shooting?', ARRAY['None', '2', '10']::TEXT[], 'Role 2 dribbles at least 2 times, then moves to the spot they want to shoot from.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '24 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '24 seconds'),
('r3-passi', 'baskin', 'DRAFT', 'MEDIUM', 'ruoli', 'Per quale ruolo non contano passi e doppio palleggio?', ARRAY['Ruolo 3', 'Ruolo 4', 'Ruolo 5']::TEXT[], 0, 'Per il Ruolo 3 non contano passi e doppio palleggio. Quando corre con la palla, però, fa almeno 2 palleggi.', '/il-baskin#regole', 'For which role do travelling and double dribble not count?', ARRAY['Role 3', 'Role 4', 'Role 5']::TEXT[], 'For Role 3 travelling and double dribble don''t count. When they run with the ball, though, they dribble at least 2 times.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '25 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '25 seconds'),
('r3-marcatura', 'baskin', 'DRAFT', 'MEDIUM', 'ruoli', 'Chi può marcare un giocatore di Ruolo 3?', ARRAY['Un Ruolo 5', 'Chiunque', 'Solo un Ruolo 3']::TEXT[], 2, 'Solo un Ruolo 3 può marcare un Ruolo 3.', '/il-baskin#regole', 'Who can mark a Role 3 player?', ARRAY['A Role 5', 'Anyone', 'Only a Role 3']::TEXT[], 'Only a Role 3 can mark a Role 3.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '26 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '26 seconds'),
('r4-arresto', 'baskin', 'DRAFT', 'MEDIUM', 'ruoli', 'Cosa fa il Ruolo 4 prima di tirare?', ARRAY['Fa 10 palleggi', 'Si ferma', 'Chiede il permesso all''arbitro']::TEXT[], 1, 'Il Ruolo 4 si ferma prima di tirare, e tira solo nel canestro grande.', '/il-baskin#ruoli', 'What does Role 4 do before shooting?', ARRAY['Dribbles 10 times', 'Stops', 'Asks the referee']::TEXT[], 'Role 4 stops before shooting, and shoots only at the big basket.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '27 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '27 seconds'),
('r5-tiri', 'baskin', 'DRAFT', 'MEDIUM', 'ruoli', 'Quante volte può tirare al massimo il Ruolo 5 in un tempo?', ARRAY['Senza limite', '3 volte', '1 volta']::TEXT[], 1, 'Il Ruolo 5 può tirare al massimo 3 volte per tempo. Così c''è spazio per tutti.', '/il-baskin#regole', 'How many times at most can Role 5 shoot in one period?', ARRAY['No limit', '3 times', 'Once']::TEXT[], 'Role 5 can shoot at most 3 times per period. So there is room for everyone.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '28 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '28 seconds'),
('r5-r4', 'baskin', 'DRAFT', 'MEDIUM', 'ruoli', 'Un Ruolo 5 può marcare un Ruolo 4?', ARRAY['Sì, sempre', 'No', 'Solo nell''ultimo tempo']::TEXT[], 1, 'No. Il Ruolo 5 marca solo i giocatori di Ruolo 5.', '/il-baskin#regole', 'Can a Role 5 mark a Role 4?', ARRAY['Yes, always', 'No', 'Only in the last period']::TEXT[], 'No. Role 5 marks only Role 5 players.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '29 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '29 seconds'),
('somma-ruoli', 'baskin', 'DRAFT', 'MEDIUM', 'campo', 'Sommando i numeri dei ruoli in campo, il totale non supera…', ARRAY['15', '23', '30']::TEXT[], 1, 'Il totale dei ruoli in campo non supera 23. Così le squadre restano alla pari.', '/il-baskin#regole', 'Adding up the role numbers on the court, the total is never more than…', ARRAY['15', '23', '30']::TEXT[], 'The roles on the court never add up to more than 23. So the teams stay even.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '30 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '30 seconds'),
('donna-uomo', 'baskin', 'DRAFT', 'MEDIUM', 'campo', 'Tra i Ruoli 4 e 5 in campo ci sono sempre…', ARRAY['Almeno una donna e un uomo', 'Solo uomini', 'Solo persone sopra i 18 anni']::TEXT[], 0, 'Tra i Ruoli 4 e 5 in campo ci sono almeno una donna e un uomo.', '/il-baskin#regole', 'Among Roles 4 and 5 on the court there are always…', ARRAY['At least one woman and one man', 'Only men', 'Only people over 18']::TEXT[], 'Among Roles 4 and 5 on the court there are at least one woman and one man.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '31 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '31 seconds'),
('durata-tempo', 'baskin', 'DRAFT', 'MEDIUM', 'campo', 'Quanto dura un tempo di una partita di Baskin?', ARRAY['20 minuti', '8 minuti', '45 minuti']::TEXT[], 1, 'Ogni tempo dura 8 minuti. A ogni fischio il tempo si ferma.', '/il-baskin#regole', 'How long is one period of a Baskin game?', ARRAY['20 minutes', '8 minutes', '45 minutes']::TEXT[], 'Each period lasts 8 minutes. The clock stops at every whistle.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '32 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '32 seconds'),
('ultimo-tempo', 'baskin', 'DRAFT', 'MEDIUM', 'campo', 'Nell''ultimo tempo, quanto tempo ha una squadra per tirare?', ARRAY['30 secondi', '2 minuti', '5 secondi']::TEXT[], 0, 'Nell''ultimo tempo ogni squadra ha 30 secondi per tirare.', '/il-baskin#regole', 'In the last period, how long does a team have to shoot?', ARRAY['30 seconds', '2 minutes', '5 seconds']::TEXT[], 'In the last period each team has 30 seconds to shoot.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '33 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '33 seconds'),
('rosa', 'baskin', 'DRAFT', 'MEDIUM', 'campo', 'Quanti giocatori può avere al massimo una squadra?', ARRAY['6', '14', '25']::TEXT[], 1, 'Una squadra ha fino a 14 giocatori. In campo ne giocano 6.', '/il-baskin#regole', 'How many players can a team have at most?', ARRAY['6', '14', '25']::TEXT[], 'A team has up to 14 players. 6 of them play on the court.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '34 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '34 seconds'),
('r3-canestro', 'baskin', 'DRAFT', 'MEDIUM', 'canestri', 'Quanto vale un canestro del Ruolo 3 nel canestro grande?', ARRAY['1 punto', '2 punti', '3 punti']::TEXT[], 2, 'Per il Ruolo 3 il canestro grande vale 3 punti. Quello a lato vale 2 punti.', '/il-baskin#ruoli', 'How much is a Role 3 basket in the big basket worth?', ARRAY['1 point', '2 points', '3 points']::TEXT[], 'For Role 3 the big basket is worth 3 points. The side one is worth 2 points.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '35 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '35 seconds'),
('campioni', 'baskin', 'DRAFT', 'MEDIUM', 'club', 'Cosa ha vinto il Karibu nel 2018?', ARRAY['Il titolo di campione regionale', 'Il campionato europeo', 'La Coppa del mondo']::TEXT[], 0, 'Nel 2018, tre anni dopo la nascita, il Karibu è diventato campione regionale.', '/il-club', 'What did Karibu win in 2018?', ARRAY['The regional title', 'The European championship', 'The World Cup']::TEXT[], 'In 2018, three years after it was born, Karibu became regional champion.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '36 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '36 seconds'),
('pandemia', 'baskin', 'DRAFT', 'MEDIUM', 'club', 'Nel 2020, durante la pandemia, come si allenava il Karibu?', ARRAY['In videochiamata', 'In piscina', 'In un parco, di notte']::TEXT[], 0, 'Gli allenamenti sono diventati videochiamate. Così la squadra è rimasta unita fino al ritorno in campo.', '/il-club', 'In 2020, during the pandemic, how did Karibu train?', ARRAY['On video calls', 'In a swimming pool', 'In a park, at night']::TEXT[], 'Training sessions became video calls. So the team stayed together until it could go back on court.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '37 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '37 seconds'),
('ten-league', 'baskin', 'DRAFT', 'MEDIUM', 'club', 'Come si chiamava il torneo per i 10 anni del Karibu?', ARRAY['Coppa Montecchio', 'Karibu Ten League', 'Torneo d''estate']::TEXT[], 1, 'Nel 2025 il Karibu ha organizzato la Karibu Ten League, con 6 squadre.', '/il-club', 'What was the tournament for Karibu''s 10th birthday called?', ARRAY['Montecchio Cup', 'Karibu Ten League', 'Summer Tournament']::TEXT[], 'In 2025 Karibu organised the Karibu Ten League, with 6 teams.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '38 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '38 seconds'),
('due-squadre', 'baskin', 'DRAFT', 'MEDIUM', 'club', 'Come si chiamano le due squadre nate nel 2025?', ARRAY['Leoni e Tigri', 'Romeo e Giulietta', 'Montekki e Kapuleti']::TEXT[], 2, 'Con i 10 anni sono nate due squadre: i Montekki e i Kapuleti.', '/il-club', 'What are the two teams born in 2025 called?', ARRAY['Lions and Tigers', 'Romeo and Juliet', 'Montekki and Kapuleti']::TEXT[], 'With the 10th birthday two teams were born: the Montekki and the Kapuleti.', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '39 seconds', TIMESTAMP '2026-11-13 12:00:00' + INTERVAL '39 seconds');

-- Le migliori partite già salvate restano, sul quiz del Baskin.
INSERT INTO "QuizBest" ("userId", "quizId", "best", "updatedAt")
SELECT "id", 'baskin', "quizBest", CURRENT_TIMESTAMP FROM "User" WHERE "quizBest" IS NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "quizBest";

-- Le partite del quiz contate prima (UX-61) sono del quiz del Baskin.
UPDATE "GameDailyStat" SET "game" = 'quiz:baskin' WHERE "game" = 'quiz';
