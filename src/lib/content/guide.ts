/**
 * Guida all'app (`/guida`): le basi di tutto quello che genitori e atleti
 * possono fare. Frasi brevi, una informazione per frase (linguaggio facile,
 * UX-17).
 *
 * Quando cambia un flusso dell'app, il capitolo va aggiornato qui, in tutte e
 * due le lingue: `guide.test.ts` tiene allineati capitoli e link.
 */

export type GuideIcon =
  | "login"
  | "install"
  | "notifications"
  | "family"
  | "pending"
  | "role"
  | "training"
  | "match"
  | "event"
  | "calendar"
  | "news"
  | "profile"
  | "privacy"
  | "help";

export interface GuideLink {
  href: string;
  label: string;
}

export interface GuideChapter {
  /** Ancora della pagina (`/guida#notifiche`): uguale nelle due lingue. */
  id: string;
  icon: GuideIcon;
  title: string;
  steps: string[];
  /** Solo per "Installare l'app": i passi cambiano con il telefono. */
  install?: { android: string[]; ios: string[] };
  note?: string;
  links?: GuideLink[];
}

export interface GuideGroup {
  title: string;
  chapters: GuideChapter[];
}

/** I tre passi iniziali: ognuno rimanda al suo capitolo. */
export interface GuideStartStep {
  chapterId: string;
  title: string;
  text: string;
}

export interface Guide {
  start: GuideStartStep[];
  groups: GuideGroup[];
}

