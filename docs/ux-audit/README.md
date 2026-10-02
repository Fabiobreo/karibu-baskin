# Audit UX/UI · settembre 2026

Audit grafico, UX e di usabilità del sito, con contro-revisione di tre revisori (accessibilità cognitiva, avvocato del diavolo, ingegnere frontend). Da qui nascono i ticket in [`tickets/`](tickets/).

- [AUDIT.md](AUDIT.md): risultati consolidati, già corretti dopo la contro-revisione.
- [tickets/](tickets/): un file per ticket, autosufficiente (si può implementare senza aver letto l'audit).
- [img/](img/): tavole di confronto per le decisioni visive.
- [RIAUDIT.md](RIAUDIT.md): voti e misure del 24/09, metodo e script ([misure/](misure/)) per rifare l'audit e capire se il sito è migliorato.
- [RIAUDIT-2026-09-29.md](RIAUDIT-2026-09-29.md): primo riaudit (voti, compiti, misure, verifica dei ticket, problemi aperti e proposta di ondata 4).
- [RIAUDIT-2026-10-02.md](RIAUDIT-2026-10-02.md): secondo riaudit, a ondata 4 chiusa (voti, compiti, misure di sistema, verifica dei ticket UX-29 … UX-44, problemi rimasti e ticket proposti).

## Decisioni già prese

| Tema                    | Decisione                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colori della squadra    | Arancione e nero restano i colori principali.                                                                                                                                                                                                        |
| Sponsor                 | Visibilità invariata ovunque (nastro in ogni pagina, foto dell'hero, pagina `/sponsor`, sezione in Contatti): è quella promessa agli sponsor. Unica eccezione: il nastro sparisce dall'admin.                                                        |
| Colori dei ruoli Baskin | Puramente estetici: in palestra i ruoli non si distinguono per colore. Si possono ridisegnare liberamente.                                                                                                                                           |
| Lingua                  | Il selettore resta visibile anche a chi non ha fatto l'accesso. Solo il tema chiaro/scuro va in un pannello "Aspetto".                                                                                                                               |
| Home                    | Stessa struttura per tutti; per i tesserati si aggiunge in cima una card con la prossima azione. Niente home diverse per ruolo.                                                                                                                      |
| Traguardi               | Le emoji restano (riconoscibili per chi legge poco); si correggono i testi.                                                                                                                                                                          |
| Dati di prova           | Il sito di sviluppo ha dati finti: calendario vuoto, orari strani, "Lorem ipsum" e simili non sono difetti.                                                                                                                                          |
| Bottone primario        | Variante **B**: testo bianco su `#C84B00` (stessa tinta della maglia, 4,71:1), hover `#A83F00` (6,22:1). Scartata la A (nero su `#E65100`). Confronto in [img/](img/), dettagli in [UX-07](tickets/UX-07-tema-bottone-primario.md).                  |
| Arancio negli hero      | Opzione **B** di [UX-28](tickets/UX-28-arancio-negli-hero.md) (27/09/2026): occhielli e icone degli hero neutri (`heroText.secondary`); le icone decorative nelle sezioni chiare restano arancioni come tocco di marchio. Confronto in [img/](img/). |

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

### Ondata 3 · Quello che è rimasto fuori dalle ondate 0-2

Raccoglie i "Rimasto fuori" dei ticket precedenti e un difetto trovato durante le verifiche (UX-20). Ordine consigliato: quello della tabella.

| Ticket                                               | Titolo                                                     | Stima              | Dipende da   |
| ---------------------------------------------------- | ---------------------------------------------------------- | ------------------ | ------------ |
| [UX-20](tickets/UX-20-pagine-larghe-mobile.md)       | Pagine più larghe dello schermo su mobile                  | S                  |              |
| [UX-21](tickets/UX-21-revisione-testi-club.md)       | Revisione dei testi facili con il club e varianti di ruolo | S + tempo del club | UX-17        |
| [UX-22](tickets/UX-22-contrasto-residuo.md)          | Contrasto residuo: baseline di `npm run a11y` a zero       | M                  |              |
| [UX-23](tickets/UX-23-pagina-allenamento-staff.md)   | Pagina del singolo allenamento allineata all'admin         | S                  | UX-14, UX-15 |
| [UX-24](tickets/UX-24-rifiniture.md)                 | Rifiniture rimaste dai ticket precedenti                   | S                  |              |
| [UX-25](tickets/UX-25-errori-vicino-all-elemento.md) | Errori accanto all'elemento, nei flussi principali         | M                  | UX-05        |
| [UX-26](tickets/UX-26-dati-di-prova-verifiche.md)    | Dati di prova per le verifiche rimaste in sospeso          | S                  |              |
| [UX-27](tickets/UX-27-tipografia-per-area.md)        | Migrazione tipografica per area e livelli dei titoli       | L (PR per area)    | UX-10        |
| [UX-28](tickets/UX-28-arancio-negli-hero.md)         | Arancio su elementi non toccabili: hero e icone decorative | S                  | UX-07, UX-08 |

UX-21 aspetta il club; per UX-28 è stata scelta l'opzione B. UX-26 conviene farlo presto, perché sblocca le prove nel browser rimaste in sospeso per UX-06, UX-14 e UX-17.

### Ondata 4 · Coerenza del sistema (dal riaudit del 29/09)

Nasce dal [riaudit del 29/09](RIAUDIT-2026-09-29.md): barriere e compiti sono migliorati molto, i voti di aspetto e coerenza no. Riprende due parcheggiati (componenti di layout e shell admin) e corregge le ricadute di UX-06, UX-15, UX-16 e UX-19. Ordine consigliato: prima il sistema (29-32), poi le pagine.

| Ticket                                              | Titolo                                                                             | Stima | Dipende da   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- | ----- | ------------ |
| [UX-29](tickets/UX-29-palette-semantica.md)         | Palette semantica chiusa e colori squadra per identità                             | M     |              |
| [UX-30](tickets/UX-30-raggi-e-bottoni.md)           | Raggi (moltiplicatore del tema) e bottoni 3 × 2 senza alone                        | M     |              |
| [UX-31](tickets/UX-31-pesi-tipografici.md)          | Pesi tipografici a tre, regola ESLint estesa                                       | M     | UX-27        |
| [UX-32](tickets/UX-32-tre-intestazioni.md)          | Tre modelli di intestazione di pagina                                              | L     | UX-30        |
| [UX-33](tickets/UX-33-home-tesserato.md)            | Home: testa del tesserato senza foto, niente duplicati                             | M     | UX-32        |
| [UX-34](tickets/UX-34-form-iscrizione.md)           | Form d'iscrizione: testo unico, scelta accesso o ospite, form in prima colonna     | S     |              |
| [UX-35](tickets/UX-35-tabellino-simmetrico.md)      | Tabellino della partita simmetrico                                                 | S     |              |
| [UX-36a](tickets/UX-36-navigazione-partite.md)      | Navigazione di sezione Partite, titoli senza doppioni                              | M     | UX-32        |
| [UX-36b](tickets/UX-36b-squadre-e-il-club.md)       | `/squadre` solo squadre, pagina "Il club"                                          | M     | UX-32        |
| [UX-37](tickets/UX-37-griglia-e-righe.md)           | Griglia unica e righe partita a colonne fisse                                      | M     | UX-32        |
| [UX-38](tickets/UX-38-copertine-e-stati-vuoti.md)   | Copertine tipografiche e stati vuoti compatti                                      | S     | UX-19        |
| [UX-39](tickets/UX-39-footer-e-nastro-sponsor.md)   | Footer a tre colonne e nastro sponsor normalizzato                                 | M     |              |
| [UX-40](tickets/UX-40-admin.md)                     | Admin: una barra sola e menu, azioni fuori dalle righe, linguaggio, target         | L     | UX-32        |
| [UX-41](tickets/UX-41-il-baskin-schema.md)          | `/il-baskin` con uno schema del campo                                              | M     | UX-21, UX-29 |
| [UX-42](tickets/UX-42-area-utente.md)               | Area utente: notifiche, profilo, selettore "per chi"                               | S     | UX-32        |
| [UX-43](tickets/UX-43-allenamenti-card-evidenza.md) | `/allenamenti`: card in evidenza in un tono solo, "Gestisci" sulla riga del titolo | S     | UX-32        |
| [UX-44](tickets/UX-44-header-fascia-intermedia.md)  | Header fra 900 e 1.200 px: la barra non ci sta                                     | S     |              |

### Ondata 5 · Dopo il secondo riaudit (02/10)

Nasce dal [riaudit del 02/10](RIAUDIT-2026-10-02.md): il sistema regge (intestazioni, raggi, pesi, palette), restano una ricaduta di UX-39 sui target da telefono, un difetto nel profilo dell'ospite, le liste admin non toccate da UX-40 e alcune rifiniture. Ticket piccoli, in ordine di utilità.

| Ticket                                           | Titolo                                                               | Stima | Dipende da | In attesa di              |
| ------------------------------------------------ | -------------------------------------------------------------------- | ----- | ---------- | ------------------------- |
| [UX-45](tickets/UX-45-target-su-telefono.md)     | Target da 44 px su telefono: footer, disponibilità, filtri marcatori | S     |            |                           |
| [UX-46](tickets/UX-46-profilo-ospite.md)         | Profilo dell'ospite senza card contraddittorie                       | S     |            |                           |
| [UX-47](tickets/UX-47-liste-admin-rimaste.md)    | Liste admin rimaste: un'azione con l'etichetta più "⋯"               | M     | UX-40      |                           |
| [UX-48](tickets/UX-48-marcatori-su-telefono.md)  | `/marcatori` su telefono: prima i nomi, poi i filtri                 | S     | UX-45      |                           |
| [UX-49](tickets/UX-49-tinta-squadra-e-azioni.md) | Tinta squadra dove convive con azioni ed esiti                       | S     |            | decisione del committente |
| [UX-50](tickets/UX-50-partita-futura-anonimo.md) | Partita futura per chi non è tesserato                               | S     |            |                           |
| [UX-51](tickets/UX-51-rifiniture.md)             | Rifiniture dal secondo riaudit                                       | S     |            |                           |

#### Ordine di lavoro

Quando si chiede "lavoriamo sul prossimo ticket", il prossimo è **il primo di questa lista** che soddisfa tutte e tre le condizioni:

1. ha **Stato: da fare** nell'intestazione del file;
2. tutti i ticket in "Dipende da" sono **fatti**;
3. non ha una decisione aperta (colonna "In attesa di").

Se il primo della lista è bloccato si passa al successivo, e lo si dice. Quando si prende una decisione la si scrive nel ticket e la si toglie da qui.

Al 02/10/2026 tutti i ticket delle ondate 0-4 sono fatti. La lista è quella dell'ondata 5, nell'ordine della sua tabella: UX-45, UX-46, UX-47, UX-48, UX-49 (in attesa di una decisione), UX-50, UX-51.

I ticket fatti escono dalla lista: restano nelle tabelle delle ondate, con lo stato nel file.

### Parcheggiati (da rivalutare dopo le ondate 0-2)

- Riordino del menu principale: servono prove con utenti reali (tree test), le opinioni dei revisori divergono. (La navigazione **dentro** la sezione Partite è in UX-36.)
- ~~Shell admin completamente separata: per ora basta togliere il sito pubblico dall'admin (UX-06).~~ Ripresa in UX-40 (header ridotto, non una shell nuova).
- Fondo neutro al posto del crema `#F7F4F1`.
- Profilo giocatore: dati ripetuti fra hero e griglia statistiche.
- Immagini OG (Satori) allineate ai nuovi colori.

## Come si lavora un ticket

1. Un ticket, un branch, una PR. La migrazione tipografica tocca circa 200 file: meglio PR piccole per area.
2. Testi nuovi o modificati della UI pubblica in **entrambi** i dizionari (`it.json` + `en.json`). L'admin resta in italiano.
3. Niente colori scritti a mano, niente `fontSize` letterali nuovi (vedi CLAUDE.md).
4. Prima di chiudere: `npx tsc --noEmit`, `npm test`, `npm run a11y` (da UX-01 in poi) e schermate prima/dopo nella PR.
5. Aggiornare lo **Stato** in testa al ticket (`da fare` → `in corso` → `fatto`, con il link alla PR).
