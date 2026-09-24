# UX-06 · Piccoli difetti di usabilità + sito pubblico fuori dall'admin

**Ondata:** 0 · **Stima:** M · **Dipende da:** UX-04 (le nuove CTA usano `<Button href>`) · **Stato:** da fare

Correzioni indipendenti, ognuna piccola. Si possono dividere in più PR.

## Elenco

1. **"Ti riconosco!" con caselle già spuntate.** `src/components/training/ClaimAnonymousCard.tsx:37` inizializza la selezione con tutte le iscrizioni, mentre il testo chiede "Seleziona quelli in cui eri davvero tu". Partire da nessuna selezione; "Collega selezionati" disabilitato finché non se ne sceglie una.

2. **Marcatori: numero mostrato diverso da quello ordinato.** `src/components/teams/ClassificaInternaTable.tsx:197` ordina per punti propri + punti in prestito, ma la cella mostra in grande solo i punti propri: "74 (+13)" appare sopra "76". Mostrare in grande il totale e il prestito come dettaglio visibile ("87 · 13 in prestito"), con una legenda sopra la tabella invece del solo `title` (invisibile su touch).

3. **Barra di navigazione in basso muta.** `src/components/layout/BottomNav.tsx`: aggiungere `showLabels`, così ogni voce ha l'etichetta e non solo quella attiva.

4. **Dettaglio partita che si apre su un lucchetto.** `src/components/matches/MatchDetailTabs.tsx:47` parte sempre dalla tab 0 ("Convocati"), bloccata per chi non è tesserato. Per chi non è tesserato aprire la prima tab con contenuto visibile.

5. **Due blocchi "Accedi" nella pagina allenamento.** `src/components/training/SessionPageClient.tsx`: "Iscritti" e "Squadre" hanno ciascuno il proprio invito ad accedere, in card di stile diverso. Unirli in un solo blocco ("Sei del Karibu? Accedi per vedere iscritti e squadre").

6. **"Aggiungi al calendario".** `src/components/calendar/SubscribeCalendarButton.tsx:18` ha il testo scritto a mano in italiano (fuori dai dizionari) e l'etichetta fa pensare ad "aggiungi un evento", soprattutto allo staff. Diventa "Abbonati al calendario", in `it.json` ed `en.json`.

7. **Modulo contatti chiuso.** `src/app/contatti/page.tsx:102` (`formOpen` parte da `false`): il modulo è nascosto dietro "Scrivi un messaggio" proprio nel punto di conversione. Aprirlo di default.

8. **CTA senza bottone in `/squadre`.** Il blocco "Vuoi giocare con noi?" (`src/app/squadre/(lista)/page.tsx:238`, chiave `joinUs`) non ha un'azione. Aggiungere un bottone verso i contatti (poi verso il percorso di UX-15).

9. **"Ci sarai?" che porta al login.** `src/components/common/EventRsvp.tsx:247`: per chi non ha fatto l'accesso il bottone ha lo stesso testo del titolo ma apre il login. Diventa "Accedi per rispondere".

10. **Decimali con il punto.** `src/app/giocatori/[slug]/page.tsx:109` usa `toFixed(1)` ("17.7"). Formattare con `Intl.NumberFormat(locale, { maximumFractionDigits: 1 })` ("17,7" in italiano). Cercare altri `toFixed` usati per la UI.

11. **Sito pubblico dentro l'admin.** Il root layout (`src/app/layout.tsx:147-161`) monta header, nastro sponsor, footer e barra in basso anche sotto `/admin`. Con un piccolo componente client (`usePathname`) nascondere **solo in admin** il nastro sponsor e il footer pubblico. Il nastro resta **invariato** in tutte le altre pagine: è la visibilità promessa agli sponsor. Header e barra in basso restano (servono menu utente e notifiche).

## Criteri di accettazione

- Ogni punto verificato a mano su desktop e mobile.
- Testi nuovi in entrambi i dizionari.
- Il nastro sponsor compare in tutte le pagine pubbliche come prima e in nessuna pagina `/admin`.
