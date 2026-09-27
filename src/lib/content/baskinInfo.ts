export interface RoleInfo {
  role: number;
  label: string;
  tag: string;
  canestro: string;
  punteggio: string;
  marcatura: string;
  /**
   * Cosa fa il giocatore in campo, una informazione per frase (linguaggio
   * facile, UX-17). E' il testo che leggono gli atleti stessi: descrive cosa
   * fanno, non cosa non possono fare.
   */
  summary: string[];
  /** Dettaglio tecnico per coach e arbitri, sotto "Regole complete". */
  description: string;
}

export interface RuleInfo {
  title: string;
  /** Una informazione per frase (linguaggio facile, UX-17). */
  items: string[];
}

const ROLES_INFO_IT: RoleInfo[] = [
  {
    role: 1,
    label: "Ruolo 1: Il Pivot Fisso",
    tag: "Pivot",
    canestro: "Canestro basso a lato del campo (1,10 m)",
    punteggio: "1 tiro da 3 punti, oppure 2 tiri da 2 punti",
    marcatura: "Nessuno lo può marcare",
    summary: [
      "Gioca nella sua zona, a lato del campo.",
      "Un compagno gli porta la palla.",
      "Ha 10 secondi per tirare.",
      "Sceglie: un tiro da 3 punti oppure due tiri da 2 punti.",
      "Può usare una palla più piccola.",
    ],
    description:
      "Atleta con disabilità grave che non può spostarsi autonomamente nemmeno in carrozzina. Staziona nell'area laterale e aspetta che un compagno (tutor) gli consegni la palla. Può scegliere: un solo tiro che vale 3 punti, oppure due tentativi che valgono 2 punti. Ha 10 secondi dalla consegna per tirare. Può usare una palla di dimensioni ridotte.",
  },
  {
    role: 2,
    label: "Ruolo 2: Il Pivot di Movimento",
    tag: "Pivot",
    canestro: "Canestro alto a lato del campo (2,20 m)",
    punteggio: "2 punti dal centro, 3 punti dai lati",
    marcatura: "Nessuno lo può marcare",
    summary: [
      "Riceve la palla nella sua zona, a lato del campo.",
      "Fa almeno 2 palleggi.",
      "Si sposta nel punto da cui vuole tirare.",
      "Ha 10 secondi per tirare.",
      "Dal centro il canestro vale 2 punti. Dai lati vale 3 punti.",
    ],
    description:
      "Atleta con disabilità che possiede l'uso (anche parziale) delle mani e il cammino, ma non la corsa o non riesce a utilizzarla. È un pivot dinamico: riceve la palla in area, effettua almeno 2 palleggi, si sposta in uno dei tre settori del canestro laterale alto e tira. Ha 10 secondi di tempo. Il canestro vale 2 punti dal settore centrale, 3 punti dal settore laterale.",
  },
  {
    role: 3,
    label: "Ruolo 3: Il Protagonista",
    tag: "Protagonista",
    canestro: "Canestro alto a lato oppure canestro grande",
    punteggio: "2 punti nel canestro a lato, 3 punti nel canestro grande",
    marcatura: "Solo un Ruolo 3",
    summary: [
      "Corre per il campo con la palla.",
      "Quando corre con la palla fa almeno 2 palleggi.",
      "Tira nel canestro alto a lato del campo o nel canestro grande.",
      "Nel canestro a lato vale 2 punti. Nel canestro grande vale 3 punti.",
      "Solo un giocatore di Ruolo 3 può marcarlo.",
    ],
    description:
      "Atleta con disabilità che ha uso delle mani, cammino e corsa non fluida con scarso equilibrio. I Ruoli 4 e 5 non possono marcarlo (difesa illegale). Tira nel canestro laterale alto (fuori area) o nel canestro tradizionale. Ogni volta che corre con la palla deve eseguire almeno 2 palleggi durante la corsa. Non contano le infrazioni di passi e doppio, ma ogni tiro effettuato senza i 2 palleggi è annullato.",
  },
  {
    role: 4,
    label: "Ruolo 4: Lo Specialista",
    tag: "Specialista",
    canestro: "Solo il canestro grande",
    punteggio: "2 punti, 3 punti da dietro la linea",
    marcatura: "Un Ruolo 3 o un Ruolo 4",
    summary: [
      "Corre e palleggia bene.",
      "Tira solo nel canestro grande.",
      "Prima di tirare si ferma.",
      "Possono marcarlo i giocatori di Ruolo 3 e di Ruolo 4.",
    ],
    description:
      "Atleta con uso delle mani, cammino e corsa fluida con palleggio regolare. Tira esclusivamente nei canestri tradizionali. Il Ruolo 5 non può marcarlo (difesa illegale). Prima di tirare deve obbligatoriamente effettuare un arresto. Valgono le infrazioni di passi e doppio (ma non i passi di partenza).",
  },
  {
    role: 5,
    label: "Ruolo 5: Il Regista",
    tag: "Regista",
    canestro: "Solo il canestro grande",
    punteggio: "2 punti, 3 punti da dietro la linea",
    marcatura: "Un Ruolo 3, 4 o 5",
    summary: [
      "Gioca come nel basket: palleggia, passa, tira e difende.",
      "Tira solo nel canestro grande.",
      "In ogni tempo può tirare al massimo 3 volte.",
      "Marca solo i giocatori di Ruolo 5.",
    ],
    description:
      "Atleta che possiede tutti i fondamentali del basket: palleggio, tiro, entrata, passaggio, difesa. Valgono tutte le regole del basket tradizionale. Può effettuare al massimo 3 tiri per tempo: al quarto il gioco viene fermato e la palla passa alla squadra avversaria. Può marcare solo giocatori dello stesso ruolo.",
  },
];

