# UX-06 · Piccoli difetti di usabilità + sito pubblico fuori dall'admin

**Ondata:** 0 · **Stima:** M · **Dipende da:** UX-04 (le nuove CTA usano `<Button href>`) · **Stato:** fatto (commit su `develop`): tutti gli 11 punti; nastro sponsor e footer nascosti solo in `/admin`

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

## Esito

1. `ClaimAnonymousCard` parte senza selezioni; "Collega selezionati" era gia' disabilitato a selezione vuota.
2. `ClassificaInternaTable`: in grande il totale (il numero su cui si ordina), sotto "N in prestito" in `text.secondary`; legenda sopra la tabella quando ci sono prestiti. Il `title` in italiano scritto a mano e' sparito.
3. `BottomNav` con `showLabels`.
4. `MatchDetailTabs`: chi non vede i convocati parte da "Statistiche" se ci sono.
5. Un solo invito ad accedere nella card "Iscritti" ("Sei del Karibu? Accedi per vedere iscritti e squadre"); la card "Squadre" non compare per chi non e' tesserato, anche nella vista dell'allenamento concluso (`AllenamentoEndedView`).
6. "Abbonati al calendario" nei dizionari; anche il titolo del dialog, che diceva "Iscriviti".
7. `/contatti`: modulo sempre visibile, tolto il bottone apri/chiudi (e le chiavi `openForm`/`closeForm`).
8. `/squadre`: bottone "Vieni a provare" verso `/contatti`.
9. `EventRsvp`: "Accedi per rispondere".
10. `formatDecimal` in `@/lib/numberFormat` (con test) al posto di `toFixed` in profilo giocatore, confronto, pagina squadra, `LeaderCard`, tabella marcatori e testo di condivisione. In `LeaderCard` anche "/partita" passa dai dizionari (`teams.leaderAvg`).
11. `HideInAdmin` (con test su `isAdminPath`) attorno a `SponsorBanner` e `Footer` nel root layout.

Verifica con Playwright, prima e dopo, desktop e mobile: nastro sponsor e footer presenti su 10 pagine pubbliche e assenti in `/admin`; un solo link di accesso nella pagina allenamento; tab "Statistiche" aperta per l'anonimo; 4 etichette sulla barra in basso. `npm run a11y`: nessuna nuova violazione, baseline 41 → 40 voci e meno nodi di contrasto.

**Rimasto fuori**

- Punto 1 verificato solo nel codice: serve un utente con iscrizioni anonime da collegare, che nel DB di sviluppo non c'e'.
- `toFixed` restano negli strumenti TrueSkill per lo staff (`LineupOptimizerSection`, `RatingBadge`), solo in italiano, e nelle coordinate SVG, dove sono corretti.
- "pt" resta scritto a mano accanto a qualche numero (pagina squadra, `LeaderCard`): e' uguale in inglese, ma andrebbe nei dizionari.
- Il testo di condivisione del profilo (`PlayerShareButtons`) e' tutto in italiano scritto a mano: da portare nei dizionari.
- Nelle card mobile dei marcatori c'e' il totale ma non il dettaglio del prestito: la legenda lo dice senza rimandare a un dettaglio.
- Il bottone di `/squadre` porta ai contatti; quando c'e' il percorso di UX-15 va aggiornato.
