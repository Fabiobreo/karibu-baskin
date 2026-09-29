# Riaudit UX/UI · punto di partenza e istruzioni

Questo documento serve a chi rifà l'audit per capire se il sito è migliorato rispetto al 24 settembre 2026. Contiene i voti di allora, le misure grezze, il metodo per ripeterle nelle stesse condizioni e l'elenco di cosa è cambiato da allora, così ogni affermazione dei ticket si può verificare.

- Risultati consolidati dell'audit: [AUDIT.md](AUDIT.md). Piano, decisioni e ticket: [README.md](README.md).
- Misure grezze di allora: [misure/baseline-2026-09-24.json](misure/baseline-2026-09-24.json).
- Script per ripeterle: [misure/rimisura.mjs](misure/rimisura.mjs) (browser) e [misure/misura-codice.mjs](misure/misura-codice.mjs) (codice).

## 1. Voti dell'audit del 24/09/2026

Voti da 1 a 10, dati da un solo revisore (l'autore dell'audit) guardando 70 schermate e il codice. Non c'era una griglia scritta: le motivazioni sono nella sezione 2, ed è su quelle che conviene confrontarsi, più che sul numero.

L'audit ha avuto due versioni nella stessa giornata. La seconda toglie i difetti dovuti ai dati di prova e aggiunge la verifica di usabilità (axe, tastiera, target, compiti): **la versione di riferimento è la rivista**.

