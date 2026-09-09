export interface RoleInfo {
  role: number;
  label: string;
  tag: string;
  canestro: string;
  punteggio: string;
  marcatura: string;
  description: string;
}

export interface RuleInfo {
  title: string;
  text: string;
}

const ROLES_INFO_IT: RoleInfo[] = [
  {
    role: 1,
    label: "Ruolo 1: Il Pivot Fisso",
    tag: "Pivot",
    canestro: "Laterale basso (h. 1,10 m)",
    punteggio: "3 pt (1 tiro) • 2 pt (2 tiri)",
    marcatura: "Non marcabile",
    description:
      "Atleta con disabilità grave che non può spostarsi autonomamente nemmeno in carrozzina. Staziona nell'area laterale e aspetta che un compagno (tutor) gli consegni la palla. Può scegliere: un solo tiro che vale 3 punti, oppure due tentativi che valgono 2 punti. Ha 10 secondi dalla consegna per tirare. Può usare una palla di dimensioni ridotte.",
  },
  {
    role: 2,
    label: "Ruolo 2: Il Pivot di Movimento",
    tag: "Pivot",
    canestro: "Laterale alto (h. 2,20 m)",
    punteggio: "2 pt (settore centrale) • 3 pt (settore laterale)",
    marcatura: "Non marcabile",
    description:
      "Atleta con disabilità che possiede l'uso (anche parziale) delle mani e il cammino, ma non la corsa o non riesce a utilizzarla. È un pivot dinamico: riceve la palla in area, effettua almeno 2 palleggi, si sposta in uno dei tre settori del canestro laterale alto e tira. Ha 10 secondi di tempo. Il canestro vale 2 punti dal settore centrale, 3 punti dal settore laterale.",
  },
  {
    role: 3,
    label: "Ruolo 3: Il Protagonista",
    tag: "Protagonista",
    canestro: "Laterale alto o tradizionale",
    punteggio: "2 pt (laterale) • 3 pt (tradizionale)",
    marcatura: "Solo da Ruolo 3",
    description:
      "Atleta con disabilità che ha uso delle mani, cammino e corsa non fluida con scarso equilibrio. I Ruoli 4 e 5 non possono marcarlo (difesa illegale). Tira nel canestro laterale alto (fuori area) o nel canestro tradizionale. Ogni volta che corre con la palla deve eseguire almeno 2 palleggi durante la corsa. Non contano le infrazioni di passi e doppio, ma ogni tiro effettuato senza i 2 palleggi è annullato. Non può essere marcato da ruoli 4 o 5.",
  },
  {
    role: 4,
    label: "Ruolo 4: Lo specialista",
    tag: "Specialista",
    canestro: "Solo canestro tradizionale",
    punteggio: "2 pt (avanti) • 3 pt (dietro la linea)",
    marcatura: "Da Ruolo 3 o Ruolo 4",
    description:
      "Atleta con uso delle mani, cammino e corsa fluida con palleggio regolare. Tira esclusivamente nei canestri tradizionali. Il Ruolo 5 non può marcarlo (difesa illegale). Prima di tirare deve obbligatoriamente effettuare un arresto. Valgono le infrazioni di passi e doppio (ma non i passi di partenza). Non può essere marcato da ruoli 5.",
  },
  {
    role: 5,
    label: "Ruolo 5: Il Regista",
    tag: "Regista",
    canestro: "Solo canestro tradizionale",
    punteggio: "2 pt (avanti) • 3 pt (dietro la linea)",
    marcatura: "Da Ruolo 3, 4 o 5",
    description:
      "Atleta che possiede tutti i fondamentali del basket: palleggio, tiro, entrata, passaggio, difesa. Valgono tutte le regole del basket tradizionale. Può effettuare al massimo 3 tiri per tempo: al quarto il gioco viene fermato e la palla passa alla squadra avversaria. Può marcare solo giocatori dello stesso ruolo.",
  },
];

