# UX-43 · `/allenamenti`: card in evidenza in un tono solo e "Gestisci" sulla riga del titolo

**Ondata:** 4 · **Stima:** S · **Dipende da:** UX-32 · **Stato:** da fare

Nato il 30/09/2026 guardando `/allenamenti` da staff, in tema scuro, durante UX-30. I problemi non vengono da UX-30: la pagina era già così.

> **Prima di tutto confrontare con il resto del sito.** La stessa card in evidenza c'è anche in home (`HomeSessionsSection`), e bottoni staff su una riga propria o "card con testata scura" possono esserci in altre pagine (eventi, partite, squadre). La soluzione va decisa guardando tutte le occorrenze, e allineata ai modelli di intestazione di UX-32 e alle righe di UX-37, non inventata solo per questa pagina.

> **Aggiornamento 01/10/2026:** il punto 2 è già fatto. Nella rifinitura di UX-32 "Gestisci allenamenti" è uscito dal contenuto ed è nello slot `action` della fascia (`StaffManageButton`), come in news ed eventi. Resta il punto 1, la card in evidenza: in `/allenamenti`, in home e nella prossima partita della pagina squadra c'è ancora un blocco scuro subito sotto la fascia scura.

## Problema

1. **Card in evidenza pesante e in due toni.** È `SessionCard` con `hero` (`SessionHeroCard`), in `/allenamenti` e in home.
   - Testata come un piccolo hero: in tema scuro `common.black` (nero puro), in chiaro `heroGradient.dark` (`SessionCard.tsx`, commit "fixato tema" del 20/05). UX-08 ha unificato gli hero di pagina, non questa testata.
   - Corpo con `elevation={4}`: in tema scuro MUI schiarisce la superficie in base all'elevazione. Nella stessa schermata ci sono quattro grigi: sfondo `#121212`, righe della lista (contornate, senza elevazione), corpo della card (più chiaro), testata nera.
   - Da iscritto il bottone non c'è: il corpo resta quasi vuoto (data, orario, "1 iscritto · Iscritto" in `caption`) con lo spazio riservato alle azioni.
   - Titolo in `h4` peso 800: il più grande della pagina dopo l'h1, compete con "Allenamenti" e "Prossimi allenamenti".
2. **"Gestisci allenamenti" su una riga propria.** Nato con UX-14 al posto della vecchia barra strumenti staff (aprile), è rimasto nello stesso posto: un `Box` allineato a destra in cima ad `AllenamentiClient`, fra il titolo e la prima sezione. Il titolo sta nella pagina server (`src/app/allenamenti/page.tsx`), il bottone nel componente client: per questo non può stare sulla riga del titolo. Contornato arancione con icona, alto 40 px, è la cosa più evidente della pagina per lo staff, e fa il doppio con gli ingranaggi su ogni allenamento.
3. **Doppio titolo:** "Allenamenti" e subito sotto "Prossimi allenamenti".
4. **Righe della lista:** "Iscriviti" è un chip arancione contornato che sembra un bottone, ma la riga intera è il link. Accanto ci sono il pallone delle squadre senza testo e l'ingranaggio staff: tre segni diversi a destra, con un grande vuoto al centro (vedi UX-37, punto 4).

## Cosa fare

1. **Confronto:** elencare dove compaiono card con testata scura, bottoni staff su riga propria e stati-chip che sembrano bottoni (almeno home, `/eventi`, `/partite`, `/squadre`, profilo), e decidere un modello unico.
2. **Card in evidenza:**
   - un tono solo: superficie come le righe, contornata, senza elevazione;
   - niente testata nera: titolo in `text.primary`, "Tra 2 giorni" come chip accanto;
   - l'evidenza la fanno taglia e spazio: titolo `h5`, dati su una riga leggibile, "Iscriviti" da 40 px quando serve.
3. **"Gestisci"** sulla riga del titolo (modello "intestazione con azione" di UX-32), più leggero (contornato piccolo o testo).
4. Un solo titolo di sezione sotto l'h1, o nessuno se la pagina parte già dai prossimi.
5. Nelle righe, lo stato come testo ("Iscrizioni aperte" in arancione accessibile, "Iscritto" in verde), non come chip contornato.

## Criteri di accettazione

- In tema scuro la card in evidenza e le righe hanno lo stesso colore di superficie (misurato dal DOM).
- Da staff, "Gestisci" è sulla riga dell'h1 a 1.440 px e non occupa una riga propria a 360 px.
- Stesso trattamento in home e in `/allenamenti`, e nelle altre pagine emerse dal confronto.
- `npm run a11y` verde; schermate prima/dopo in chiaro e scuro, da anonimo, tesserato e staff.
