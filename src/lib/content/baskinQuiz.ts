/**
 * Quiz del Baskin (UX-61): la banca delle domande, in italiano e in inglese.
 *
 * I fatti vengono dai testi che il sito ha già: le regole e i ruoli di
 * `/il-baskin` (`baskinInfo.ts`), la storia del Baskin, "Lo sapevi" e la
 * storia del club (`home.storia`, `home.values`, che si leggono su `/il-club`).
 * Quando una regola cambia lì, si controlla anche la domanda qui.
 *
 * Id, livello, argomento, risposta giusta e pagina "Scopri di più" sono uguali
 * nelle due lingue e stanno una volta sola in `QUESTIONS`; i testi stanno nei
 * due dizionari, che il tipo obbliga ad avere le stesse chiavi.
 */

/**
 * Le domande le rivede il club prima di andare online. Finché è `false` il
 * quiz non è in menu né in sitemap, `/giochi` non lo propone e
 * `/giochi/quiz` risponde 404 a tutti tranne allenatori e admin (anteprima).
 */
export const QUIZ_READY = false;

export type QuizLevel = "facile" | "medio";
export type QuizTopic = "ruoli" | "campo" | "canestri" | "storia" | "club";

/** Dove si legge di più. Elenco chiuso: `baskinQuiz.test.ts` controlla che le pagine esistano. */
export const QUIZ_SOURCES = [
  "/il-baskin#in-breve",
  "/il-baskin#campo",
  "/il-baskin#ruoli",
  "/il-baskin#regole",
  "/il-baskin#origini",
  "/il-club",
  "/contatti#vieni-a-provare",
] as const;
export type QuizSource = (typeof QUIZ_SOURCES)[number];

interface QuestionMeta {
  id: string;
  level: QuizLevel;
  topic: QuizTopic;
  /** Indice della risposta giusta (0, 1 o 2). */
  correct: 0 | 1 | 2;
  source: QuizSource;
}

