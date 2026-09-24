# Audit UX/UI · risultati consolidati

Versione finale, dopo la contro-revisione. Dove un revisore ha corretto l'audit iniziale è indicato.

## Metodo

- 70 schermate con Playwright sul dev server: desktop 1440 px e mobile 390 px, tema chiaro e scuro, da anonimo, ospite (GUEST), atleta e admin (login di test).
- Metriche dal DOM per pagina: dimensioni e pesi dei font, raggi, target sotto 32 px, testo sotto 12 px, scroll orizzontale.
- axe-core (WCAG 2.0/2.1/2.2 AA + best practice) su 21 pagine per 2 dimensioni di schermo.
- Percorso da tastiera su ogni pagina desktop; target touch a 390 px contro 24 px (minimo WCAG 2.2) e 44 px (raccomandato).
- Compiti principali ricostruiti per tipo di utente, dalle schermate e dal codice.
- Contro-revisione di tre revisori: accessibilità cognitiva, avvocato del diavolo, ingegnere frontend (fattibilità e stime sul codice).

Limiti: niente test con utenti reali; l'iscrizione a un allenamento è valutata dal codice (nessun allenamento con iscrizioni aperte nel database di prova); i dati di prova sono finti.

## Punti forti

- Contrasto dei componenti del tema progettato con i rapporti annotati; dark mode vero; anello di focus corretto; `prefers-reduced-motion` rispettato.
- Nessuno scroll orizzontale su mobile. "Vai al contenuto" è il primo elemento raggiunto con Tab.
- Compiti ricorrenti dell'atleta brevi: disponibilità a una partita in 2 tocchi con salvataggio immediato; banner "La tua squadra" dopo la generazione.
- Profilo giocatore (traguardi con avanzamento, andamento punti), lista risultati, classifica.
- Casella "Nuovi account da approvare" per lo staff: uno dei flussi meglio disegnati.

## Barriere (priorità massima)

| Problema                                 | Evidenza                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zoom con due dita bloccato               | `maximumScale: 1` in `src/app/layout.tsx:105`, presente dal primo commit senza motivazione. Viola WCAG 1.4.4.                                                                                                                                                                |
| Grigio `text.disabled` usato come testo  | 293 usi (96 file); `#9E9E9E` su bianco fa 2,67:1. axe: 138 elementi in `/admin/allenamenti`, 174 in `/marcatori` su mobile.                                                                                                                                                  |
| Campi e controlli senza nome accessibile | 6 campi per riga nelle statistiche partita (axe: critical); 50 select in `/admin/utenti`; barre di avanzamento dei traguardi; avatar senza `alt` nella barra in basso.                                                                                                       |
| Struttura dei titoli                     | Il profilo giocatore non ha `<h1>` (il nome è un `h2`); `h6` usati come titoli di sezione quasi ovunque; `<ul>` con figli `<div>` in `/notifiche`.                                                                                                                           |
| `<Link><Button>`                         | Produce `<a><button>`: HTML non valido e due fermate di Tab per ogni bottone (5 solo in home). Il pattern è prescritto da CLAUDE.md.                                                                                                                                         |
| Messaggi che spariscono                  | Anche gli errori sono avvisi che si chiudono dopo 3,5 s (`ToastContext.tsx:54`); annullamento della disiscrizione in 3 s; se il salvataggio della disponibilità fallisce, l'interruttore torna indietro in silenzio. _(Trovato dalla revisione di accessibilità cognitiva.)_ |
| Testo piccolo                            | 892 `fontSize` letterali; circa 180 tra 0,6 e 0,68 rem (9,6-10,9 px). `/marcatori`: 124 nodi sotto 12 px su desktop, 250 su mobile.                                                                                                                                          |

## Usabilità dei compiti

| Utente  | Compito                  | Esito                                                           | Attriti principali                                                                                                                                                                                                          |
| ------- | ------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonimo | Venire a provare         | medio                                                           | La CTA principale porta alla lista allenamenti; il modulo contatti è chiuso dietro "Scrivi un messaggio"; orari e sede sparsi; la pagina allenamento non dice **dove** si svolge (`TrainingSession` non ha un campo luogo). |
| Anonimo | Vedere una partita       | medio                                                           | Il dettaglio si apre sulla tab bloccata "Convocati".                                                                                                                                                                        |
| Atleta  | Iscriversi               | facile se il ruolo è confermato, **difficile al primo accesso** | Scelta del soggetto, fino a 4 domande, risultato, note, invio; il questionario resta in seconda persona anche quando compila un genitore. _(Correzione della revisione cognitiva.)_                                         |
| Atleta  | Dichiarare disponibilità | facile                                                          | Errore di salvataggio non persistente.                                                                                                                                                                                      |
| Coach   | Creare un allenamento    | medio-difficile                                                 | Non si fa dall'admin (il box informativo rimanda al Calendario); nel calendario non c'è un segnale visivo e l'unico bottone, "Aggiungi al calendario", significa abbonarsi al file .ics.                                    |
| Coach   | Chiudere un allenamento  | difficile                                                       | 27 card aperte (pagina da 16.000 px); presenze con un pallino a 3 stati da ciclare; un "Salva" per ogni partitella; su mobile 196 target su 311 sotto 44 px.                                                                |
| Coach   | Statistiche              | medio, difficile da telefono                                    | Campi numerici senza etichetta e senza +/-.                                                                                                                                                                                 |

