# UX-33 · Home: testa del tesserato senza foto, niente duplicati

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32 · **Stato:** da fare

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