const QUESTIONS = [
  // ── Facili ────────────────────────────────────────────────────────────────
  { id: "nato", level: "facile", topic: "storia", correct: 1, source: "/il-baskin#origini" },
  { id: "nome", level: "facile", topic: "storia", correct: 2, source: "/il-baskin#origini" },
  { id: "karibu", level: "facile", topic: "club", correct: 1, source: "/il-club" },
  { id: "chi-gioca", level: "facile", topic: "storia", correct: 1, source: "/il-baskin#in-breve" },
  { id: "quanti-ruoli", level: "facile", topic: "ruoli", correct: 1, source: "/il-baskin#ruoli" },
  { id: "in-campo", level: "facile", topic: "campo", correct: 1, source: "/il-baskin#regole" },
  { id: "tempi", level: "facile", topic: "campo", correct: 2, source: "/il-baskin#regole" },
  { id: "canestri-lato", level: "facile", topic: "campo", correct: 0, source: "/il-baskin#campo" },
  {
    id: "r1-palla-compagno",
    level: "facile",
    topic: "ruoli",
    correct: 0,
    source: "/il-baskin#ruoli",
  },
  { id: "r1-secondi", level: "facile", topic: "ruoli", correct: 1, source: "/il-baskin#ruoli" },
  { id: "palla-piccola", level: "facile", topic: "ruoli", correct: 2, source: "/il-baskin#ruoli" },
  { id: "r5-canestro", level: "facile", topic: "canestri", correct: 1, source: "/il-baskin#ruoli" },
  {
    id: "pivot-marcatura",
    level: "facile",
    topic: "ruoli",
    correct: 0,
    source: "/il-baskin#regole",
  },
  { id: "valore", level: "facile", topic: "canestri", correct: 2, source: "/il-baskin#regole" },
  { id: "fondazione", level: "facile", topic: "club", correct: 2, source: "/il-club" },
  { id: "fondatrici", level: "facile", topic: "club", correct: 1, source: "/il-club" },
  { id: "citta", level: "facile", topic: "club", correct: 0, source: "/il-club" },
  {
    id: "esperienza",
    level: "facile",
    topic: "club",
    correct: 1,
    source: "/contatti#vieni-a-provare",
  },
  // ── Medie ─────────────────────────────────────────────────────────────────
  { id: "inventori", level: "medio", topic: "storia", correct: 1, source: "/il-baskin#origini" },
  { id: "regole-eisi", level: "medio", topic: "storia", correct: 0, source: "/il-baskin#origini" },
  { id: "maglia", level: "medio", topic: "ruoli", correct: 0, source: "/il-baskin#origini" },
  { id: "r1-altezza", level: "medio", topic: "canestri", correct: 0, source: "/il-baskin#campo" },
  { id: "lato-altezza", level: "medio", topic: "canestri", correct: 1, source: "/il-baskin#campo" },
  { id: "r1-scelta", level: "medio", topic: "canestri", correct: 2, source: "/il-baskin#ruoli" },
  { id: "r2-palleggi", level: "medio", topic: "ruoli", correct: 1, source: "/il-baskin#ruoli" },
  { id: "r3-passi", level: "medio", topic: "ruoli", correct: 0, source: "/il-baskin#regole" },
  { id: "r3-marcatura", level: "medio", topic: "ruoli", correct: 2, source: "/il-baskin#regole" },
  { id: "r4-arresto", level: "medio", topic: "ruoli", correct: 1, source: "/il-baskin#ruoli" },
  { id: "r5-tiri", level: "medio", topic: "ruoli", correct: 1, source: "/il-baskin#regole" },
  { id: "r5-r4", level: "medio", topic: "ruoli", correct: 1, source: "/il-baskin#regole" },
  { id: "somma-ruoli", level: "medio", topic: "campo", correct: 1, source: "/il-baskin#regole" },
  { id: "donna-uomo", level: "medio", topic: "campo", correct: 0, source: "/il-baskin#regole" },
  { id: "durata-tempo", level: "medio", topic: "campo", correct: 1, source: "/il-baskin#regole" },
  { id: "ultimo-tempo", level: "medio", topic: "campo", correct: 0, source: "/il-baskin#regole" },
  { id: "rosa", level: "medio", topic: "campo", correct: 1, source: "/il-baskin#regole" },
  { id: "r3-canestro", level: "medio", topic: "canestri", correct: 2, source: "/il-baskin#ruoli" },
  { id: "campioni", level: "medio", topic: "club", correct: 0, source: "/il-club" },
  { id: "pandemia", level: "medio", topic: "club", correct: 0, source: "/il-club" },
  { id: "ten-league", level: "medio", topic: "club", correct: 1, source: "/il-club" },
  { id: "due-squadre", level: "medio", topic: "club", correct: 2, source: "/il-club" },
] as const satisfies readonly QuestionMeta[];

export type QuizQuestionId = (typeof QUESTIONS)[number]["id"];

interface QuestionText {
  text: string;
  /** Sempre tre: meno carico di lettura. */
  answers: [string, string, string];
  /** Due righe al massimo, lette dopo la risposta, giusta o no. */
  explanation: string;
}