const ROLES_INFO_EN: RoleInfo[] = [
  {
    role: 1,
    label: "Role 1: The Fixed Pivot",
    tag: "Pivot",
    canestro: "Low side basket (h. 1.10 m)",
    punteggio: "3 pts (1 shot) • 2 pts (2 shots)",
    marcatura: "Cannot be marked",
    description:
      "An athlete with a severe disability who cannot move independently, even in a wheelchair. They stay in the side area and wait for a teammate (tutor) to hand them the ball. They can choose: a single shot worth 3 points, or two attempts worth 2 points. They have 10 seconds from the hand-off to shoot. They may use a smaller ball.",
  },
  {
    role: 2,
    label: "Role 2: The Moving Pivot",
    tag: "Pivot",
    canestro: "High side basket (h. 2.20 m)",
    punteggio: "2 pts (central sector) • 3 pts (side sector)",
    marcatura: "Cannot be marked",
    description:
      "An athlete with a disability who has (even partial) use of their hands and can walk, but cannot run or struggles to. They are a dynamic pivot: they receive the ball in the area, take at least 2 dribbles, move into one of the three sectors of the high side basket and shoot. They have 10 seconds. The basket is worth 2 points from the central sector, 3 points from the side sector.",
  },
  {
    role: 3,
    label: "Role 3: The Protagonist",
    tag: "Protagonist",
    canestro: "High side or traditional",
    punteggio: "2 pts (side) • 3 pts (traditional)",
    marcatura: "Only by Role 3",
    description:
      "An athlete with a disability who has use of their hands and a non-fluid walk and run with poor balance. Roles 4 and 5 cannot mark them (illegal defence). They shoot at the high side basket (outside the area) or at the traditional basket. Every time they run with the ball they must take at least 2 dribbles while running. Travelling and double-dribble violations don't count, but any shot taken without the 2 dribbles is annulled. They cannot be marked by roles 4 or 5.",
  },
  {
    role: 4,
    label: "Role 4: The Specialist",
    tag: "Specialist",
    canestro: "Traditional basket only",
    punteggio: "2 pts (front) • 3 pts (behind the line)",
    marcatura: "By Role 3 or Role 4",
    description:
      "An athlete with use of their hands and a fluid walk and run with regular dribbling. They shoot exclusively at the traditional baskets. Role 5 cannot mark them (illegal defence). Before shooting they must come to a stop. Travelling and double-dribble violations apply (but not the starting steps). They cannot be marked by role 5.",
  },
  {
    role: 5,
    label: "Role 5: The Playmaker",
    tag: "Playmaker",
    canestro: "Traditional basket only",
    punteggio: "2 pts (front) • 3 pts (behind the line)",
    marcatura: "By Role 3, 4 or 5",
    description:
      "An athlete who has all the fundamentals of basketball: dribbling, shooting, drives, passing, defence. All the rules of traditional basketball apply. They can take at most 3 shots per period: on the fourth, play is stopped and the ball goes to the opposing team. They can only mark players of the same role.",
  },
];

const RULES_IT: RuleInfo[] = [
  {
    title: "Il campo",
    text: "Campo da basket standard con 2 canestri tradizionali + 2 canestri laterali trasversali (h. 2,20 m). Sotto i laterali è possibile aggiungere un canestro basso (h. 1,10 m) per il Ruolo 1.",
  },
  {
    title: "Durata",
    text: "4 tempi da 8 minuti con cronometro fermato a ogni fischio. Nel 4° tempo e nei supplementari ogni squadra ha 30 secondi per concludere l'azione.",
  },
  {
    title: "La squadra",
    text: "Fino a 14 giocatori, 6 in campo. La somma dei ruoli in campo non deve superare 23. Obbligatori: 1 pivot, 1 Ruolo 3, almeno 2 Ruolo 5. Tra i ruoli 4 e 5 devono esserci almeno una donna e un uomo.",
  },
  {
    title: "Protezione dei pivot",
    text: "I giocatori di Ruolo 1 e 2 non possono essere marcati. Hanno aree protette riservate. I Ruoli 3 e 4 non possono essere marcati da ruoli superiori (difesa illegale).",
  },
  {
    title: "Canestri e punti",
    text: "Ogni giocatore (ruoli 1–4) può realizzare al massimo 3 canestri per tempo. Il Ruolo 5 può effettuare al massimo 3 tiri per tempo. I punti variano da 2 a 3 in base al ruolo e alla posizione di tiro.",
  },
  {
    title: "Infrazioni speciali",
    text: "Per i Ruoli 3, 4 e 5 non esiste il limite di campo né l'infrazione di 3 secondi. Per i Ruoli 3 non contano passi e doppio. Per i Ruoli 1 e 2 non contano i falli di campo.",
  },
];

const RULES_EN: RuleInfo[] = [
  {
    title: "The court",
    text: "A standard basketball court with 2 traditional baskets + 2 transverse side baskets (h. 2.20 m). Under the side baskets a low basket (h. 1.10 m) can be added for Role 1.",
  },
  {
    title: "Duration",
    text: "4 periods of 8 minutes with the clock stopped at every whistle. In the 4th period and in overtime each team has 30 seconds to complete its action.",
  },
  {
    title: "The team",
    text: "Up to 14 players, 6 on court. The sum of the roles on court must not exceed 23. Mandatory: 1 pivot, 1 Role 3, at least 2 Role 5. Among roles 4 and 5 there must be at least one woman and one man.",
  },
  {
    title: "Pivot protection",
    text: "Role 1 and 2 players cannot be marked. They have reserved protected areas. Roles 3 and 4 cannot be marked by higher roles (illegal defence).",
  },
  {
    title: "Baskets and points",
    text: "Each player (roles 1–4) can score at most 3 baskets per period. Role 5 can take at most 3 shots per period. Points range from 2 to 3 depending on the role and shooting position.",
  },
  {
    title: "Special violations",
    text: "For Roles 3, 4 and 5 there is no backcourt limit nor the 3-second violation. For Role 3, travelling and double-dribble don't count. For Roles 1 and 2, court fouls don't count.",
  },
];

export function getRolesInfo(locale: string): RoleInfo[] {
  return locale === "en" ? ROLES_INFO_EN : ROLES_INFO_IT;
}

export function getBaskinRules(locale: string): RuleInfo[] {
  return locale === "en" ? RULES_EN : RULES_IT;
}