const GUIDE_IT: Guide = {
  start: [
    {
      chapterId: "entrare",
      title: "Entra",
      text: "Con Google, oppure con un link che ti mandiamo per email. Non c'è nessuna password.",
    },
    {
      chapterId: "installare",
      title: "Metti l'app sul telefono",
      text: "Così la apri con un tocco, come le altre app.",
    },
    {
      chapterId: "notifiche",
      title: "Attiva le notifiche",
      text: "Ti avvisiamo noi quando c'è un allenamento nuovo o una partita.",
    },
  ],
  groups: [
    {
      title: "Per cominciare",
      chapters: [
        {
          id: "entrare",
          icon: "login",
          title: "Entrare",
          steps: [
            "Tocca «Accedi».",
            "Se hai un account Google, tocca «Accedi con Google».",
            "Se non hai Google, scrivi la tua email e tocca «Mandami un link di accesso». Va bene qualsiasi indirizzo: Libero, Alice, Yahoo, Hotmail.",
            "Apri l'email che ti arriva e tocca il link. Il link vale 24 ore e funziona una volta sola.",
            "Se entri con il link per email, la prima volta ti chiediamo come ti chiami.",
          ],
          note: "Usa l'email che hai dato allo staff, e sempre la stessa. Con un'email diversa nasce un account nuovo, senza i tuoi figli e le tue iscrizioni.",
          links: [{ href: "/login", label: "Accedi" }],
        },
        {
          id: "installare",
          icon: "install",
          title: "Installare l'app sul telefono",
          steps: [
            "L'app non si scarica come le altre. Si aggiunge alla schermata Home del telefono, dal sito.",
            "Poi si apre a schermo intero e si avvia più in fretta.",
          ],
          install: {
            android: [
              "Apri il sito con Chrome.",
              "Tocca i tre puntini in alto a destra.",
              "Tocca «Aggiungi a schermata Home» oppure «Installa app».",
              "Conferma con «Installa».",
            ],
            ios: [
              "Apri il sito con Safari. Con altre app può non funzionare.",
              "Tocca il bottone Condividi: è il quadrato con la freccia verso l'alto.",
              "Scorri e tocca «Aggiungi a Home».",
              "Tocca «Aggiungi» in alto a destra.",
            ],
          },
          note: "Su iPhone le notifiche arrivano solo se l'app è installata: fai prima questo passo.",
        },
        {
          id: "notifiche",
          icon: "notifications",
          title: "Attivare le notifiche",
          steps: [
            "Apri il tuo profilo e tocca la scheda «Notifiche».",
            "Tocca «Attiva notifiche push» e rispondi «Consenti» alla domanda del telefono.",
            "Le notifiche valgono per il telefono che stai usando. Se usi anche un tablet o un computer, attivale anche lì.",
            "Sotto scegli quali avvisi vedere nell'app: nuovi allenamenti, squadre pronte, risultati, news e sondaggi.",
            "Gli avvisi arrivati li trovi nella campanella, anche se non hai attivato le notifiche.",
          ],
          links: [{ href: "/profilo?tab=notifiche", label: "Apri le notifiche del profilo" }],
        },
      ],
    },
    {
      title: "La tua famiglia",
      chapters: [
        {
          id: "figli",
          icon: "family",
          title: "I tuoi figli",
          steps: [
            "La scheda «Famiglia» compare quando lo staff segna il tuo account come genitore. Se non la vedi, scrivi allo staff.",
            "Apri il tuo profilo e tocca la scheda «Famiglia». Lì trovi i tuoi figli.",
            "Per aggiungerne uno tocca «Aggiungi un figlio o una figlia».",
            "Se tuo figlio o tua figlia ha già un profilo nell'app, cercalo per nome o per email. Se non c'è, crealo tu.",
            "Chi ha già un account suo riceve un avviso e deve confermare il collegamento.",
            "Da quel momento puoi iscrivere tuo figlio o tua figlia agli allenamenti, e rispondere al suo posto per partite ed eventi.",
            "«Gestito anche da…» vuol dire che anche un altro genitore lo segue. Per aggiungere il secondo genitore scrivi allo staff.",
          ],
          note: "Dalla stessa scheda puoi correggere i dati di un figlio, o toglierlo dal tuo profilo.",
          links: [{ href: "/profilo?tab=famiglia", label: "Apri la scheda Famiglia" }],
        },
        {
          id: "account-in-attesa",
          icon: "pending",
          title: "Account nuovo, in attesa di conferma",
          steps: [
            "Un account nuovo è «Ospite» finché lo staff non lo conferma. Di solito bastano pochi giorni.",
            "Intanto in home e nel profilo trovi «I tuoi primi passi»: ti dicono cosa puoi già fare.",
            "Se giochi tu, puoi già iscriverti a un allenamento.",
            "Sei un genitore? Aspetta la conferma: poi iscrivi i tuoi figli dalla pagina dell'allenamento.",
            "Dopo la conferma vedi anche squadre, convocati e statistiche.",
          ],
          links: [{ href: "/profilo", label: "Apri il profilo" }],
        },
        {
          id: "ruolo",
          icon: "role",
          title: "Il ruolo Baskin",
          steps: [
            "Nel Baskin ogni giocatore ha un ruolo da 1 a 5, adatto alle sue capacità.",
            "Giochi tu? Con il questionario del ruolo ti fai un'idea in due minuti.",
            "Per un figlio non usare questo questionario: le domande compaiono nel modulo di iscrizione, la prima volta che lo iscrivi.",
            "Il questionario dà solo un suggerimento. Il ruolo lo sceglie lo staff, dopo aver visto il giocatore in campo.",
          ],
          links: [
            { href: "/profilo/ruolo", label: "Fai il questionario per te" },
            { href: "/il-baskin", label: "Come funzionano i ruoli" },
          ],
        },
      ],
    },
    {
      title: "Allenamenti, partite ed eventi",
      chapters: [
        {
          id: "allenamenti",
          icon: "training",
          title: "Iscriversi a un allenamento",
          steps: [
            "In home trovi «La tua prossima cosa da fare»: se c'è un allenamento aperto, ti porta lì.",
            "Oppure apri «Allenamenti» e tocca l'allenamento che ti interessa.",
            "Alla domanda «Per chi ti iscrivi?» scegli te o uno dei tuoi figli. Per iscrivere più persone ripeti l'iscrizione.",
            "Hai cambiato idea? Nella pagina dell'allenamento, nella lista degli iscritti, tocca la × vicino al nome.",
            "Se il tuo account è ancora «Ospite» non vedi la lista: per togliere l'iscrizione scrivi allo staff.",
            "«Iscrizioni chiuse» vuol dire che lo staff non accetta più iscritti. «Iscrizioni in arrivo» vuol dire che non sono ancora aperte.",
            "Alcuni allenamenti sono riservati a una squadra o ad alcuni ruoli: te lo dice la pagina.",
            "Quando lo staff prepara le squadre, nella pagina leggi in quale squadra giochi.",
            "Nella pagina trovi anche il luogo, con il link a Google Maps.",
          ],
          links: [{ href: "/allenamenti", label: "Vedi gli allenamenti" }],
        },
        {
          id: "partite",
          icon: "match",
          title: "Partite e disponibilità",
          steps: [
            "Prima di una partita lo staff chiede chi c'è. Rispondi da «Le mie disponibilità», nel profilo.",
            "Tocca «Sì» o «No» per ogni partita: la risposta si salva subito. Rispondi anche per i tuoi figli.",
            "Se non rispondi, per lo staff non sei disponibile.",
            "Poi lo staff sceglie i convocati. Li vedi nella pagina della partita.",
            "Nella pagina della partita trovi «Dove e quando» e il bottone «Aggiungi al calendario».",
            "In «Partite» trovi anche risultati, classifiche e marcatori.",
          ],
          links: [
            { href: "/profilo/disponibilita", label: "Le mie disponibilità" },
            { href: "/partite", label: "Prossime partite" },
          ],
        },
        {
          id: "eventi",
          icon: "event",
          title: "Rispondere a un evento",
          steps: [
            "Feste, tornei e trasferte sono in «Eventi».",
            "Apri l'evento e vai a «Chi viene?».",
            "Uno risponde per tutta la famiglia: per ogni persona tocca «Sì» o «No».",
            "Se c'è altro da scegliere, come il pranzo, rispondi «Sì» o «No» anche a quello.",
            "Se lo staff lo permette, puoi aggiungere persone che non sono nell'app, come un nonno o un amico.",
            "Puoi cambiare le risposte con «Modifica le risposte», finché l'evento non è concluso.",
          ],
          links: [{ href: "/eventi", label: "Vedi gli eventi" }],
        },
        {
          id: "calendario",
          icon: "calendar",
          title: "Il calendario",
          steps: [
            "Nel calendario trovi allenamenti, partite ed eventi, mese per mese.",
            "Tocca un giorno per vedere cosa c'è.",
            "Con «Aggiungi al tuo calendario» porti tutto nel calendario del telefono. Le novità arrivano da sole.",
            "Con Google Calendar gli aggiornamenti possono arrivare dopo un giorno.",
          ],
          links: [{ href: "/calendario", label: "Apri il calendario" }],
        },
      ],
    },
    {
      title: "Il resto dell'app",
      chapters: [
        {
          id: "news",
          icon: "news",
          title: "News, sondaggi e foto",
          steps: [
            "In «News» leggi gli avvisi e gli articoli del club.",
            "Alcune news hanno un sondaggio. Per votare devi aver fatto l'accesso.",
            "Puoi cambiare il tuo voto finché il sondaggio non chiude.",
            "In «Gallery» trovi le foto e i video del club.",
          ],
          links: [{ href: "/news", label: "Leggi le news" }],
        },
        {
          id: "profilo",
          icon: "profile",
          title: "Profilo e traguardi",
          steps: [
            "Nel profilo puoi cambiare il tuo nome e la tua foto.",
            "Se giochi, trovi le tue presenze agli allenamenti e i tuoi traguardi.",
            "I traguardi dei tuoi figli sono nella scheda «Famiglia».",
            "Tema chiaro o scuro e lingua si cambiano dal menu, in alto.",
          ],
          links: [{ href: "/profilo", label: "Apri il profilo" }],
        },
        {
          id: "chi-vede-cosa",
          icon: "privacy",
          title: "Chi vede cosa",
          steps: [
            "Chi non fa parte del club non vede i minori: né nelle squadre, né nelle partite, né tra i marcatori.",
            "Solo le persone confermate dallo staff vedono chi gioca nelle squadre e chi è iscritto agli allenamenti.",
            "La data di nascita non compare mai in pubblico.",
            "Nel profilo, scheda «Privacy», puoi scaricare i tuoi dati e quelli dei tuoi figli.",
            "Hai perso il telefono? Da lì esci dall'app dappertutto, in una volta sola.",
            "Sempre da lì puoi chiedere di cancellare il tuo account.",
          ],
          links: [
            { href: "/profilo?tab=privacy", label: "Apri la scheda Privacy" },
            { href: "/privacy", label: "Informativa privacy" },
          ],
        },
        {
          id: "aiuto",
          icon: "help",
          title: "Se qualcosa non va",
          steps: [
            "Il link di accesso non arriva: guarda nella posta indesiderata (spam). Se non c'è, richiedilo di nuovo.",
            "Non trovi i tuoi figli o le tue iscrizioni: forse hai usato un'email diversa. Tocca «Esci» nel menu e rientra con quella di sempre.",
            "Le notifiche non arrivano: controlla che siano attive nel profilo. Su iPhone l'app deve essere installata.",
            "L'app dice che le notifiche sono bloccate: sbloccale dalle impostazioni del telefono, alla voce Notifiche.",
            "Vuoi proporre un miglioramento? Fai l'accesso e manda un suggerimento dalla pagina Contatti. Lo staff non vede chi l'ha scritto.",
            "Per tutto il resto scrivi allo staff.",
          ],
          links: [
            { href: "/contatti", label: "Scrivi allo staff" },
            { href: "/contatti#suggerimenti", label: "Manda un suggerimento" },
            { href: "/faq", label: "Domande frequenti" },
          ],
        },
      ],
    },
  ],
};