const TEXT_IT: Record<QuizQuestionId, QuestionText> = {
  nato: {
    text: "In che anno è nato il Baskin?",
    answers: ["Nel 1995", "Nel 2001", "Nel 2015"],
    explanation: "Il Baskin è nato nel 2001 a Cremona, in una scuola.",
  },
  nome: {
    text: "Cosa vuol dire la parola Baskin?",
    answers: ["Basket d'inverno", "Basket in casa", "Basket inclusivo"],
    explanation: "Baskin vuol dire basket inclusivo: uno sport dove giocano tutti, insieme.",
  },
  karibu: {
    text: "Cosa vuol dire karibu in swahili?",
    answers: ["Grazie", "Benvenuto", "Squadra"],
    explanation: "Karibu vuol dire benvenuto. Chiunque voglia giocare è il benvenuto.",
  },
  "chi-gioca": {
    text: "Chi gioca a Baskin?",
    answers: [
      "Solo chi ha già giocato a basket",
      "Persone con e senza disabilità, insieme",
      "Solo i ragazzi sotto i 14 anni",
    ],
    explanation:
      "Nel Baskin persone con e senza disabilità giocano nella stessa squadra. Ognuno ha il suo ruolo.",
  },
  "quanti-ruoli": {
    text: "Quanti ruoli ci sono nel Baskin?",
    answers: ["3", "5", "10"],
    explanation: "I ruoli sono 5, da 1 a 5. Ogni giocatore ha il ruolo adatto a lui.",
  },
  "in-campo": {
    text: "Quanti giocatori di una squadra sono in campo?",
    answers: ["5", "6", "11"],
    explanation: "In campo giocano in 6 per squadra.",
  },
  tempi: {
    text: "In quanti tempi si gioca una partita?",
    answers: ["2", "3", "4"],
    explanation: "Una partita ha 4 tempi.",
  },
  "canestri-lato": {
    text: "Oltre ai 2 canestri grandi, cosa c'è nel campo di Baskin?",
    answers: ["Dei canestri a lato del campo", "Una rete in mezzo", "Due porte come nel calcio"],
    explanation:
      "Ai lati del campo ci sono altri canestri, più bassi. Così ogni ruolo ha il suo canestro.",
  },
  "r1-palla-compagno": {
    text: "Chi porta la palla al giocatore di Ruolo 1?",
    answers: ["Un compagno di squadra", "L'arbitro", "L'allenatore"],
    explanation: "Il Ruolo 1 gioca nella sua zona. Un compagno gli porta la palla.",
  },
  "r1-secondi": {
    text: "Quanto tempo ha il Ruolo 1 per tirare?",
    answers: ["3 secondi", "10 secondi", "1 minuto"],
    explanation: "Il Ruolo 1 ha 10 secondi per tirare, da quando riceve la palla.",
  },
  "palla-piccola": {
    text: "Che palla può usare il Ruolo 1?",
    answers: ["Una palla da calcio", "Solo la palla normale", "Una palla più piccola"],
    explanation: "Il Ruolo 1 può usare una palla più piccola. Un cambiamento semplice che aiuta.",
  },
  "r5-canestro": {
    text: "In quale canestro tira il Ruolo 5?",
    answers: ["Nel canestro basso a lato", "Solo nel canestro grande", "In tutti i canestri"],
    explanation: "Il Ruolo 5 tira solo nel canestro grande, come nel basket.",
  },
  "pivot-marcatura": {
    text: "Chi può marcare i giocatori di Ruolo 1 e 2?",
    answers: ["Nessuno", "Solo il Ruolo 5", "Tutti"],
    explanation: "Nessuno può marcare i Ruoli 1 e 2. Hanno una zona tutta loro.",
  },
  valore: {
    text: "Quanto vale un canestro nel Baskin?",
    answers: ["1 punto", "5 punti", "2 o 3 punti"],
    explanation: "Un canestro vale 2 o 3 punti. Dipende dal ruolo e dal punto in cui si tira.",
  },
  fondazione: {
    text: "In che anno è nato il Karibu?",
    answers: ["Nel 2001", "Nel 2020", "Nel 2015"],
    explanation: "Il Karibu è nato nel 2015 a Montecchio Maggiore.",
  },
  fondatrici: {
    text: "Chi ha fatto nascere il Karibu?",
    answers: ["Una squadra di basket di Vicenza", "Quattro giovani donne", "Una scuola di Cremona"],
    explanation:
      "Il Karibu è nato da un progetto del Comune, spinto da quattro giovani donne che amavano lo sport.",
  },
  citta: {
    text: "In che città si allena il Karibu?",
    answers: ["Montecchio Maggiore", "Vicenza", "Cremona"],
    explanation: "Il Karibu si allena e gioca a Montecchio Maggiore, in provincia di Vicenza.",
  },
  esperienza: {
    text: "Serve esperienza per venire al primo allenamento?",
    answers: [
      "Sì, almeno un anno di basket",
      "No, puoi venire così come sei",
      "Sì, serve un esame",
    ],
    explanation: "Non serve esperienza. Se vuoi giocare, sei già pronto.",
  },
  inventori: {
    text: "Chi ha inventato il Baskin?",
    answers: [
      "Due giocatori di basket americani",
      "Antonio Bodini e Fausto Capellini",
      "Il Comune di Montecchio Maggiore",
    ],
    explanation:
      "L'hanno inventato Antonio Bodini e Fausto Capellini. Volevano uno sport dove ognuno ha un ruolo vero.",
  },
  "regole-eisi": {
    text: "Chi cura le regole del Baskin oggi?",
    answers: ["L'EISI di Cremona", "L'NBA americana", "Ogni squadra fa le sue"],
    explanation: "Le regole le cura l'Ente Italiano Sport Inclusivi (EISI), che ha sede a Cremona.",
  },
  maglia: {
    text: "Sulla maglia, cosa dice la prima cifra del numero?",
    answers: ["Il ruolo del giocatore", "L'età del giocatore", "Quante partite ha giocato"],
    explanation: "La prima cifra è il ruolo, da 1 a 5. Le altre sono il numero del giocatore.",
  },
  "r1-altezza": {
    text: "Quanto è alto il canestro del Ruolo 1?",
    answers: ["1,10 metri", "2,20 metri", "3,05 metri"],
    explanation: "Per il Ruolo 1 c'è un canestro basso, alto 1,10 metri.",
  },
  "lato-altezza": {
    text: "Quanto sono alti i canestri a lato del campo?",
    answers: ["1,10 metri", "2,20 metri", "3,05 metri"],
    explanation: "I canestri a lato sono alti 2,20 metri. Quello grande è alto 3,05 metri.",
  },
  "r1-scelta": {
    text: "Cosa può scegliere il Ruolo 1 quando tira?",
    answers: [
      "Tre tiri da 1 punto",
      "Un tiro da 5 punti",
      "Un tiro da 3 punti oppure due tiri da 2 punti",
    ],
    explanation: "Il Ruolo 1 sceglie: un tiro da 3 punti oppure due tiri da 2 punti.",
  },
  "r2-palleggi": {
    text: "Quanti palleggi fa almeno il Ruolo 2 prima di tirare?",
    answers: ["Nessuno", "2", "10"],
    explanation: "Il Ruolo 2 fa almeno 2 palleggi, poi va nel punto da cui vuole tirare.",
  },
  "r3-passi": {
    text: "Per quale ruolo non contano passi e doppio palleggio?",
    answers: ["Ruolo 3", "Ruolo 4", "Ruolo 5"],
    explanation:
      "Per il Ruolo 3 non contano passi e doppio palleggio. Quando corre con la palla, però, fa almeno 2 palleggi.",
  },
  "r3-marcatura": {
    text: "Chi può marcare un giocatore di Ruolo 3?",
    answers: ["Un Ruolo 5", "Chiunque", "Solo un Ruolo 3"],
    explanation: "Solo un Ruolo 3 può marcare un Ruolo 3.",
  },
  "r4-arresto": {
    text: "Cosa fa il Ruolo 4 prima di tirare?",
    answers: ["Fa 10 palleggi", "Si ferma", "Chiede il permesso all'arbitro"],
    explanation: "Il Ruolo 4 si ferma prima di tirare, e tira solo nel canestro grande.",
  },
  "r5-tiri": {
    text: "Quante volte può tirare al massimo il Ruolo 5 in un tempo?",
    answers: ["Senza limite", "3 volte", "1 volta"],
    explanation: "Il Ruolo 5 può tirare al massimo 3 volte per tempo. Così c'è spazio per tutti.",
  },
  "r5-r4": {
    text: "Un Ruolo 5 può marcare un Ruolo 4?",
    answers: ["Sì, sempre", "No", "Solo nell'ultimo tempo"],
    explanation: "No. Il Ruolo 5 marca solo i giocatori di Ruolo 5.",
  },
  "somma-ruoli": {
    text: "Sommando i numeri dei ruoli in campo, il totale non supera…",
    answers: ["15", "23", "30"],
    explanation: "Il totale dei ruoli in campo non supera 23. Così le squadre restano alla pari.",
  },
  "donna-uomo": {
    text: "Tra i Ruoli 4 e 5 in campo ci sono sempre…",
    answers: ["Almeno una donna e un uomo", "Solo uomini", "Solo persone sopra i 18 anni"],
    explanation: "Tra i Ruoli 4 e 5 in campo ci sono almeno una donna e un uomo.",
  },
  "durata-tempo": {
    text: "Quanto dura un tempo di una partita di Baskin?",
    answers: ["20 minuti", "8 minuti", "45 minuti"],
    explanation: "Ogni tempo dura 8 minuti. A ogni fischio il tempo si ferma.",
  },
  "ultimo-tempo": {
    text: "Nell'ultimo tempo, quanto tempo ha una squadra per tirare?",
    answers: ["30 secondi", "2 minuti", "5 secondi"],
    explanation: "Nell'ultimo tempo ogni squadra ha 30 secondi per tirare.",
  },
  rosa: {
    text: "Quanti giocatori può avere al massimo una squadra?",
    answers: ["6", "14", "25"],
    explanation: "Una squadra ha fino a 14 giocatori. In campo ne giocano 6.",
  },
  "r3-canestro": {
    text: "Quanto vale un canestro del Ruolo 3 nel canestro grande?",
    answers: ["1 punto", "2 punti", "3 punti"],
    explanation: "Per il Ruolo 3 il canestro grande vale 3 punti. Quello a lato vale 2 punti.",
  },
  campioni: {
    text: "Cosa ha vinto il Karibu nel 2018?",
    answers: ["Il titolo di campione regionale", "Il campionato europeo", "La Coppa del mondo"],
    explanation: "Nel 2018, tre anni dopo la nascita, il Karibu è diventato campione regionale.",
  },
  pandemia: {
    text: "Nel 2020, durante la pandemia, come si allenava il Karibu?",
    answers: ["In videochiamata", "In piscina", "In un parco, di notte"],
    explanation:
      "Gli allenamenti sono diventati videochiamate. Così la squadra è rimasta unita fino al ritorno in campo.",
  },
  "ten-league": {
    text: "Come si chiamava il torneo per i 10 anni del Karibu?",
    answers: ["Coppa Montecchio", "Karibu Ten League", "Torneo d'estate"],
    explanation: "Nel 2025 il Karibu ha organizzato la Karibu Ten League, con 6 squadre.",
  },
  "due-squadre": {
    text: "Come si chiamano le due squadre nate nel 2025?",
    answers: ["Leoni e Tigri", "Romeo e Giulietta", "Montekki e Kapuleti"],
    explanation: "Con i 10 anni sono nate due squadre: i Montekki e i Kapuleti.",
  },
};

