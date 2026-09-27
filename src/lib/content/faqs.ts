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
        a: "Il Baskin (basket inclusivo) è nato in Italia nel 2001. È uno sport di squadra: persone con e senza disabilità giocano insieme, nella stessa squadra. Ognuno ha un ruolo adatto alle sue capacità.",
      },
      {
        q: "Chi può giocare a Baskin?",
        a: "Tutti! Persone con disabilità fisica o cognitiva e persone senza disabilità giocano nella stessa squadra. Non serve aver già fatto sport.",
      },
      {
        q: "Come funzionano i ruoli?",
        a: "Ci sono 5 ruoli, da 1 a 5. Ogni giocatore ha il ruolo adatto alle sue capacità. Ogni ruolo ha le sue regole: così tutti giocano davvero. Il ruolo lo sceglie lo staff dopo averti visto giocare. Puoi farti un'idea con il questionario del ruolo.",
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
        a: "No. Il Baskin accoglie tutti. Per allenarti non serve nessun certificato medico. Per le partite ufficiali possono servire dei documenti: te lo spiega lo staff.",
      },
    ],
  },
  {
    category: "Iscrizioni e app",
    items: [
      {
        q: "Come mi iscrivo a un allenamento?",
        a: "Accedi con Google o con il link che ti mandiamo per email. Poi apri la pagina dell'allenamento e tocca «Iscriviti». Da lì puoi iscrivere anche i tuoi figli.",
      },
      {
        q: "Posso disdire un'iscrizione?",
        a: "Sì, puoi cancellare la tua iscrizione dalla pagina dell'allenamento fino all'orario di inizio.",
      },
      {
        q: "Non riesco ad accedere. Cosa faccio?",
        a: "Se non hai Google, accedi con l'email: scrivi il tuo indirizzo e ti mandiamo un link. Se hai già un account, usa la stessa email di sempre. Se ancora non funziona, scrivici dalla pagina Contatti.",
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
        a: "Baskin (inclusive basketball) was born in Italy in 2001. It is a team sport: people with and without disabilities play together, on the same team. Everyone has a role that suits their abilities.",
      },
      {
        q: "Who can play Baskin?",
        a: "Everyone! People with physical or cognitive disabilities and people without disabilities play on the same team. You do not need to have played sport before.",
      },
      {
        q: "How do the roles work?",
        a: "There are 5 roles, from 1 to 5. Each player has the role that suits their abilities. Each role has its own rules, so everyone really plays. The staff chooses the role after seeing you play. You can get an idea with the role questionnaire.",
      },
    ],
  },
  {
    category: "Taking part",
    items: [
      {
        q: "How can I join the team?",
        a: "You can come and try a training session with no commitment! Write to us from the Contact page or just show up at the gym. We'll explain everything on the spot.",
      },
      {
        q: "Where and when do you train?",
        a: "Training sessions take place in Montecchio Maggiore (VI). You can check the calendar on the website for up-to-date dates and times.",
      },
      {
        q: "Do I need a diagnosis to take part?",
        a: "No. Baskin welcomes everyone. You do not need a medical certificate to train. For official matches you may need some documents: the staff will explain.",
      },
    ],
  },
  {
    category: "Sign-ups & app",
    items: [
      {
        q: "How do I sign up for a training session?",
        a: 'Sign in with Google or with the link we email you. Then open the training session and tap "Sign up". From there you can also sign up your children.',
      },
      {
        q: "Can I cancel a sign-up?",
        a: "Yes, you can cancel your sign-up from the training session page up until the start time.",
      },
      {
        q: "I can't sign in. What do I do?",
        a: "If you don't use Google, sign in with your email: type your address and we send you a link. If you already have an account, use the same email as always. If it still doesn't work, write to us from the Contact page.",
      },
    ],
  },
];

export function getFaqs(locale: string): FaqCategory[] {
  return locale === "en" ? FAQS_EN : FAQS_IT;
}

/** @deprecated usare getFaqs(locale) — mantenuto per retrocompatibilità */
export const FAQS = FAQS_IT;
