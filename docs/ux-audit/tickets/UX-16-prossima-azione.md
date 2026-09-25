# UX-16 · Card "prossima azione" per i tesserati

**Ondata:** 2 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): card "La tua prossima cosa da fare" per atleti e genitori in home e profilo, struttura della home uguale per tutti

## Problema

Un atleta o un genitore che entra nel sito vede la stessa home di chi non conosce il club: foto a tutta altezza, "Sport inclusivo per tutti", inviti a venire a provare (anche in tema scuro compare "Vieni a provare" a un tesserato). La sua prossima cosa da fare (iscriversi, confermare una disponibilità) arriva sotto la piega.

## Decisione

**Stessa struttura della home per tutti** (prevedibilità, e genitore e figlio usano spesso lo stesso telefono). Per i tesserati si **aggiunge** in cima una card con la prossima azione. Niente home diverse per ruolo.

Il modello esiste già per gli ospiti: `GuestOnboardingCard` + `loadGuestOnboarding` (`@/lib/guestOnboarding`), il pattern meglio riuscito del sito.

## Cosa fare

1. Card "La tua prossima cosa da fare" per ATHLETE e PARENT, sopra le sezioni della home, con **una** azione principale scelta in ordine di urgenza:
   - disponibilità da dare per una partita (oggi `PendingAvailabilityBanner`);
   - allenamento con iscrizioni aperte a cui non si è iscritti (per sé o per un figlio);
   - prossimo allenamento a cui si è iscritti, con data, ora e luogo (UX-15);
   - niente in sospeso: messaggio di conferma ("Sei a posto").
2. Per i genitori la card indica per chi è l'azione ("Iscrivi Giulia").
3. Per i tesserati, niente inviti a "venire a provare" in home.
4. `/profilo`: identità (avatar, nome, ruolo) in cima; la stessa card subito sotto; il box "Ti riconosco!" dopo.
5. Date formattate con `timeZone: "Europe/Rome"` (render anche sul server), come nella card degli ospiti.

## Criteri di accettazione

- Atleta con una disponibilità da dare: la card la mostra come prima cosa, raggiungibile in 1 tocco.
- La struttura delle sezioni sotto la card è identica per tutti.
- Nessun "Vieni a provare" visibile ai tesserati.

## Esito

- **Logica** in `@/lib/nextAction` (7 test). `pickNextAction` sceglie **una** azione, in ordine:
  1. disponibilita' da dare;
  2. allenamento con iscrizioni aperte nei prossimi 45 giorni a cui iscriversi, o iscrivere un figlio;
  3. prossimo allenamento a cui si e' iscritti;
  4. "Sei a posto".

  Per le iscrizioni usa `checkRegistrationAllowed` (ruoli ammessi, squadra), quindi non propone allenamenti riservati ad altri. `loadNextAction` fa le query in parallelo. Il genitore che non gioca non e' proposto come atleta.

- **Card `NextActionCard`** (con `NextActionSection` in `<Suspense>`), stesso impianto di `GuestOnboardingCard`:
  - un solo bottone; per i genitori "Iscrivi Giulia";
  - data, ora e luogo (UX-15), con date in `Intl` e `timeZone: "Europe/Rome"`;
  - testi nel namespace `nextAction`.
- **Home:** stesso ordine di sezioni per tutti (allenamenti, partite, news, "Lo sapevi", chi siamo). Prima gli anonimi avevano le news in cima.
  - Atleti e genitori: hero compatta col saluto (`HeroSection member`, "Ciao Marco!") e la card sovrapposta, come per gli ospiti.
  - Staff: hero piena e banner delle disponibilita' come prima.
  - "Unisciti a noi" solo a chi non ha un account.
  - Senza allenamenti in programma i tesserati non vedono "Vieni a provare", ma un testo loro (`homeNoneSoonMember`) e il calendario.
- **`/profilo`:** identita' (avatar, nome, ruolo) in cima alla scheda Profilo, subito sotto la stessa card (lo staff tiene la card del prossimo allenamento), poi "Ti riconosco!".
- **Verifica** con Playwright su telefono, con modifiche temporanee al DB poi ripristinate:
  - con una disponibilita' da dare la card la mostra per prima e "Rispondi ora" porta a `/profilo/disponibilita` in un tocco;
  - con un allenamento aperto fra 5 giorni: "Iscriviti a…" per l'atleta e "Iscrivi Giulia Moretti a…" per il genitore;
  - "Sei iscritto a…" e "Sei a posto" negli altri casi;
  - nessun "Vieni a provare" per i tesserati;
  - sezioni nello stesso ordine dell'anonimo.
- `npm test` verde (1773), `npm run a11y` senza nuove violazioni.

**Rimasto fuori**

- Coach e admin che sono anche atleti non vedono la card: il ticket la chiede per ATHLETE e PARENT. Si puo' estendere con una riga in `src/app/page.tsx`.
- Nel profilo la query del "prossimo allenamento" gira ancora anche per atleti e genitori, che ora vedono la card: si puo' saltare.