| Area                        | Prima versione | Versione rivista (riferimento) |
| --------------------------- | -------------- | ------------------------------ |
| Impatto visivo              | 6              | **6**                          |
| Chiarezza UX                | 5,5            | **6**                          |
| Coerenza UI                 | 5              | **5**                          |
| Qualità percepita / premium | 5              | **5,5**                        |
| Fiducia / credibilità       | 6,5            | **7**                          |
| Mobile                      | 6              | **6**                          |
| Usabilità                   | (non c'era)    | **6,5**                        |

### Euristiche di Nielsen (versione rivista)

| Euristica                           | Voto  | Motivazione di allora                                                                                |
| ----------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| Visibilità dello stato              | 8     | Conto alla rovescia, "In corso", badge delle notifiche, salvataggi immediati con avviso.             |
| Linguaggio dell'utente              | 7     | Buono per atleti e genitori; "3V 1P 3S", "Skill ±", "(+13)", "R1-R5" sono gergo.                     |
| Controllo e libertà                 | 7     | Dialog di conferma presenti; manca l'annulla sulle azioni rapide in admin.                           |
| Coerenza e standard                 | **4** | 4 intestazioni di pagina, 3 forme di bottone, tab con maiuscole diverse, 5 stili di card.            |
| Prevenzione degli errori            | 6     | Presenze a 3 stati ciclici; cestino rosso su ogni riga.                                              |
| Riconoscere più che ricordare       | 5     | Icone senza etichetta in admin; barra in basso muta; creazione nascosta nel clic su un giorno.       |
| Flessibilità ed efficienza          | 6     | Ricerca globale utile; mancano azioni di massa (tutti presenti, convoca tutti del ruolo X).          |
| Estetica e minimalismo              | 5     | Duplicazioni, istruzioni triplicate, nastro sponsor ovunque (vedi però le decisioni al punto 7).     |
| Riconoscere e correggere gli errori | 7     | Messaggi chiari (`readError`); i motivi dei blocchi nelle iscrizioni sono spiegati bene.             |
| Aiuto e documentazione              | 6     | FAQ presenti ma nascoste sotto Contatti; l'admin compensa con testi invece che con un flusso chiaro. |

### Obiezione della contro-revisione sui voti

Il revisore "avvocato del diavolo" ha contestato il voto "premium": per un'associazione inclusiva gestita da volontari conta che il sito sia accogliente, chiaro e affidabile, non che sembri un prodotto commerciale. Proponeva di misurare **quanti compiti riescono per ciascun pubblico**, compresi gli atleti con disabilità intellettive. Per questo nel riaudit i voti vanno affiancati dalla tabella dei compiti (sezione 3), che è il confronto più solido.

## 2. Cosa pesava su ciascun voto

Il riaudit dovrebbe dire, per ogni punto, se è ancora vero. Il dettaglio è in [AUDIT.md](AUDIT.md); qui l'elenco in forma verificabile.

**Impatto visivo (6) e qualità percepita (5,5)**

- Identità arancio e nero diluita: hero con gradiente marrone (`#1A1A1A → #2D1A0A → #3D2010`), fondo crema `#F7F4F1`, bottone primario mattone `#BF360C`.
- Ruoli Baskin in cinque colori (blu, verde, arancio, viola, rosso) che si confondono con vittoria/sconfitta e con il marchio.
- Arancio anche su elementi non cliccabili (occhielli, chip informativi).
- Cerchi decorativi negli hero, chip sopra il titolo che ripetono il titolo ("Eventi" sopra "Eventi").
- Copertine vuote per gli eventi senza immagine; la news in evidenza senza foto disegnava un "documento finto" che sembrava un caricamento bloccato.

**Coerenza UI (5)**

- Nessuna scala tipografica: 967 `fontSize` scritti a mano, fino a 23 dimensioni di testo in una pagina, pesi da 400 a 900 ovunque, occhiello maiuscoletto riscritto in 36 file.
- Quattro pattern di intestazione pagina, quattro larghezze di contenitore, breadcrumb che partono a 20, 64, 144 o 294 px.
- Tre forme di bottone (raggio 8, pillola, pillola con alone); tab metà in maiuscolo e metà no; card che si sollevano al passaggio del mouse anche se non cliccabili.

**Chiarezza UX (6)**

- Header con 8 voci e 4 menu a tendina; tema e lingua in primo piano (5 fermate di Tab).
- Lucchetti come prima impressione: dettaglio partita aperto sulla tab bloccata "Convocati"; due blocchi "Accedi" nella pagina allenamento.
- Home uguale "brochure" anche per il tesserato che ha fatto l'accesso.
- Gestione allenamenti divisa fra sito pubblico e admin.
- In `/marcatori` il numero mostrato non era quello su cui si ordina ("74 (+13)" sopra "76").

**Fiducia (7)**: prodotto ricco e curato, contrasto progettato con i rapporti annotati, dark mode vero, focus corretto. Toglievano qualcosa i casi vuoti e il login con un pallone generico invece dello stemma.

**Mobile (6)**: nessuno scroll orizzontale (punto forte); nomi squadre troncati nei risultati ("Orsi Ba…"); barra in basso con l'etichetta solo sulla voce attiva; admin con 2 target su 3 sotto i 44 px; zoom con due dita bloccato.

**Usabilità (6,5)**: compiti ricorrenti di atleta e genitore brevi e buoni; difficili quelli dello staff (chiusura allenamento, statistiche da telefono) e la conversione dell'anonimo ("vieni a provare").

**Barriere di accessibilità** (non avevano un voto proprio ma erano la priorità massima): zoom bloccato (`maximumScale: 1`), `text.disabled` (2,67:1) usato come testo in 293 punti, campi e select senza nome accessibile, profilo giocatore senza `<h1>`, `<Link><Button>` (HTML non valido e due Tab per bottone), errori in avvisi che sparivano dopo 3,5 s, testo fra 9,6 e 10,9 px.

## 3. Compiti principali (da rifare per primi)

Stesso compito, stesso utente, stesso punto di partenza. "Passi" = tocchi o schermate significative. Esito su scala facile / medio / difficile.

| Utente   | Compito                       | Percorso al 24/09                                                                                                             | Passi    | Esito                                                                                                     |
| -------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| Anonimo  | Venire a provare              | Home → "Vieni a provare" (sotto la piega) o "Scrivici" → `/contatti` → "Scrivi un messaggio" (chiuso) → 3 campi               | 5-6      | medio                                                                                                     |
| Anonimo  | Capire cos'è il Baskin        | Hero → "Cos'è il Baskin?"                                                                                                     | 1        | facile                                                                                                    |
| Anonimo  | Com'è andata l'ultima partita | Menu Partite → Risultati → riga → dettaglio (aperto su tab bloccata)                                                          | 3        | medio                                                                                                     |
| Atleta   | Iscriversi a un allenamento   | Home → card → modulo → Iscriviti                                                                                              | 2-3      | facile con ruolo confermato, **difficile al primo accesso** (soggetto, fino a 4 domande, risultato, note) |
| Atleta   | Dichiarare la disponibilità   | Banner o menu utente → `/profilo/disponibilita` → Sì / No                                                                     | 2        | facile (ma errore di salvataggio non persistente)                                                         |
| Atleta   | Trovare la propria squadra    | Pagina allenamento → banner "La tua squadra"                                                                                  | 1        | facile                                                                                                    |
| Genitore | Iscrivere il figlio           | Pagina allenamento → "per chi" → Iscriviti (questionario in seconda persona)                                                  | 3        | facile (dal codice)                                                                                       |
| Coach    | Creare un allenamento         | `/allenamenti` pubblico → "Nuovo", oppure clic su un giorno del calendario senza segnale visivo                               | 2-3      | medio-difficile                                                                                           |
| Coach    | Chiudere un allenamento       | Admin → "Da completare" → card (27 aperte, 16.000 px) → presenze a pallino a 3 stati → "Salva" per ogni partitella → Concludi | 5+       | **difficile**                                                                                             |
| Coach    | Convocare per una partita     | Admin → Partite → icona senza etichetta → filtri → selezione → Salva (solo in alto)                                           | 4        | medio                                                                                                     |
| Coach    | Inserire le statistiche       | Admin → Partite → icona → tabella di campi numerici senza etichetta e senza +/-                                               | 3 + dati | medio, difficile da telefono                                                                              |
| Staff    | Approvare un nuovo account    | Admin → Utenti → casella in cima → "Atleta" o "Genitore"                                                                      | 2        | facile                                                                                                    |

Limiti di allora: l'iscrizione non è stata provata dal vivo (nessun allenamento aperto nel database di sviluppo) e i compiti sono ricostruiti da schermate e codice, senza utenti reali. Oggi `npm run db:seed-ux` crea i casi mancanti (vedi sezione 5), quindi i compiti si possono fare davvero nel browser.

## 4. Misure oggettive di allora

Tutte le misure per pagina sono in [misure/baseline-2026-09-24.json](misure/baseline-2026-09-24.json): chiave `axe` (violazioni per regola, target touch su mobile, Tab prima del contenuto su desktop) e chiave `dom` (dimensioni e pesi di testo distinti, nodi di testo sotto 12 px, target sotto 32 px, altezza, scroll orizzontale).

### Axe: nodi con violazioni gravi (critical + serious)

| Pagina                      | Desktop | Mobile |
| --------------------------- | ------- | ------ |
| Home (anonimo)              | 5       | 4      |
| `/risultati`                | 19      | 17     |
| `/marcatori`                | 40      | 174    |
| Profilo giocatore           | 16      | 15     |
| `/contatti`                 | 10      | 9      |
| `/profilo` (atleta)         | 14      | 15     |
| `/notifiche` (atleta)       | 10      | 11     |
| `/admin`                    | 11      | 17     |
| `/admin/allenamenti`        | 148     | 119    |
| `/admin/partite`            | 50      | 19     |
| `/admin/utenti`             | 85      | 34     |
| Statistiche partita (admin) | 7       | 8      |

Regole presenti su ogni pagina: `meta-viewport` (zoom bloccato) e `image-redundant-alt` (6 nodi, moderata). Il resto era soprattutto `color-contrast`, più `aria-input-field-name` (50 select in `/admin/utenti`), `label` (6 campi per riga nelle statistiche), `aria-progressbar-name` (barre dei traguardi), `page-has-heading-one` (profilo giocatore), `list` (`/notifiche`), `image-alt` (avatar admin su mobile).

### Tastiera, target, testo

| Misura                                             | Valore al 24/09                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| Tab prima del contenuto (desktop)                  | 18 da anonimo, 19 con l'accesso ("Vai al contenuto" era già il primo) |
| Target sotto 44 px su mobile, `/admin/allenamenti` | 196 su 311                                                            |
| Target sotto 44 px su mobile, `/admin/partite`     | 89 su 120                                                             |
| Target sotto 44 px su mobile, `/admin/utenti`      | 65 su 95                                                              |
| Target sotto 44 px su mobile, `/marcatori`         | 45 su 64 (27 sotto 24 px: i nomi dei giocatori)                       |
| Nodi di testo sotto 12 px, `/marcatori`            | 124 desktop, 250 mobile                                               |
| Nodi di testo sotto 12 px, `/admin/allenamenti`    | 182 desktop, 194 mobile                                               |
| Dimensioni di testo distinte in una pagina         | fino a 23 (profilo giocatore desktop)                                 |
| Altezza di `/admin/allenamenti`                    | 16.269 px desktop, 21.440 px mobile                                   |
| Scroll orizzontale                                 | 0 su tutte le pagine misurate                                         |

Nota: allora quasi ogni pagina aveva un "pavimento" di 17-19 nodi di testo sotto 12 px anche quando il contenuto non ne aveva; conviene guardare le differenze sopra quel valore.

### Codice

| Misura                         | Al 24/09                     |
| ------------------------------ | ---------------------------- |
| `fontSize` letterali in `src/` | 967 (icone comprese)         |
| `text.disabled`                | 293 usi in 96 file           |
| `<Link><Button>`               | 42                           |
| `maximumScale`                 | 1 (`src/app/layout.tsx:105`) |

`misura-codice.mjs` usa le stesse espressioni regolari; separa i `fontSize` delle icone da quelli del testo, quindi per confrontarli con 967 si sommano le due righe. Il numero di `fontWeight` scritti a mano citato nell'audit (369) contava solo il valore 700: non è confrontabile con la riga "700-900" dello script.

## 5. Come ripetere le misure

Prerequisiti: `npm install`, `.env` con `ENABLE_TEST_LOGIN=true`, dev server avviato (`npm run dev`).

```bash
npm run db:seed-ux
```

```bash
node docs/ux-audit/misure/rimisura.mjs
```

```bash
node docs/ux-audit/misure/misura-codice.mjs
```

```bash
npm run a11y
```

- `db:seed-ux` crea i casi che mancavano all'audit (genitore con figlio senza ruolo, allenamento con iscrizioni aperte, partite future, nomi lunghi). Con `DISABLE_NOTIFICATIONS=true` si prova tutto senza avvisare nessuno. Si toglie con `npm run db:clean-ux`.
- `rimisura.mjs` ripete le misure di allora nelle stesse condizioni (viewport, tema, profili, pagine, regole axe con **tutte** le gravità) e stampa il confronto con la baseline; il risultato completo va in `test-results/ux-riaudit/`. Usa gli URL dell'audit se esistono ancora, altrimenti li sostituisce con equivalenti dal database e lo dice.
- `npm run a11y` è il controllo che il progetto usa oggi (UX-01, UX-20, UX-22): solo violazioni gravi, anche in tema scuro e a 360 px. Al 29/09 la sua baseline (`e2e/a11y-baseline.json`) è vuota, cioè nessuna violazione grave nota.

Avvertenze per confrontare:

- I dati di sviluppo cambiano: un'altezza di pagina o un conteggio di target possono variare perché ci sono più o meno righe, non perché la pagina è cambiata.
- Alcune pagine non sono più la stessa pagina. `/admin/allenamenti` oggi ha tre schede e righe chiuse (UX-13, UX-14): il confronto con i 16.000 px di allora misura proprio quel cambiamento, ma axe e target vanno letti sapendo che la scheda aperta di default è "Prossimi". Le statistiche partita oggi hanno contatori +/- (più target, ma più grandi).
- L'atleta su mobile era fotografato in tema scuro, mentre axe girava in tema chiaro: lo script lo ripete così.
- `rimisura.mjs` è stato provato il 29/09/2026 sul dev server; i suoi numeri di quel giorno non sono nel repository (sono in `test-results/`, ignorata da git), perché il confronto spetta a chi fa il riaudit.

## 6. Cosa è cambiato dal 24/09 (da verificare)

Tutti i ticket delle ondate 0-3 risultano fatti tranne UX-21. Per ciascuno: il problema dell'audit a cui risponde e dove guardare. Il ticket completo, con i criteri di accettazione, è in [tickets/](tickets/).

| Ticket | Problema dell'audit                                      | Cosa dichiara di aver fatto                                                                                                     |
| ------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| UX-01  | Nessun controllo ripetibile                              | `npm run a11y` con baseline                                                                                                     |
| UX-02  | Zoom bloccato                                            | Tolto `maximumScale`; campi a 16 px sui dispositivi touch (niente zoom automatico iOS)                                          |
| UX-03  | Campi e controlli senza nome, titoli                     | Nomi accessibili su campi, select, barre, immagini; `h1` nel profilo giocatore; liste valide in `/notifiche`                    |
| UX-04  | `<Link><Button>`                                         | `LinkBehavior` nel tema, `<Button href>` ovunque                                                                                |
| UX-05  | Messaggi che spariscono                                  | Errori che restano finché non si chiudono, avvisi almeno 6 s, "Riprova" sulla disponibilità, annullamento disiscrizione 10 s    |
| UX-06  | Undici piccoli difetti + admin dentro il sito pubblico   | Tab pubblica sulla partita, un solo "Accedi", modulo contatti aperto, "Abbonati al calendario", nastro e footer via dall'admin… |
| UX-07  | Bottone mattone, arancio non toccabile, hover finto, tab | Bottone `#C84B00` testo bianco, arancio solo sui toccabili, sollevamento solo sulle card cliccabili, tab senza maiuscolo        |
| UX-08  | Hero marroni e copiati a mano                            | Fondo grafite unico da `heroStyles.ts`, niente cerchi, via i chip che ripetevano il titolo                                      |
| UX-09  | `text.disabled` come testo                               | Tolto da testi e icone piccole, secondo segnale sugli stati, regola ESLint                                                      |
| UX-10  | Nessuna scala, testo sotto 12 px                         | `TYPE_SCALE` nel tema, minimo 12 px                                                                                             |
| UX-11  | Arcobaleno dei ruoli                                     | `RoleBadge` col numero in evidenza, tinte tenui                                                                                 |
| UX-12  | Header sovraccarico                                      | Tema in un pannello "Aspetto", lingua in un bottone "IT · EN"                                                                   |
| UX-13  | Chiusura allenamento difficile                           | Righe chiuse una alla volta, Presente/Assente, un solo salvataggio, statistiche con contatori                                   |
| UX-14  | Allenamento diviso fra pubblico e admin                  | Tutto in `/admin/allenamenti` (Prossimi, Da completare, Conclusi, Nuovo); "Nuovo" nel calendario                                |
| UX-15  | Conversione dell'anonimo, luogo mancante                 | Sezione "Vieni a provare" in `/contatti`, CTA puntate lì, luogo dell'allenamento, riepilogo dopo l'iscrizione                   |
| UX-16  | Home brochure per i tesserati                            | Card "prossima cosa da fare" in home e profilo                                                                                  |
| UX-17  | Linguaggio medico e gergo                                | Ruoli in frasi brevi, questionario in terza persona per i figli con pittogrammi, niente barre oblique, traguardi spiegati       |
| UX-18  | Nomi troncati nei risultati                              | `PlayedMatchRow`, nostra squadra sempre a sinistra, due livelli sotto 600 px                                                    |
| UX-19  | Copertine vuote, documento finto                         | `CoverFallback`                                                                                                                 |
| UX-20  | (trovato dopo) pagine più larghe dello schermo           | Corretto; `npm run a11y` misura a 360 px                                                                                        |
| UX-21  | Testi facili da far rivedere al club                     | **Aperto**: documento pronto in [revisione-club/](revisione-club/), manca la revisione del club e la prova con gli atleti       |
| UX-22  | Contrasto residuo                                        | Baseline di `npm run a11y` vuota, anche in tema scuro                                                                           |
| UX-23  | Pagina allenamento staff                                 | "Gestisci" verso l'admin al posto della matita                                                                                  |
| UX-24  | Rifiniture                                               | Cinque punti minori                                                                                                             |
| UX-25  | Errori lontani dall'elemento                             | `InlineError` in sette flussi                                                                                                   |
| UX-26  | Mancavano dati per provare i flussi                      | `db:seed-ux` / `db:clean-ux`, `DISABLE_NOTIFICATIONS`                                                                           |
| UX-27  | Migrazione tipografica                                   | Zero `fontSize` letterali sul testo, regola ESLint in `error`, niente `heading-order`                                           |
| UX-28  | Arancio su elementi non toccabili negli hero             | Occhielli e icone degli hero neutri (opzione B)                                                                                 |

Non sono stati affrontati di proposito (vedi "Parcheggiati" nel README): riordino del menu principale, migrazione di tutte le pagine su nuovi componenti di layout, shell admin separata, fondo neutro al posto del crema `#F7F4F1`, dati ripetuti fra hero e statistiche nel profilo giocatore, immagini OG coi nuovi colori. Se il riaudit li trova ancora, è atteso: vanno segnalati come "ancora aperti", non come regressioni.

## 7. Cosa non segnalare come difetto

Decisioni del committente (dettagli e motivazioni nel [README](README.md#decisioni-già-prese)):

- **Sponsor:** nastro in ogni pagina pubblica, foto dell'hero con gli striscioni, `/sponsor`, sezione in Contatti. È la visibilità promessa agli sponsor. Solo in admin il nastro non c'è.
- **Colori:** arancione e nero restano i colori principali; bottone primario `#C84B00` con testo bianco (scelta B, la variante nero su `#E65100` è stata scartata).
- **Lingua** sempre visibile anche senza accesso; solo il tema sta in "Aspetto".
- **Home** con la stessa struttura per tutti più una card per i tesserati (niente home diverse per ruolo).
- **Emoji dei traguardi:** restano.
- **Dati di prova:** calendario vuoto, orari strani, "Lorem ipsum", squadre con un atleta non sono difetti.
- Palette dei ruoli a tinte tenui e occhielli degli hero neutri sono scelte fatte fra alternative mostrate (tavole in [img/](img/)).

Si possono invece discutere nel merito, portando argomenti nuovi: sono scelte, non vincoli.

## 8. Protocollo consigliato per il riaudit

1. **Prima di leggere i ticket**, guardare il sito come utente nuovo e fare i compiti della sezione 3 nel browser (desktop 1440 px e telefono 390 px), da anonimo, ospite, atleta, genitore e staff. Annotare passi ed esito. Questo evita di cercare solo quello che i ticket dicono di aver sistemato.
2. Dare i voti sulle stesse sette aree della sezione 1 e sulle dieci euristiche, **con una riga di motivazione per voto**, senza guardare prima i voti vecchi se possibile.
3. Lanciare le misure (sezione 5) e confrontarle con la baseline.
4. Solo ora passare la tabella della sezione 6: per ogni ticket, "verificato", "parziale" o "non verificato", con la prova (schermata, misura, file e riga).
5. Cercare regressioni: cose che funzionavano il 24/09 (punti forti in [AUDIT.md](AUDIT.md#punti-forti)) e ora no. Per esempio: salvataggio immediato della disponibilità, "Vai al contenuto" come prima fermata, nessuno scroll orizzontale, casella degli account da approvare.
6. Nuovi problemi, con gravità (critica / alta / media / bassa) e l'utente colpito.

Formato suggerito per il risultato, in un file `RIAUDIT-<data>.md` accanto a questo:

| Area / compito                 | 24/09               | Oggi | Motivazione (una riga) | Prova |
| ------------------------------ | ------------------- | ---- | ---------------------- | ----- |
| Coerenza UI                    | 5                   |      |                        |       |
| Coach, chiudere un allenamento | difficile, 5+ passi |      |                        |       |
