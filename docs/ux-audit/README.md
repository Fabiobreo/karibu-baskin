# Audit UX/UI · settembre 2026

Audit grafico, UX e di usabilità del sito, con contro-revisione di tre revisori (accessibilità cognitiva, avvocato del diavolo, ingegnere frontend). Da qui nascono i ticket in [`tickets/`](tickets/).

- [AUDIT.md](AUDIT.md): risultati consolidati, già corretti dopo la contro-revisione.
- [tickets/](tickets/): un file per ticket, autosufficiente (si può implementare senza aver letto l'audit).
- [img/](img/): tavole di confronto per le decisioni visive.

## Decisioni già prese

| Tema                    | Decisione                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colori della squadra    | Arancione e nero restano i colori principali.                                                                                                                                                                                       |
| Sponsor                 | Visibilità invariata ovunque (nastro in ogni pagina, foto dell'hero, pagina `/sponsor`, sezione in Contatti): è quella promessa agli sponsor. Unica eccezione: il nastro sparisce dall'admin.                                       |
| Colori dei ruoli Baskin | Puramente estetici: in palestra i ruoli non si distinguono per colore. Si possono ridisegnare liberamente.                                                                                                                          |
| Lingua                  | Il selettore resta visibile anche a chi non ha fatto l'accesso. Solo il tema chiaro/scuro va in un pannello "Aspetto".                                                                                                              |
| Home                    | Stessa struttura per tutti; per i tesserati si aggiunge in cima una card con la prossima azione. Niente home diverse per ruolo.                                                                                                     |
| Traguardi               | Le emoji restano (riconoscibili per chi legge poco); si correggono i testi.                                                                                                                                                         |
| Dati di prova           | Il sito di sviluppo ha dati finti: calendario vuoto, orari strani, "Lorem ipsum" e simili non sono difetti.                                                                                                                         |
| Bottone primario        | Variante **B**: testo bianco su `#C84B00` (stessa tinta della maglia, 4,71:1), hover `#A83F00` (6,22:1). Scartata la A (nero su `#E65100`). Confronto in [img/](img/), dettagli in [UX-07](tickets/UX-07-tema-bottone-primario.md). |

## Piano

Stime: **S** < mezza giornata · **M** 1-2 giorni · **L** 3-5 giorni. Ordine consigliato all'interno di ogni ondata: quello della tabella.

### Ondata 0 · Barriere e piccoli difetti

| Ticket                                         | Titolo                                                        | Stima | Dipende da |
| ---------------------------------------------- | ------------------------------------------------------------- | ----- | ---------- |
| [UX-01](tickets/UX-01-controllo-a11y.md)       | Controllo di accessibilità ripetibile (`npm run a11y`)        | S     |            |
| [UX-02](tickets/UX-02-zoom-e-campi.md)         | Zoom consentito e campi a 16 px                               | S     |            |
| [UX-03](tickets/UX-03-nomi-accessibili.md)     | Nomi accessibili e struttura dei titoli                       | S     |            |
| [UX-04](tickets/UX-04-link-come-bottoni.md)    | Link come bottoni (fine di `<Link><Button>`)                  | M     |            |
| [UX-05](tickets/UX-05-messaggi-che-restano.md) | Messaggi che restano                                          | M     |            |
| [UX-06](tickets/UX-06-piccoli-difetti.md)      | Piccoli difetti di usabilità + sito pubblico fuori dall'admin | M     | UX-04      |

### Ondata 1 · Tema (si propaga a tutto il sito)

| Ticket                                          | Titolo                                                                         | Stima                   | Dipende da |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- | ---------- |
| [UX-07](tickets/UX-07-tema-bottone-primario.md) | Bottone primario, arancio solo sugli elementi toccabili, hover delle card, tab | M                       |            |
| [UX-08](tickets/UX-08-hero-centralizzati.md)    | Hero: gradiente unico, meno marrone, niente cerchi                             | M                       | UX-07      |
| [UX-09](tickets/UX-09-text-disabled.md)         | Niente grigio `text.disabled` come testo                                       | M                       |            |
| [UX-10](tickets/UX-10-scala-tipografica.md)     | Scala tipografica, minimo 12 px, regola ESLint                                 | M (+ verifica per area) | UX-09      |
| [UX-11](tickets/UX-11-badge-ruolo.md)           | Badge ruolo: numero in evidenza, colori armonizzati                            | M                       | UX-07      |
| [UX-12](tickets/UX-12-pannello-aspetto.md)      | Pannello "Aspetto" nell'header                                                 | S                       |            |

### Ondata 2 · Compiti difficili e contenuti

| Ticket                                                 | Titolo                                                                                 | Stima | Dipende da |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----- | ---------- |
| [UX-13](tickets/UX-13-chiusura-allenamento.md)         | Chiusura allenamento: presenze esplicite, un solo salvataggio, statistiche da telefono | L     | UX-03      |
| [UX-14](tickets/UX-14-ciclo-vita-allenamento-admin.md) | Ciclo di vita dell'allenamento tutto in admin                                          | L     | UX-13      |
| [UX-15](tickets/UX-15-vieni-a-provare.md)              | Percorso "Vieni a provare" + luogo dell'allenamento                                    | M     | UX-06      |
| [UX-16](tickets/UX-16-prossima-azione.md)              | Card "prossima azione" per i tesserati                                                 | M     |            |
| [UX-17](tickets/UX-17-linguaggio-facile.md)            | Linguaggio facile: ruoli, questionario, errori, traguardi                              | M     |            |
| [UX-18](tickets/UX-18-risultati-mobile.md)             | Righe risultato leggibili su mobile                                                    | S     |            |
| [UX-19](tickets/UX-19-casi-vuoti.md)                   | Copertine di fallback e news in evidenza senza "documento finto"                       | S     | UX-08      |

### Parcheggiati (da rivalutare dopo le ondate 0-2)

- Riordino del menu principale: servono prove con utenti reali (tree test), le opinioni dei revisori divergono.
- Migrazione sistematica di tutte le pagine su nuovi componenti (`PageHeader`, `SectionHeader`…): il grosso del beneficio arriva dal tema.
- Shell admin completamente separata: per ora basta togliere il sito pubblico dall'admin (UX-06).
- Fondo neutro al posto del crema `#F7F4F1`.
- Profilo giocatore: dati ripetuti fra hero e griglia statistiche.
- Immagini OG (Satori) allineate ai nuovi colori.

## Come si lavora un ticket

1. Un ticket, un branch, una PR. La migrazione tipografica tocca circa 200 file: meglio PR piccole per area.
2. Testi nuovi o modificati della UI pubblica in **entrambi** i dizionari (`it.json` + `en.json`). L'admin resta in italiano.
3. Niente colori scritti a mano, niente `fontSize` letterali nuovi (vedi CLAUDE.md).
4. Prima di chiudere: `npx tsc --noEmit`, `npm test`, `npm run a11y` (da UX-01 in poi) e schermate prima/dopo nella PR.
5. Aggiornare lo **Stato** in testa al ticket (`da fare` → `in corso` → `fatto`, con il link alla PR).