const ROLES_INFO_EN: RoleInfo[] = [
  {
    role: 1,
    label: "Role 1: The Fixed Pivot",
    tag: "Pivot",
    canestro: "Low basket at the side of the court (1.10 m)",
    punteggio: "1 shot for 3 points, or 2 shots for 2 points",
    marcatura: "Nobody can mark them",
    summary: [
      "They play in their own area, at the side of the court.",
      "A teammate brings them the ball.",
      "They have 10 seconds to shoot.",
      "They choose: one shot for 3 points or two shots for 2 points.",
      "They can use a smaller ball.",
    ],
    description:
      "An athlete with a severe disability who cannot move independently, even in a wheelchair. They stay in the side area and wait for a teammate (tutor) to hand them the ball. They can choose: a single shot worth 3 points, or two attempts worth 2 points. They have 10 seconds from the hand-off to shoot. They may use a smaller ball.",
  },
  {
    role: 2,
    label: "Role 2: The Moving Pivot",
    tag: "Pivot",
    canestro: "High basket at the side of the court (2.20 m)",
    punteggio: "2 points from the centre, 3 points from the sides",
    marcatura: "Nobody can mark them",
    summary: [
      "They get the ball in their own area, at the side of the court.",
      "They dribble at least 2 times.",
      "They move to the spot they want to shoot from.",
      "They have 10 seconds to shoot.",
      "From the centre a basket is worth 2 points. From the sides it is worth 3 points.",
    ],
    description:
      "An athlete with a disability who has (even partial) use of their hands and can walk, but cannot run or struggles to. They are a dynamic pivot: they receive the ball in the area, take at least 2 dribbles, move into one of the three sectors of the high side basket and shoot. They have 10 seconds. The basket is worth 2 points from the central sector, 3 points from the side sector.",
  },
  {
    role: 3,
    label: "Role 3: The Protagonist",
    tag: "Protagonist",
    canestro: "High side basket or big basket",
    punteggio: "2 points in the side basket, 3 points in the big basket",
    marcatura: "Only a Role 3",
    summary: [
      "They run around the court with the ball.",
      "When they run with the ball, they dribble at least 2 times.",
      "They shoot at the high side basket or at the big basket.",
      "In the side basket it is worth 2 points. In the big basket it is worth 3 points.",
      "Only a Role 3 player can mark them.",
    ],
    description:
      "An athlete with a disability who has use of their hands and a non-fluid walk and run with poor balance. Roles 4 and 5 cannot mark them (illegal defence). They shoot at the high side basket (outside the area) or at the traditional basket. Every time they run with the ball they must take at least 2 dribbles while running. Travelling and double-dribble violations don't count, but any shot taken without the 2 dribbles is annulled.",
  },
  {
    role: 4,
    label: "Role 4: The Specialist",
    tag: "Specialist",
    canestro: "Big basket only",
    punteggio: "2 points, 3 points from behind the line",
    marcatura: "A Role 3 or a Role 4",
    summary: [
      "They run and dribble well.",
      "They shoot only at the big basket.",
      "They stop before they shoot.",
      "Role 3 and Role 4 players can mark them.",
    ],
    description:
      "An athlete with use of their hands and a fluid walk and run with regular dribbling. They shoot exclusively at the traditional baskets. Role 5 cannot mark them (illegal defence). Before shooting they must come to a stop. Travelling and double-dribble violations apply (but not the starting steps).",
  },
  {
    role: 5,
    label: "Role 5: The Playmaker",
    tag: "Playmaker",
    canestro: "Big basket only",
    punteggio: "2 points, 3 points from behind the line",
    marcatura: "A Role 3, 4 or 5",
    summary: [
      "They play like in basketball: they dribble, pass, shoot and defend.",
      "They shoot only at the big basket.",
      "In each period they can shoot 3 times at most.",
      "They mark only Role 5 players.",
    ],
    description:
      "An athlete who has all the fundamentals of basketball: dribbling, shooting, drives, passing, defence. All the rules of traditional basketball apply. They can take at most 3 shots per period: on the fourth, play is stopped and the ball goes to the opposing team. They can only mark players of the same role.",
  },
];