const GUIDE_EN: Guide = {
  start: [
    {
      chapterId: "entrare",
      title: "Sign in",
      text: "With Google, or with a link we email you. There is no password.",
    },
    {
      chapterId: "installare",
      title: "Put the app on your phone",
      text: "You open it with one tap, like your other apps.",
    },
    {
      chapterId: "notifiche",
      title: "Turn on notifications",
      text: "We tell you when there is a new training session or a match.",
    },
  ],
  groups: [
    {
      title: "Getting started",
      chapters: [
        {
          id: "entrare",
          icon: "login",
          title: "Signing in",
          steps: [
            'Tap "Sign in".',
            'If you have a Google account, tap "Sign in with Google".',
            'If you do not use Google, type your email and tap "Send me a sign-in link". Any address works.',
            "Open the email you receive and tap the link. The link is valid for 24 hours and works only once.",
            "If you sign in with the email link, the first time we ask your name.",
          ],
          note: "Use the email you gave the staff, and always the same one. A different email creates a new account, without your children and your sign-ups.",
          links: [{ href: "/login", label: "Sign in" }],
        },
        {
          id: "installare",
          icon: "install",
          title: "Installing the app on your phone",
          steps: [
            "You do not download this app like the others. You add it to your phone's Home screen, from the site.",
            "Then it opens full screen and starts faster.",
          ],
          install: {
            android: [
              "Open the site with Chrome.",
              "Tap the three dots at the top right.",
              'Tap "Add to Home screen" or "Install app".',
              'Confirm with "Install".',
            ],
            ios: [
              "Open the site with Safari. Other apps may not work.",
              "Tap the Share button: the square with an arrow pointing up.",
              'Scroll and tap "Add to Home Screen".',
              'Tap "Add" at the top right.',
            ],
          },
          note: "On iPhone, notifications only arrive if the app is installed: do this step first.",
        },
        {
          id: "notifiche",
          icon: "notifications",
          title: "Turning on notifications",
          steps: [
            'Open your profile and tap the "Notifications" tab.',
            'Tap "Enable push notifications" and answer "Allow" when your phone asks.',
            "Notifications are for the phone you are using. If you also use a tablet or a computer, turn them on there as well.",
            "Below, choose which alerts you see in the app: new training sessions, teams ready, results, news and polls.",
            "You find past alerts under the bell, even if you did not turn notifications on.",
          ],
          links: [{ href: "/profilo?tab=notifiche", label: "Open profile notifications" }],
        },
      ],
    },
    {
      title: "Your family",
      chapters: [
        {
          id: "figli",
          icon: "family",
          title: "Your children",
          steps: [
            'The "Family" tab appears once the staff marks your account as a parent. If you do not see it, write to the staff.',
            'Open your profile and tap the "Family" tab. Your children are there.',
            'To add one, tap "Add child".',
            "If your child already has a profile in the app, search for it by name or email. If not, create it yourself.",
            "A child with their own account gets an alert and must confirm the link.",
            "From then on you can sign them up for training and answer for them about matches and events.",
            '"Also managed by…" means another parent looks after them too. To add the second parent, write to the staff.',
          ],
          note: "From the same tab you can correct a child's details, or remove them from your profile.",
          links: [{ href: "/profilo?tab=famiglia", label: "Open the Family tab" }],
        },
        {
          id: "account-in-attesa",
          icon: "pending",
          title: "Account awaiting confirmation",
          steps: [
            'A new account is a "Guest" until the staff confirms it. It usually takes a few days.',
            'In the meantime, the home page and your profile show "Your first steps": what you can already do.',
            "If you play yourself, you can already sign up for a training session.",
            "Are you a parent? Wait for confirmation: then sign up your children from the training page.",
            "After confirmation you also see teams, call-ups and statistics.",
          ],
          links: [{ href: "/profilo", label: "Open your profile" }],
        },
        {
          id: "ruolo",
          icon: "role",
          title: "The Baskin role",
          steps: [
            "In Baskin every player has a role from 1 to 5 that suits their abilities.",
            "Do you play yourself? The role questionnaire gives you an idea in two minutes.",
            "For a child, do not use this questionnaire: the questions appear in the sign-up form, the first time you sign them up.",
            "The questionnaire only gives a suggestion. The staff chooses the role after seeing the player on court.",
          ],
          links: [
            { href: "/profilo/ruolo", label: "Take the questionnaire for yourself" },
            { href: "/il-baskin", label: "How roles work" },
          ],
        },
      ],
    },
    {
      title: "Training, matches and events",
      chapters: [
        {
          id: "allenamenti",
          icon: "training",
          title: "Signing up for training",
          steps: [
            'The home page shows "Your next thing to do": if a training session is open, it takes you there.',
            'Or open "Training" and tap the session you want.',
            'At "Who are you signing up?" choose yourself or one of your children. To sign up more people, repeat the sign-up.',
            "Changed your mind? On the training page, in the list of people signed up, tap the × next to the name.",
            'If your account is still a "Guest" you do not see the list: to cancel the sign-up, write to the staff.',
            '"Sign-ups closed" means the staff is not taking more players. "Sign-ups opening soon" means they are not open yet.',
            "Some sessions are reserved for one team or for some roles: the page tells you.",
            "When the staff prepares the teams, the page tells you which team you play in.",
            "The page also shows the place, with a link to Google Maps.",
          ],
          links: [{ href: "/allenamenti", label: "See training sessions" }],
        },
        {
          id: "partite",
          icon: "match",
          title: "Matches and availability",
          steps: [
            'Before a match the staff asks who can come. Answer from "My availabilities", in your profile.',
            'Tap "Yes" or "No" for each match: the answer is saved straight away. Answer for your children too.',
            "If you do not answer, the staff counts you as not available.",
            "Then the staff picks the squad. You see it on the match page.",
            'The match page shows "Where and when" and the "Add to calendar" button.',
            'Under "Matches" you also find results, standings and scorers.',
          ],
          links: [
            { href: "/profilo/disponibilita", label: "My availabilities" },
            { href: "/partite", label: "Upcoming matches" },
          ],
        },
        {
          id: "eventi",
          icon: "event",
          title: "Answering an event",
          steps: [
            'Parties, tournaments and trips are under "Events".',
            'Open the event and go to "Who\'s coming?".',
            'One person answers for the whole family: tap "Yes" or "No" for each person.',
            'If there is something else to choose, such as lunch, answer "Yes" or "No" to that too.',
            "If the staff allows it, you can add people who are not in the app, such as a grandparent or a friend.",
            'You can change your answers with "Edit answers" until the event is over.',
          ],
          links: [{ href: "/eventi", label: "See events" }],
        },
        {
          id: "calendario",
          icon: "calendar",
          title: "The calendar",
          steps: [
            "The calendar shows training sessions, matches and events, month by month.",
            "Tap a day to see what is on.",
            'With "Add to your calendar" you bring everything into your phone calendar. Updates arrive on their own.',
            "With Google Calendar, updates can take up to a day.",
          ],
          links: [{ href: "/calendario", label: "Open the calendar" }],
        },
      ],
    },
    {
      title: "The rest of the app",
      chapters: [
        {
          id: "news",
          icon: "news",
          title: "News, polls and photos",
          steps: [
            'Under "News" you read the club\'s notices and articles.',
            "Some news items have a poll. To vote you must be signed in.",
            "You can change your vote until the poll closes.",
            'Under "Gallery" you find the club\'s photos and videos.',
          ],
          links: [{ href: "/news", label: "Read the news" }],
        },
        {
          id: "profilo",
          icon: "profile",
          title: "Profile and achievements",
          steps: [
            "In your profile you can change your name and your photo.",
            "If you play, you find your training attendance and your achievements.",
            'Your children\'s achievements are in the "Family" tab.',
            "Light or dark theme and language are changed from the menu, at the top.",
          ],
          links: [{ href: "/profilo", label: "Open your profile" }],
        },
        {
          id: "chi-vede-cosa",
          icon: "privacy",
          title: "Who sees what",
          steps: [
            "People who are not club members do not see minors: not in teams, not in matches, not among the scorers.",
            "Only people confirmed by the staff see who plays in the teams and who signed up for training.",
            "The date of birth is never shown in public.",
            'In your profile, "Privacy" tab, you can download your data and your children\'s data.',
            "Lost your phone? From there you sign out of the app everywhere, in one go.",
            "From there you can also ask us to delete your account.",
          ],
          links: [
            { href: "/profilo?tab=privacy", label: "Open the Privacy tab" },
            { href: "/privacy", label: "Privacy policy" },
          ],
        },
        {
          id: "aiuto",
          icon: "help",
          title: "If something goes wrong",
          steps: [
            "The sign-in link does not arrive: look in your junk mail (spam). If it is not there, ask for it again.",
            'You cannot find your children or your sign-ups: you may have used a different email. Tap "Sign out" in the menu and sign in with your usual one.',
            "Notifications do not arrive: check they are on in your profile. On iPhone the app must be installed.",
            "The app says notifications are blocked: unblock them in your phone settings, under Notifications.",
            "Want to suggest an improvement? Sign in and send a suggestion from the Contact page. The staff does not see who wrote it.",
            "For anything else, write to the staff.",
          ],
          links: [
            { href: "/contatti", label: "Write to the staff" },
            { href: "/contatti#suggerimenti", label: "Send a suggestion" },
            { href: "/faq", label: "Frequently asked questions" },
          ],
        },
      ],
    },
  ],
};

export function getGuide(locale: string): Guide {
  return locale === "en" ? GUIDE_EN : GUIDE_IT;
}
