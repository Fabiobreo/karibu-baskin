# UX-33 · Home: testa del tesserato senza foto, niente duplicati

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32 · **Stato:** fatto (su `develop`)

## Problema

**Tesserato (ATHLETE, PARENT) e ospite (GUEST).** `HeroSection` "compatta" occupa comunque il 62% dell'altezza dello schermo (`src/components/common/HeroSection.tsx:43`, `minHeight: { xs: "64svh", md: "62vh" }`, contro `80vh` per l'anonimo). Nella prima schermata dell'atleta la stessa iscrizione compare **tre volte**:

1. bottone "Prossimi allenamenti" nell'hero;
2. `NextActionCard` "Iscriviti a …" sovrapposta all'hero (UX-16);
3. subito sotto, la card dello stesso allenamento con "Iscriviti →".

Chi apre il sito ogni settimana scorre ogni volta oltre un manifesto per arrivare a un'azione che poi trova ripetuta.

**Anonimo.**

- La scritta "Karibu Baskin" a 900 copre la foto della squadra, la risorsa migliore del sito, e ripete il nome già nell'header.
- "Baskin" in arancione cade sopra le magliette arancioni: nella versione ospite si legge male.
- Il sottotitolo va a capo lasciando "distinzioni." da solo.

## Cosa fare

La decisione "Home con la stessa struttura per tutti" (README) resta: cambia solo la testa, come già oggi.

1. **Tesserati e ospiti:** niente foto.
   - Header compatto (UX-32) con il saluto ("Ciao Marco!") e, subito sotto, `NextActionCard` o `GuestOnboardingCard`.
   - Tolti i bottoni dell'hero: la prossima azione è la CTA.
2. **Niente duplicati:** se la prossima azione riguarda l'allenamento X, la sezione "Prossimi allenamenti" non lo ripete (oppure lo mostra come riga semplice senza CTA, con "in evidenza sopra"). Stesso criterio per la disponibilità a una partita e "Prossime partite".
3. **Anonimo:**
   - foto più visibile (velatura solo nella parte bassa, dove sta il testo);
   - titolo di contenuto invece del nome del club, per esempio "Basket inclusivo a Montecchio Maggiore" (it e en), h1 a 48-56 px su desktop, 800;
   - una sola CTA piena ("Vieni a provare") più un link testuale ("Cos'è il Baskin?");
   - sottotitolo con `text-wrap: balance`.
4. Lo **staff** resta com'è (hero piena e banner delle disponibilità), come deciso in UX-16, salvo diversa indicazione.

## Criteri di accettazione

- Home atleta a 1440 × 900 e a 390 × 844: la prossima azione è visibile senza scorrere e compare una sola volta nella prima schermata.
- Home anonima: nome del club solo nell'header, testo dell'hero leggibile sopra la foto (contrasto misurato su un campione di punti dietro al testo, almeno 4,5:1).
- Testi nuovi in `it.json` ed `en.json`; `npm run a11y` verde.

## Com'è stato fatto

