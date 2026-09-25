# UX-17 · Linguaggio facile: ruoli, questionario, errori, traguardi

**Ondata:** 2 · **Stima:** M (soprattutto contenuti) · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): ruoli e regole in frasi brevi con "Regole complete" per i tecnici, questionario in terza persona per i figli e con pittogrammi, niente barre oblique di genere, traguardi con frase sempre visibile e livelli spiegati, nomi militari sostituiti, sigle scritte per esteso

## Problema

Una parte degli utenti ha disabilità intellettive e legge i testi da sola o con un tutor. Diversi testi sono difficili o poco rispettosi.

| Dove                                                    | Problema                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/content/baskinInfo.ts:25` (e gli altri ruoli)  | Descrizioni in linguaggio medico centrato sul deficit ("Atleta con disabilità grave che non può spostarsi autonomamente nemmeno in carrozzina…"), frasi lunghe, lette dagli atleti stessi                                                             |
| `/il-baskin`, card delle regole                         | Frasi dense ("La somma dei ruoli in campo non deve superare 23. Obbligatori: 1 pivot…"); righe di circa 110 caratteri                                                                                                                                 |
| `SportRoleQuestionnaire`                                | Introduzione (`questionnaire.intro`) in `caption` grigio; domande in seconda persona anche quando compila un genitore ("Come ti muovi…"); opzioni sui movimenti senza pittogrammi                                                                     |
| `claim.title`, `registeredSuccess` e simili             | Barre oblique di genere ("iscritto/a", "stato/a")                                                                                                                                                                                                     |
| Traguardi, `src/components/rating/BadgeShowcase.tsx:87` | Sottotitolo incoerente (a volte la data di sblocco, a volte il criterio: "Doppia cifra, 10 o più punti" sembra un obiettivo, non un traguardo raggiunto); descrizione solo nel `title` (invisibile su touch); livelli bronzo/argento/oro non spiegati |
| `src/lib/rating/badges.ts:388`, `it.json:633`           | Traguardo "Mercenario" per chi gioca in prestito; altri nomi militari (Cecchino, Artigliere)                                                                                                                                                          |
| Varie                                                   | Gergo: "3V 1P 3S" nell'hero dei risultati, "(+13)", filtri "R1-R5", "Falli illegali", "Statistiche avanzate"; date abbreviate ("2 ott · 14:41")                                                                                                       |

## Cosa fare

1. Riscrivere i testi seguendo le linee guida Easy-to-Read di Inclusion Europe: frasi brevi, una informazione per frase, parole comuni, niente sigle.
2. Ruoli: descrivere **cosa fa** il giocatore in campo, non cosa non può fare. Il dettaglio tecnico resta disponibile ("Regole complete") per coach e arbitri.
3. Questionario: introduzione in testo normale; forma in terza persona quando si compila per un figlio ("Come si muove Giulia?"); pittogrammi sulle opzioni di movimento (carrozzina, cammino, corsa).
4. Forme neutre al posto delle barre oblique ("Iscrizione fatta!", "Sei già venuto agli allenamenti?" → "Hai già partecipato agli allenamenti?").
5. Traguardi: **le emoji restano**. Una frase fissa sempre visibile per traguardo raggiunto ("Hai segnato 10 punti in una partita"), un criterio per quelli da raggiungere, spiegazione dei livelli, "Mercenario" rinominato (per esempio "In prestito"); rivedere i nomi militari.
6. Gergo: sigle esplicite ("3 vittorie, 1 pareggio, 3 sconfitte"), "Ruolo 1" invece di "R1" dove c'è spazio, date con giorno della settimana e mese per esteso nei punti chiave.
7. Ogni testo in `it.json` ed `en.json`.

## Criteri di accettazione

- Testi riscritti revisionati da una persona del club e, se possibile, letti da 2-3 atleti con il loro tutor.
- Nessuna barra obliqua di genere nei dizionari.
- Nessun traguardo con descrizione visibile solo al passaggio del mouse.

## Esito

- **Ruoli** (`baskinInfo.ts`): nuovo campo `summary`, frasi brevi su cosa fa il giocatore in campo, mostrato in `/il-baskin` e in `/profilo/ruolo`. Il testo tecnico di prima resta intatto sotto "Regole complete" (`<details>`, chiuso). Anche i riquadri Canestro, Punteggio e "Chi lo può marcare" sono scritti per esteso.
- **Regole**: ogni card è un elenco, una informazione per frase.
- **Questionario**: introduzione in testo normale; domande e risposte in terza persona quando si iscrive un figlio (`subjectName`, "Come si muove Giulia quando fa sport?"); icone carrozzina, cammino e corsa.
- **Barre oblique**: tolte le 13 del dizionario italiano; un test (`src/i18n/easyLanguage.test.ts`) impedisce che tornino.
- **Traguardi**: chiave `achieved` per ogni traguardo ("Hai segnato…" sul proprio profilo, "Ha segnato…" su figli e profili pubblici), sempre visibile; i traguardi da raggiungere mostrano il criterio; legenda Bronzo/Argento/Oro (`BadgeTierLegend`). Niente più testo solo nel `title`. Nomi scelti dal committente: Mercenario → In prestito, Artigliere → 200 punti, Cecchino → Tre triple, Cecchino perfetto → Tutto a segno (gli id restano uguali, i traguardi già sbloccati non cambiano).
- **Gergo**: "3V 1P 3S" → "3 vittorie, 1 pareggio, 3 sconfitte" in Risultati e nel profilo delle avversarie; "R1" → "Ruolo 1" nei filtri di `/marcatori` e nel simulatore; "Falli illegali" → "Marcature vietate"; "Statistiche avanzate" → "Più colonne"; etichette delle righe partita nel profilo giocatore tradotte (erano scritte a mano in italiano, "Falli ill."); date delle prossime partite e delle disponibilità con giorno della settimana e mese per esteso. Il "(+13)" era già stato risolto in UX-06.

## Rimasto fuori

- **Revisione dei testi** da parte di una persona del club e lettura con 2-3 atleti e tutor: criterio di accettazione che non si può chiudere nel codice.
- **Varianti di ruolo** (`roles.variantS` "con spasticità", `variantP` "con limitazioni arti superiori"): linguaggio ancora clinico, mostrato all'atleta nel risultato del questionario. Da riscrivere insieme al club.
- ~~Questionario per un figlio non provato nel browser~~ Provato con i dati di UX-26 (25/09/2026), mobile: "Come si muove Tommaso quando fa sport?" con i tre pittogrammi, poi "Com'è la corsa di Tommaso?". Provate anche le date lunghe delle prossime partite a 360 px ("sabato 3 ottobre · 15:00" su una riga, in home e in `/partite`). Visto nella prova: in `/partite` il nome lungo dell'avversaria è troncato con i puntini senza modo di leggerlo per intero (in home va a capo).
- Sigle rimaste dove manca lo spazio: lettere V/P/S nei cerchietti di forma dei gironi (`GironeFullView`), "R1" nei chip delle convocazioni e dell'ottimizzatore (solo staff) e dei giocatori nel simulatore.
- "Cannoniere" e "Bomber" restano: sono parole comuni nello sport, non nomi di armi.
