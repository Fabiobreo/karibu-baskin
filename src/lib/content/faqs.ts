export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  category: string;
  items: FaqItem[];
}

const FAQS_IT: FaqCategory[] = [
  {
    category: "Il Baskin",
    items: [
      {
        q: "Cos'è il Baskin?",
        a: "Il Baskin (Basket Inclusivo) è uno sport di squadra nato in Italia nel 2001 che permette a persone con e senza disabilità di giocare insieme nella stessa squadra, con pari dignità. Ogni giocatore ha un ruolo specifico adatto alle proprie capacità.",
      },
      {
        q: "Chi può giocare a Baskin?",
        a: "Tutti! Il Baskin è pensato per essere inclusivo: giocatori con disabilità fisiche o cognitive e giocatori normodotati condividono il campo nella stessa squadra. Non è necessaria alcuna esperienza sportiva pregressa.",
      },
      {
        q: "Come funzionano i ruoli?",
        a: "I giocatori sono suddivisi in 5 ruoli (R1–R5) in base alle proprie abilità motorie e cognitive. Ogni ruolo ha regole specifiche che garantiscono a tutti di partecipare attivamente al gioco. Il ruolo viene assegnato dagli allenatori dopo un periodo di osservazione.",
      },
    ],
  },
  {
    category: "Partecipare",
    items: [
      {
        q: "Come posso iscrivermi alla squadra?",
        a: "Puoi venire a provare un allenamento senza impegno! Scrivici dalla pagina Contatti o presentati direttamente in palestra. Ti spiegheremo tutto sul posto.",
      },
      {
        q: "Dove e quando vi allenate?",
        a: "Gli allenamenti si tengono a Montecchio Maggiore (VI). Puoi controllare il calendario sul sito per date e orari aggiornati.",
      },
      {
        q: "È necessario avere una diagnosi per partecipare?",
        a: "No. Il Baskin accoglie tutti. Non è richiesta alcuna certificazione medica per partecipare agli allenamenti. Per le gare agonistiche ufficiali possono essere necessari documenti specifici. Il nostro staff ti guiderà.",
      },
    ],
  },
  {
    category: "Iscrizioni e app",
    items: [
      {
        q: "Come mi iscrivo a un allenamento?",
        a: "Accedi con il tuo account Google, vai sulla pagina dell'allenamento e clicca su 'Iscriviti'. Puoi anche iscrivere i tuoi figli dalla sezione Profilo.",
      },
      {
        q: "Posso disdire un'iscrizione?",
        a: "Sì, puoi cancellare la tua iscrizione dalla pagina dell'allenamento fino all'orario di inizio.",
      },
      {
        q: "Non riesco ad accedere con Google, cosa faccio?",
        a: "Assicurati di usare lo stesso account Google con cui ti sei registrato/a in precedenza. Se il problema persiste, scrivici dalla pagina Contatti.",
      },
    ],
  },
];

const FAQS_EN: FaqCategory[] = [
  {
    category: "Baskin",
    items: [
      {
        q: "What is Baskin?",
        a: "Baskin (Inclusive Basketball) is a team sport born in Italy in 2001 that lets people with and without disabilities play together on the same team, with equal dignity. Each player has a specific role suited to their abilities.",
      },
      {
        q: "Who can play Baskin?",
        a: "Everyone! Baskin is designed to be inclusive: players with physical or cognitive disabilities and able-bodied players share the court on the same team. No prior sports experience is required.",
      },
      {
        q: "How do the roles work?",
        a: "Players are divided into 5 roles (R1–R5) based on their motor and cognitive abilities. Each role has specific rules that ensure everyone takes an active part in the game. The role is assigned by the coaches after a period of observation.",
      },
    ],
  },
  {
    category: "Taking part",
    items: [
      {
        q: "How can I join the team?",
        a: "You can come and try a training session with no commitment! Write to us from the Contacts page or just show up at the gym. We'll explain everything on the spot.",
      },
      {
        q: "Where and when do you train?",
        a: "Trainings take place in Montecchio Maggiore (VI). You can check the calendar on the website for up-to-date dates and times.",
      },
      {
        q: "Do I need a diagnosis to take part?",
        a: "No. Baskin welcomes everyone. No medical certification is required to take part in training sessions. For official competitive matches specific documents may be needed. Our staff will guide you.",
      },
    ],
  },
  {
    category: "Registration & app",
    items: [
      {
        q: "How do I register for a training?",
        a: "Log in with your Google account, go to the training page and click 'Register'. You can also register your children from the Profile section.",
      },
      {
        q: "Can I cancel a registration?",
        a: "Yes, you can cancel your registration from the training page up until the start time.",
      },
      {
        q: "I can't log in with Google, what do I do?",
        a: "Make sure you're using the same Google account you registered with before. If the problem persists, write to us from the Contacts page.",
      },
    ],
  },
];

export function getFaqs(locale: string): FaqCategory[] {
  return locale === "en" ? FAQS_EN : FAQS_IT;
}

/** @deprecated usare getFaqs(locale) — mantenuto per retrocompatibilità */
export const FAQS = FAQS_IT;