const RULES_IT: RuleInfo[] = [
  {
    title: "Il campo",
    items: [
      "È un campo da basket normale.",
      "Ha 2 canestri grandi, come nel basket.",
      "Ha anche 2 canestri a lato del campo, alti 2,20 metri.",
      "Per il Ruolo 1 si aggiunge un canestro basso, alto 1,10 metri.",
    ],
  },
  {
    title: "Durata",
    items: [
      "Una partita ha 4 tempi.",
      "Ogni tempo dura 8 minuti.",
      "A ogni fischio il tempo si ferma.",
      "Nell'ultimo tempo ogni squadra ha 30 secondi per tirare.",
    ],
  },
  {
    title: "La squadra",
    items: [
      "Una squadra ha fino a 14 giocatori.",
      "In campo giocano in 6.",
      "Sommando i numeri dei ruoli in campo, il totale non supera 23.",
      "In campo ci sono sempre un pivot (Ruolo 1 o 2), un Ruolo 3 e almeno due Ruolo 5.",
      "Tra i Ruoli 4 e 5 in campo ci sono almeno una donna e un uomo.",
    ],
  },
  {
    title: "Protezione dei pivot",
    items: [
      "Nessuno può marcare i Ruoli 1 e 2.",
      "I Ruoli 1 e 2 hanno una zona tutta loro.",
      "Solo un Ruolo 3 può marcare un Ruolo 3.",
      "Un Ruolo 5 non può marcare un Ruolo 4.",
    ],
  },
  {
    title: "Canestri e punti",
    items: [
      "Dal Ruolo 1 al Ruolo 4, ogni giocatore segna al massimo 3 canestri per tempo.",
      "Il Ruolo 5 può tirare al massimo 3 volte per tempo.",
      "Un canestro vale 2 o 3 punti.",
      "Dipende dal ruolo e dal punto in cui si tira.",
    ],
  },
  {
    title: "Regole speciali",
    items: [
      "Per i Ruoli 3, 4 e 5 non c'è la regola dei 3 secondi.",
      "I Ruoli 3, 4 e 5 possono tornare nella propria metà campo.",
      "Per il Ruolo 3 non contano passi e doppio palleggio.",
      "Per i Ruoli 1 e 2 non contano i falli in campo.",
    ],
  },
];

const RULES_EN: RuleInfo[] = [
  {
    title: "The court",
    items: [
      "It is a normal basketball court.",
      "It has 2 big baskets, like in basketball.",
      "It also has 2 baskets at the sides of the court, 2.20 metres high.",
      "For Role 1 a low basket is added, 1.10 metres high.",
    ],
  },
  {
    title: "Duration",
    items: [
      "A match has 4 periods.",
      "Each period lasts 8 minutes.",
      "The clock stops at every whistle.",
      "In the last period each team has 30 seconds to shoot.",
    ],
  },
  {
    title: "The team",
    items: [
      "A team has up to 14 players.",
      "6 players are on the court.",
      "If you add up the role numbers on the court, the total is 23 or less.",
      "On the court there is always a pivot (Role 1 or 2), a Role 3 and at least two Role 5 players.",
      "Among Roles 4 and 5 on the court there are at least one woman and one man.",
    ],
  },
  {
    title: "Pivot protection",
    items: [
      "Nobody can mark Roles 1 and 2.",
      "Roles 1 and 2 have their own area.",
      "Only a Role 3 can mark a Role 3.",
      "A Role 5 cannot mark a Role 4.",
    ],
  },
  {
    title: "Baskets and points",
    items: [
      "From Role 1 to Role 4, each player scores at most 3 baskets per period.",
      "Role 5 can shoot at most 3 times per period.",
      "A basket is worth 2 or 3 points.",
      "It depends on the role and on where you shoot from.",
    ],
  },
  {
    title: "Special rules",
    items: [
      "For Roles 3, 4 and 5 there is no 3-second rule.",
      "Roles 3, 4 and 5 can go back into their own half.",
      "For Role 3, travelling and double dribble don't count.",
      "For Roles 1 and 2, court fouls don't count.",
    ],
  },
];

export function getRolesInfo(locale: string): RoleInfo[] {
  return locale === "en" ? ROLES_INFO_EN : ROLES_INFO_IT;
}

export function getBaskinRules(locale: string): RuleInfo[] {
  return locale === "en" ? RULES_EN : RULES_IT;
}