## Linguaggio e contenuti (revisione di accessibilità cognitiva)

- `src/lib/content/baskinInfo.ts:25`: descrizioni dei ruoli in linguaggio medico centrato sul deficit, lette dagli atleti stessi.
- Questionario del ruolo: introduzione in `caption` grigio; nessun pittogramma sulle opzioni di movimento.
- Barre oblique di genere ("iscritto/a", "stato/a") in `claim.title`, `registeredSuccess`.
- Gergo: "3V 1P 3S", "(+13)", "R1-R5", "Falli illegali", "Statistiche avanzate", date abbreviate ("2 ott · 14:41").
- Decimali con il punto ("17.7").
- Traguardi: sottotitolo incoerente (a volte la data, a volte il criterio, `BadgeShowcase.tsx:87`), descrizione solo nel `title` (invisibile su touch), livelli non spiegati, nomi metaforici e un traguardo chiamato "Mercenario" (`badges.ts:388`).
- "Ti riconosco!" parte con tutte le caselle spuntate mentre chiede di selezionare (`ClaimAnonymousCard.tsx:37`).

## Coerenza visiva

- Nessuna scala tipografica applicata: fino a 23 dimensioni di testo per pagina, pesi da 400 a 900 ovunque, eyebrow maiuscoletto riscritto in 36 file.
- Quattro pattern di intestazione pagina, breadcrumb a quattro bordi sinistri diversi, quattro larghezze di contenitore.
- Il gradiente degli hero (marrone) è copiato a mano in almeno 8 punti fuori da `PageHero`.
- Bottone primario color mattone `#BF360C`: più rosso dell'arancio della maglia. Tre forme di bottone (raggio 8, pillola, pillola con alone).
- Arancio usato anche su elementi non cliccabili (chip "Area personale", "Sondaggio", eyebrow): contraddice la regola "colore = significato".
- Colori dei ruoli (blu, verde, arancio, viola, rosso) che si confondono con vittoria/sconfitta e con il brand; il colore del ruolo è decorativo.
- Tutte le card si sollevano al passaggio del mouse, anche quelle non cliccabili (`theme.ts:490`).
- Tab metà in maiuscolo e metà no.

## Navigazione

- Header: 17 fermate di Tab prima del contenuto, 5 solo per tema e lingua.
- Barra in basso su mobile con etichetta solo sulla voce attiva.
- L'admin eredita il sito pubblico: doppia barra, nastro sponsor, footer.
- Il riordino del menu è **parcheggiato**: i revisori non concordano (menu piatto senza sottomenu contro rischio di nascondere News ed Eventi).

## Cosa è cambiato dopo la contro-revisione

| Tesi iniziale                           | Correzione                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Design system come problema critico     | È un debito di manutenzione (gravità media). Critiche sono le barriere.                      |
| Lingua nel menu utente                  | Sbagliato: chi non ha fatto l'accesso non ha un menu utente.                                 |
| Home diversa per ruolo                  | Stessa home per tutti con una card "prossima azione".                                        |
| Via i colori dei ruoli                  | Numero in evidenza e colori armonizzati.                                                     |
| Emoji dei traguardi "cheap"             | Restano; si correggono i testi.                                                              |
| Nastro sponsor ridotto                  | Resta com'è (promessa agli sponsor), tranne in admin.                                        |
| Rifare 8 aree su nuovi componenti       | Parcheggiato: il beneficio arriva dal tema.                                                  |
| Shell admin separata                    | Basta togliere il sito pubblico dall'admin; l'impegno va sul flusso di chiusura allenamento. |
| `LinkButton` come componente            | Meglio `LinkComponent` nel tema.                                                             |
| `text.disabled` da sostituire a tappeto | 157 usi indicano uno stato e hanno bisogno di un secondo segnale.                            |
| Togliere `maximumScale` e basta         | Insieme vanno portati a 16 px i campi più piccoli (zoom automatico su iOS).                  |
| Iscrizione "facile"                     | Difficile al primo accesso.                                                                  |
