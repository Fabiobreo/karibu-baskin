export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  category: string;
  items: FaqItem[];
}

export const FAQS: FaqCategory[] = [
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
        a: "No. Il Baskin accoglie tutti. Non è richiesta alcuna certificazione medica per partecipare agli allenamenti. Per le gare agonistiche ufficiali possono essere necessari documenti specifici — il nostro staff ti guiderà.",
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