const TEXT_EN: Record<QuizQuestionId, QuestionText> = {
  nato: {
    text: "In what year was Baskin born?",
    answers: ["In 1995", "In 2001", "In 2015"],
    explanation: "Baskin was born in 2001 in Cremona, in a school.",
  },
  nome: {
    text: "What does the word Baskin mean?",
    answers: ["Winter basketball", "Basketball at home", "Inclusive basketball"],
    explanation: "Baskin means inclusive basketball: a sport where everyone plays, together.",
  },
  karibu: {
    text: "What does karibu mean in Swahili?",
    answers: ["Thank you", "Welcome", "Team"],
    explanation: "Karibu means welcome. Anyone who wants to play is welcome.",
  },
  "chi-gioca": {
    text: "Who plays Baskin?",
    answers: [
      "Only people who already played basketball",
      "People with and without disabilities, together",
      "Only kids under 14",
    ],
    explanation:
      "In Baskin people with and without disabilities play on the same team. Everyone has their role.",
  },
  "quanti-ruoli": {
    text: "How many roles are there in Baskin?",
    answers: ["3", "5", "10"],
    explanation: "There are 5 roles, from 1 to 5. Every player has the role that suits them.",
  },
  "in-campo": {
    text: "How many players of a team are on the court?",
    answers: ["5", "6", "11"],
    explanation: "Each team plays with 6 on the court.",
  },
  tempi: {
    text: "How many periods does a game have?",
    answers: ["2", "3", "4"],
    explanation: "A game has 4 periods.",
  },
  "canestri-lato": {
    text: "Besides the 2 big baskets, what is on a Baskin court?",
    answers: [
      "Baskets at the side of the court",
      "A net in the middle",
      "Two goals, like in football",
    ],
    explanation:
      "At the sides of the court there are other, lower baskets. So every role has its own basket.",
  },
  "r1-palla-compagno": {
    text: "Who brings the ball to the Role 1 player?",
    answers: ["A teammate", "The referee", "The coach"],
    explanation: "Role 1 plays in their own area. A teammate brings them the ball.",
  },
  "r1-secondi": {
    text: "How long does Role 1 have to shoot?",
    answers: ["3 seconds", "10 seconds", "1 minute"],
    explanation: "Role 1 has 10 seconds to shoot, from when they get the ball.",
  },
  "palla-piccola": {
    text: "Which ball can Role 1 use?",
    answers: ["A football", "Only the normal ball", "A smaller ball"],
    explanation: "Role 1 can use a smaller ball. A simple change that helps.",
  },
  "r5-canestro": {
    text: "Which basket does Role 5 shoot at?",
    answers: ["The low side basket", "Only the big basket", "All the baskets"],
    explanation: "Role 5 shoots only at the big basket, like in basketball.",
  },
  "pivot-marcatura": {
    text: "Who can mark Role 1 and Role 2 players?",
    answers: ["Nobody", "Only Role 5", "Everyone"],
    explanation: "Nobody can mark Roles 1 and 2. They have an area all of their own.",
  },
  valore: {
    text: "How much is a basket worth in Baskin?",
    answers: ["1 point", "5 points", "2 or 3 points"],
    explanation:
      "A basket is worth 2 or 3 points. It depends on the role and where you shoot from.",
  },
  fondazione: {
    text: "In what year was Karibu born?",
    answers: ["In 2001", "In 2020", "In 2015"],
    explanation: "Karibu was born in 2015 in Montecchio Maggiore.",
  },
  fondatrici: {
    text: "Who started Karibu?",
    answers: ["A basketball team from Vicenza", "Four young women", "A school in Cremona"],
    explanation:
      "Karibu started from a project of the town council, driven by four young women who loved sport.",
  },
  citta: {
    text: "In which town does Karibu train?",
    answers: ["Montecchio Maggiore", "Vicenza", "Cremona"],
    explanation: "Karibu trains and plays in Montecchio Maggiore, near Vicenza.",
  },
  esperienza: {
    text: "Do you need experience to come to your first training session?",
    answers: ["Yes, at least a year of basketball", "No, come as you are", "Yes, there is a test"],
    explanation: "No experience needed. If you want to play, you are ready.",
  },
  inventori: {
    text: "Who invented Baskin?",
    answers: [
      "Two American basketball players",
      "Antonio Bodini and Fausto Capellini",
      "The town of Montecchio Maggiore",
    ],
    explanation:
      "Antonio Bodini and Fausto Capellini invented it. They wanted a sport where everyone has a real role.",
  },
  "regole-eisi": {
    text: "Who looks after the rules of Baskin today?",
    answers: ["EISI in Cremona", "The American NBA", "Every team makes its own"],
    explanation:
      "The rules are looked after by the Italian Inclusive Sports Body (EISI), in Cremona.",
  },
  maglia: {
    text: "On the jersey, what does the first digit of the number tell you?",
    answers: ["The player's role", "The player's age", "How many games they played"],
    explanation: "The first digit is the role, from 1 to 5. The others are the player's number.",
  },
  "r1-altezza": {
    text: "How high is the Role 1 basket?",
    answers: ["1.10 metres", "2.20 metres", "3.05 metres"],
    explanation: "For Role 1 there is a low basket, 1.10 metres high.",
  },
  "lato-altezza": {
    text: "How high are the baskets at the side of the court?",
    answers: ["1.10 metres", "2.20 metres", "3.05 metres"],
    explanation: "The side baskets are 2.20 metres high. The big one is 3.05 metres high.",
  },
  "r1-scelta": {
    text: "What can Role 1 choose when shooting?",
    answers: ["Three 1-point shots", "One 5-point shot", "One 3-point shot or two 2-point shots"],
    explanation: "Role 1 chooses: one shot for 3 points or two shots for 2 points.",
  },
  "r2-palleggi": {
    text: "How many times does Role 2 dribble at least before shooting?",
    answers: ["None", "2", "10"],
    explanation:
      "Role 2 dribbles at least 2 times, then moves to the spot they want to shoot from.",
  },
  "r3-passi": {
    text: "For which role do travelling and double dribble not count?",
    answers: ["Role 3", "Role 4", "Role 5"],
    explanation:
      "For Role 3 travelling and double dribble don't count. When they run with the ball, though, they dribble at least 2 times.",
  },
  "r3-marcatura": {
    text: "Who can mark a Role 3 player?",
    answers: ["A Role 5", "Anyone", "Only a Role 3"],
    explanation: "Only a Role 3 can mark a Role 3.",
  },
  "r4-arresto": {
    text: "What does Role 4 do before shooting?",
    answers: ["Dribbles 10 times", "Stops", "Asks the referee"],
    explanation: "Role 4 stops before shooting, and shoots only at the big basket.",
  },
  "r5-tiri": {
    text: "How many times at most can Role 5 shoot in one period?",
    answers: ["No limit", "3 times", "Once"],
    explanation: "Role 5 can shoot at most 3 times per period. So there is room for everyone.",
  },
  "r5-r4": {
    text: "Can a Role 5 mark a Role 4?",
    answers: ["Yes, always", "No", "Only in the last period"],
    explanation: "No. Role 5 marks only Role 5 players.",
  },
  "somma-ruoli": {
    text: "Adding up the role numbers on the court, the total is never more than…",
    answers: ["15", "23", "30"],
    explanation: "The roles on the court never add up to more than 23. So the teams stay even.",
  },
  "donna-uomo": {
    text: "Among Roles 4 and 5 on the court there are always…",
    answers: ["At least one woman and one man", "Only men", "Only people over 18"],
    explanation: "Among Roles 4 and 5 on the court there are at least one woman and one man.",
  },
  "durata-tempo": {
    text: "How long is one period of a Baskin game?",
    answers: ["20 minutes", "8 minutes", "45 minutes"],
    explanation: "Each period lasts 8 minutes. The clock stops at every whistle.",
  },
  "ultimo-tempo": {
    text: "In the last period, how long does a team have to shoot?",
    answers: ["30 seconds", "2 minutes", "5 seconds"],
    explanation: "In the last period each team has 30 seconds to shoot.",
  },
  rosa: {
    text: "How many players can a team have at most?",
    answers: ["6", "14", "25"],
    explanation: "A team has up to 14 players. 6 of them play on the court.",
  },
  "r3-canestro": {
    text: "How much is a Role 3 basket in the big basket worth?",
    answers: ["1 point", "2 points", "3 points"],
    explanation: "For Role 3 the big basket is worth 3 points. The side one is worth 2 points.",
  },
  campioni: {
    text: "What did Karibu win in 2018?",
    answers: ["The regional title", "The European championship", "The World Cup"],
    explanation: "In 2018, three years after it was born, Karibu became regional champion.",
  },
  pandemia: {
    text: "In 2020, during the pandemic, how did Karibu train?",
    answers: ["On video calls", "In a swimming pool", "In a park, at night"],
    explanation:
      "Training sessions became video calls. So the team stayed together until it could go back on court.",
  },
  "ten-league": {
    text: "What was the tournament for Karibu's 10th birthday called?",
    answers: ["Montecchio Cup", "Karibu Ten League", "Summer Tournament"],
    explanation: "In 2025 Karibu organised the Karibu Ten League, with 6 teams.",
  },
  "due-squadre": {
    text: "What are the two teams born in 2025 called?",
    answers: ["Lions and Tigers", "Romeo and Juliet", "Montekki and Kapuleti"],
    explanation: "With the 10th birthday two teams were born: the Montekki and the Kapuleti.",
  },
};

export interface QuizQuestion extends QuestionText {
  id: QuizQuestionId;
  level: QuizLevel;
  topic: QuizTopic;
  correct: 0 | 1 | 2;
  source: QuizSource;
}

export function getBaskinQuiz(locale: string): QuizQuestion[] {
  const texts = locale === "en" ? TEXT_EN : TEXT_IT;
  return QUESTIONS.map((q) => ({ ...q, ...texts[q.id] }));
}

/** Solo per i test: i due dizionari, per controllare che siano allineati. */
export const QUIZ_TEXTS_FOR_TEST = { it: TEXT_IT, en: TEXT_EN };
