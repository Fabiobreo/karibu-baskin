# UX-17 · Linguaggio facile: ruoli, questionario, errori, traguardi

**Ondata:** 2 · **Stima:** M (soprattutto contenuti) · **Dipende da:** nessuno · **Stato:** da fare

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