- **Tesserati e ospiti:** la foto resta (scelta del committente, 01/10/2026: la versione senza foto, con la fascia di `PageHero`, è stata scartata), e l'hero resta alta (62vh su desktop, 60svh su telefono; provata e scartata anche l'hero bassa a 40vh). Ha solo il saluto come h1 ("Ciao Luca!", per gli ospiti "Ciao Fabio, ti diamo il benvenuto!"), in basso a sinistra, senza sottotitolo né bottoni. La card sale sopra il bordo basso dell'hero (`heroOverlapSx`), così si vede senza scorrere. `HeroSection` ha una sola variante, `greeting`, al posto di `member` e `guest`; la sovrapposizione è del contenitore, non più una prop delle card. Tolti dai dizionari i testi dell'hero degli ospiti (sottotitolo e due CTA).
- **Niente duplicati:** `HomeSessions` riceve `headCard` e salta l'allenamento di cui parla la card (`actionSessionId`, `onboardingSessionId`), mostrando il successivo. Se non ce n'è un altro, la sezione sparisce (resta solo lo spazio), invece del falso "nessun allenamento in programma". `loadNextAction` e `loadGuestOnboarding` sono in cache per richiesta.
- **Anonimo:** foto scoperta in alto, testo in basso a sinistra sopra una velatura che comincia 96 px prima del titolo (72% di nero dietro al testo), inviti sotto il testo. h1 "Basket inclusivo a Montecchio Maggiore" a 48 px su desktop (32 su telefono), 800. Il nome del club resta nell'h1 solo per gli screen reader. Su desktop il blocco copre in parte la fila davanti della foto: provata e scartata dal committente (01/10/2026) la variante con gli inviti a destra del testo, che la scopriva ma staccava i bottoni dal titolo. "Vieni a provare" piena e "Cos'è il Baskin?" come link sottolineato; sottotitolo con `text-wrap: balance`.
- **Staff:** chi non gioca tiene la hero con la foto (nuova impaginazione, CTA "Prossimi allenamenti") e il banner. Chi gioca aveva già la testa degli atleti (UX-24) e la segue anche qui.

### Misure (01/10/2026)

- Home atleta, 1440 × 900: hero di 558 px, la card va da 539 a 664 px e l'allenamento della card compare una sola volta nella pagina. A 390 × 844: il bottone della card finisce una quarantina di px sopra la barra di navigazione in basso.
- Contrasto dell'hero: misurato sulla foto a 1440 × 720. Dietro al testo ci sono punti quasi bianchi (striscione a terra e righe del campo, luminanza fino a 0,85-1), quindi la velatura è tarata sul bianco: fondo `#474747`, 9,3:1 con il titolo e 7:1 con il sottotitolo. Il minimo per reggere 4,5:1 sarebbe il 61% di nero.
- Provato anche in tema chiaro e come staff che non gioca.
- `npm run a11y`: nessuna nuova violazione grave.

## Rimasto fuori

- **Disponibilità e "Prossime partite":** la card dice solo "Hai N partite a cui rispondere" e porta a `/profilo/disponibilita`, e le card delle partite non hanno una CTA di disponibilità: l'azione non è ripetuta. Togliere le partite dalla sezione le farebbe sparire dalla home senza che la card le nomini. Da riprendere se la card comincerà a nominare la partita.
- **Sottotitolo dell'hero:** "Sport inclusivo per tutti…" ripete "inclusivo" del nuovo titolo. Testo da rivedere con il club.
- **Peso della card della prossima azione:** in home pesa meno della card dell'allenamento sotto, che ha la testata nera. Provato e scartato il contorno spesso in inchiostro; da riprendere in UX-43, che riguarda le card in evidenza.

## Revisione del 01/10/2026: torna il nome del club

Rivista con il committente la versione appena fatta, confrontando prima, adesso e una terza via: [`img/ux33-hero-confronto-anonimo.png`](../img/ux33-hero-confronto-anonimo.png), [`img/ux33-hero-confronto-tesserato.png`](../img/ux33-hero-confronto-tesserato.png).

- **Cosa non andava:** senza la scritta "Karibu Baskin" l'hero aveva perso carattere, e chi entra nel sito si aspetta di leggere il nome. Per i tesserati l'hero era grande per dire solo "Ciao Fabio!".
- **Scelta la terza via, per tutti:** l'h1 è "Karibu Baskin", con "Baskin" arancione (logotipo, eccezione di marchio di UX-29), a 64 px su desktop e 40 su telefono, in basso a sinistra sopra la velatura. Non è più al centro a 96 px sopra le facce, e "Baskin" non cade più sulle maglie arancioni: i due difetti che il riaudit contestava.
- **Anonimo:** sotto il nome la riga "Basket inclusivo a Montecchio Maggiore", poi la frase (tenuta per scelta del committente), bottone e link.
- **Tesserati e ospiti:** saluto piccolo sopra il nome, niente bottoni; la card resta sovrapposta al bordo basso.
- Il criterio "nome del club solo nell'header" di questo ticket è quindi superato da una decisione del committente.
