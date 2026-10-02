# UX-40 · Admin: header ridotto, menu, azioni fuori dalle righe, linguaggio, target

**Ondata:** 4 · **Stima:** L · **Dipende da:** UX-32 · **Stato:** fatto (su `develop`, 02/10/2026): una sola barra in admin con menu su telefono, un'azione con etichetta più "⋯" nelle righe di partite e utenti, permessi degli allenatori allineati alle API, niente μ/σ/"Skill"; target sotto 44 px su telefono da 87 a 6 in `/admin/partite` e da 67 a 8 in `/admin/utenti`

## Problema

Era parcheggiato ("shell admin separata: per ora basta togliere il sito pubblico dall'admin"). UX-06 ha tolto nastro e footer, ma:

1. **Due barre.** Sopra la barra admin (`AdminNavBar`) resta l'header pubblico completo (9 voci, ricerca, Aspetto, lingua, notifiche). Su mobile resta la barra in basso pubblica (Home, Allenamenti, Calendario, Notifiche).
2. **Tab con frecce a 1.440 px.** `AdminTrainingsView.tsx:73` (`variant="scrollable" scrollButtons="auto"`) mostra ‹ › con sole 3 schede, e lo stesso capita a `AdminNavBar` in alcune pagine.
3. **Azioni rischiose in riga** in `/admin/utenti` (`AdminUserList`):
   - una tendina del ruolo attiva su ognuna delle 116 righe, senza annulla;
   - un cestino rosso su ogni riga.
4. **Icone senza etichetta.** In `/admin/partite` ogni riga ha 5 icone (convocati, statistiche, MVP, modifica) più il cestino.
5. **Gergo.**
   - Convocazioni (`ConvocazioniClient`, `LineupOptimizerSection`): "Σμ 160.3", "μ 26.2", "40 formazioni valide", "Presenze calcolate sulle ultime 2 settimane (nessun allenamento gestito in finestra)".
   - Utenti: colonna "Skill" con "26.2 ±6.1".
6. **Intestazioni diverse:** "Gestione Partite" (h1 grande), "CONVOCAZIONI" (occhiello + h4), "Statistiche giocatori" (icona appesa); le convocazioni partono 24 px più a destra delle altre pagine.
7. **Target su mobile:** ancora 87 sotto 44 px in `/admin/partite` e 63 in `/admin/utenti` (rimisura del 29/09).
8. **Troncamenti:** in "Partite imminenti" della dashboard mobile il nome della partita diventa "Kari…".

## Verifica del 02/10/2026

Codice e misura con Playwright sul dev server (1.440 e 390 px, da admin, stesso conteggio del riaudit).

| #   | Stato                    | Cosa si è trovato                                                                                                                                                                                                                                  |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | aperto                   | Header pubblico sopra la barra admin, cinque etichette uguali nelle due barre. Su telefono tre livelli: hamburger pubblico, tab admin, barra in basso (`BottomNav` non è in `HideInAdmin`).                                                        |
| 2   | non si riproduce a 1.440 | Nessuna freccia a 1.440 px. Su telefono invece le frecce della barra admin occupano 80 px su 390 e non servono (si scorre col dito): il punto era scritto al contrario. Con il menu sparisce.                                                      |
| 3   | aperto, cambiato         | La tendina del ruolo è nella tab Account e salva subito. La tab che si apre ora è Atleti: niente ruolo, ma una tendina della squadra per riga, anche lei a salvataggio immediato. Il cestino apre già una conferma: il difetto è peso e vicinanza. |
| 4   | aperto                   | 5 icone per riga su desktop, 4 su telefono (lì manca Statistiche). "Profila avversario" ha l'icona delle arti marziali.                                                                                                                            |
| 5   | aperto, più largo        | Oltre ai casi citati: tooltip di `RatingBadge`, colonna "Skill" anche in `ChildrenTab` e nelle card mobile, "Match Quality Score" (`OpponentProfileDialog`), "Basato su rating TrueSkill" (`MatchQualityBadge`), `/admin/sviluppo`.                |
| 6   | fatto in UX-32, un resto | `ConvocazioniClient.tsx:223` ha un `Container` annidato: titolo a 184 px invece di 152 su desktop, a 32 invece di 16 su telefono.                                                                                                                  |
| 7   | aperto, numeri fermi     | `/admin/partite` 87 (64 sono `IconButton` 36×36); `/admin/utenti` 67 sulla tab Atleti, 63 su Account (50 `IconButton` 36×36).                                                                                                                      |
| 8   | aperto                   | `AdminProssimePartite.tsx:115`: `nowrap` con ellissi, e nome, chip e "Convoca →" sulla stessa riga.                                                                                                                                                |

**Trovato durante la verifica, fuori dal ticket ma più grave:** la `PATCH /api/users/[userId]` chiede solo `isCoachOrAdmin` e accetta qualunque `appRole` (`route.ts:25,45-52`). Un allenatore può promuovere chiunque, sé compreso, ad admin. È il passo 0 del piano.

## Decisioni prese

| Tema                      | Decisione                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigazione su mobile     | Un **menu** (02/10/2026): niente tab scorrevoli, niente barra in basso in admin.                                                                                                                                                                                                                                                                                                      |
| Desktop                   | Una barra sola con i link, niente sidebar (toglie larghezza alle tabelle).                                                                                                                                                                                                                                                                                                            |
| Ricerca globale           | Via dall'header admin: esclude ospiti e minori, allo staff darebbe risultati incompleti. Le persone si cercano in `/admin/utenti`.                                                                                                                                                                                                                                                    |
| Lingua                    | Via dall'header admin (l'admin è solo in italiano). Il tema resta nel menu dell'avatar.                                                                                                                                                                                                                                                                                               |
| Scala 1-5                 | Scartata per il livello stimato: 1-5 sono i ruoli Baskin, e il badge del ruolo sta accanto.                                                                                                                                                                                                                                                                                           |
| Fasce a parole            | Scartate accanto a un nome ("Bassa" vicino a una persona pesa, e un terzo della rosa lo sarebbe per definizione). Restano solo come filtro di lista.                                                                                                                                                                                                                                  |
| Permessi degli allenatori | (02/10/2026) L'allenatore approva solo gli ospiti, come Atleta o Genitore. Ogni altro cambio di ruolo utente è dell'admin, e nessuno cambia il proprio. Il resto resta com'è nell'API: convocazioni e MVP anche all'allenatore; squadre, partite, statistiche ed eliminazione di un account solo all'admin. L'interfaccia non mostra a un allenatore azioni che gli darebbero errore. |
| Livello stimato           | (02/10/2026) Strada **A**: via da `/admin/utenti` (tre tabelle e card). Nelle formazioni il numero sta sulla formazione, non sulle persone.                                                                                                                                                                                                                                           |
| Squadra in riga           | (02/10/2026) Resta sulla riga dov'è oggi (Atleti, Account e Figli su desktop). La cambia solo l'admin; l'allenatore la legge.                                                                                                                                                                                                                                                         |

## Livello stimato

Dati di oggi (di prova, 111 valutati): livello fra 10,8 e 37,0 con metà rosa fra 23 e 28; incertezza fra 5,2 e 8,2. **Nessuno** scende sotto la soglia "stima affidabile" di `RatingBadge` (5): l'indicatore di affidabilità oggi non dice niente.

|                   | **A · Solo dove si decide** (scelta)                                                                                                                                       | **B · Un numero per persona**                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/admin/utenti`   | La colonna sparisce dalle tre tabelle e dalle card: è un'anagrafica, lì nessuna scelta usa quel numero.                                                                    | Colonna "Livello" con un intero ("26"), neutro.                                                      |
| Formazioni        | Il numero sta sulla formazione, non sulle persone: "Forza della formazione 26 · avversario 25" (media dei sei, stessa scala dell'avversario) e la percentuale che c'è già. | Come A, più il livello accanto a ogni giocatore.                                                     |
| `/admin/sviluppo` | Curva e chip di andamento (crescita, calo…), che ci sono già; l'ordine resta per livello ma senza la cifra.                                                                | Colonna "Livello" con l'intero e "stima provvisoria" scritto a parole.                               |
| Affidabilità      | Non si mostra.                                                                                                                                                             | A parole, con soglia da tarare sui dati veri di produzione.                                          |
| Pro               | Nessuna classifica fra persone, nessuna falsa precisione, meno codice.                                                                                                     | L'allenatore curioso vede il numero.                                                                 |
| Contro            | Chi oggi guarda la colonna la perde.                                                                                                                                       | Con un'incertezza di ±6 su una rosa che sta in 5 punti, la cifra invita a confronti che non reggono. |

Scartata anche la proposta "punti a tre cifre" (`262`, con tilde per le stime provvisorie): è la stessa falsa precisione con un numero più grande, somiglia a una classifica Elo, e la tilde oggi sarebbe su tutti.

## Piano

Si lavora su `develop`, un commit per passo. A ogni passo: `npx tsc --noEmit`, `npm test`, `npm run a11y` (rigenerando la baseline se cambia) e la rimisura dei target delle pagine toccate.

### Passo 0 · Permessi (S) — fatto

- `PATCH /api/users/[userId]`: la regola è `canAssignAppRole` in `@/lib/authRoles` (testata, e provata sul dev server: un allenatore che si promuove ad admin riceve 403). La scheda utente offre solo i ruoli che chi guarda può assegnare (`assignableAppRoles`).
- `/admin/utenti` per un allenatore: ruolo utente e squadra di sola lettura, niente cestino sugli account (un figlio senza account lo elimina anche l'allenatore, come da API).
- Le azioni delle partite si condizionano nel passo 2, dove le righe si riscrivono: `AdminPartiteClient` riceverà lì il ruolo di chi guarda.

### Passo 1 · Shell (M) — fatto

- **`AdminHeader`** (`src/components/admin/`) è l'unica navigazione del pannello. Lo monta il layout radice dentro `OnlyInAdmin`, fuori dal `<main>` (lo skip link deve saltarlo); `SiteHeader`, `Footer` e `BottomNav` stanno in `HideInAdmin`. Non è una variante di `SiteHeader`: in admin non parte più la fetch delle squadre. `AdminNavBar` è eliminato.
- Lo spazio di 60 px in fondo al `<main>` lo decide `MainContent` (client): in admin non c'è.
- **`/admin/login`** e chiunque non sia dello staff vedono la barra minima: il logo (che porta al sito) e "Admin".
- **Una barra**, 60 px su desktop e 56 su telefono, sul fondo `adminBand`, senza filo arancio.
  - Da `lg`: logo, scudo "Admin", sette link con `aria-current`, **"Altro"** con le altre nove sezioni raggruppate (quando si è in una di quelle, il bottone ne prende il nome e lo stato attivo), campanella, avatar. Sono link, non `Tabs`: niente frecce. A 1.200 px ci sta senza sforare; sotto c'è il menu.
  - Sotto `lg`: `☰`, logo, "Admin · <sezione>" (sotto `sm` solo lo scudo e la sezione), campanella, avatar.
  - **Uscire verso il sito costa un tocco a ogni larghezza** (richiesta del committente, 02/10): il logo porta sempre alla home del sito, come nelle pagine pubbliche. Il bottone "Torna al sito" nella barra è stato tolto: basta il logo (scelta del committente, 02/10); la scritta resta in fondo al menu. Senza, su telefono l'uscita era dentro il menu: due tocchi dove prima bastava "Home" nella barra in basso.
  - **Menu** (`AdminNavDrawer`): da sinistra, 280 px, tutte le 16 sezioni con le icone della dashboard e i suoi gruppi, voci da 48 px, "Torna al sito" in fondo. Alla chiusura il focus torna al bottone.
  - Campanella a ogni larghezza (`NotificationBell tone="surface"`). Menu dell'avatar: profilo, tema, esci.
  - Le sezioni stanno in un posto solo, `@/lib/adminNav` (`ADMIN_NAV`, `activeAdminSection`): il test controlla che ogni voce porti a una pagina che esiste.
- Titoli di pagina uguali alla voce di menu: "Partite", "Utenti", "Eventi", "News", "Squadre", "Gallery", "Registro attività"; "Esporta dati" anche nella dashboard.
- Convocazioni e i sei `loading.tsx` dell'admin: via il `Container` annidato (il titolo delle convocazioni parte a 152 px come le altre pagine, a 16 su telefono).
- Tab interne (`AdminTrainingsView`, `AdminUserList`): niente frecce.
- Dashboard, "Partite imminenti": su telefono nome a tutta larghezza su due righe, sotto la data, sotto ancora chip e bottone "Convoca" da 44 px; da `sm` una riga.
- Misure dopo il passo (02/10): un solo `header`, nessuna barra in basso, nessuna freccia a ogni larghezza provata (390, 900, 1.024, 1.199, 1.200, 1.440), nessuno scorrimento orizzontale; `npm run a11y` senza violazioni gravi. I target sotto 44 px restano 86 in partite e 66 in utenti: sono le icone in riga dei passi 2 e 3.

### Passo 2 · Partite (M) — fatto

- Una sola azione con etichetta per riga, scelta dallo stato della partita e da chi guarda; il resto in "⋯". La regola è in `@/lib/matches/adminRowAction` (testata), il componente è `MatchRowActions`.

  | Stato                        | Azione                | Enfasi     |
  | ---------------------------- | --------------------- | ---------- |
  | Futura, nessun convocato     | Convoca               | `outlined` |
  | Futura, con convocati        | Convocati (12)        | `text`     |
  | Giocata, senza risultato     | Inserisci risultato   | `outlined` |
  | Risultato, senza statistiche | Inserisci statistiche | `outlined` |
  | Completa                     | Statistiche           | `text`     |

  All'allenatore resta sempre la convocazione, l'unica cosa che può salvare; nel suo "⋯" c'è solo "Pagina pubblica", e "Nuova partita" non compare.

- "⋯": Convocati, Modifica risultato, Statistiche giocatori, Scheda avversario (al posto di "Profila avversario" e dell'icona delle arti marziali), Modifica partita, Pagina pubblica (in una scheda nuova), divisore, Elimina partita… Le stesse voci su telefono e desktop: prima su telefono mancavano le statistiche.
- Via il bottone "+ Risultato" dentro il punteggio (ora è testo), il chip "Senza stats" e la colonna "Stats": lo dice l'azione. La colonna delle azioni ha un nome ("Azioni").
- Su telefono il bottone è a tutta larghezza in fondo alla card, 44 px.
- `_count.callups` arriva dalla query della pagina. POST e PUT non sono cambiate: una partita appena creata nasce nel client con i conteggi a zero, e dopo una modifica restano quelli della riga. Nelle amichevoli interne il conteggio somma le due squadre: lì l'etichetta è "Convocati" senza numero.
- Corretto mentre si era lì: dopo la modifica di una partita la forza dell'avversaria tornava "non impostata", perché la PUT non la restituisce; ora resta quella della riga.

### Passo 3 · Utenti (M) — fatto

- Colonna azioni: un solo "⋯" da 44 px (`PersonRowMenu`: Apri scheda, divisore, Elimina… con il dialog di conferma che c'era). Un account lo elimina solo l'admin; un figlio senza account anche l'allenatore.
- **Il nome è il bottone** che apre la scheda (`PersonNameButton`). Su telefono è tutta la parte sinistra della card (`PersonCardButton`): dentro non ci sono altri controlli.
- Tab Account: ruolo utente come chip di sola lettura per tutti; si cambia nella scheda, con Salva e Annulla. La casella "Nuovi account da approvare" resta la via rapida.
- Squadra: resta in riga su desktop, la cambia solo l'admin.
- Conferma e rifiuto del ruolo Baskin suggerito restano in riga su desktop, della misura di prima (su telefono non ci sono: c'è il chip, e la scheda).
- Su telefono i controlli della barra (ricerca, stato, Filtri, Nuovo figlio, Nuovo utente, Atleta e Genitore dell'approvazione) sono alti 44 px (`TOUCH_TARGET_ON_PHONE`, `TOUCH_FIELD_ON_PHONE` in `@/lib/touchTarget`).

### Passo 4 · Linguaggio e livello (M) — fatto

- Livello secondo la strada A.
  - `/admin/utenti`: la colonna "Skill" è sparita dalle tre tabelle e dalle card, e la pagina non legge più il livello dal database.
  - Formazioni: "Forza della formazione 28 · avversario 33" (media dei sei, `formationStrength` in `@/lib/rating/staffLevel`, testata). Nessun numero accanto ai nomi; chi non ha ancora partitelle è segnato "non ancora valutato". Il divario fra titolare e riserva è scritto "divario alto", senza cifra.
  - `/admin/sviluppo`: restano curva e andamento; la colonna col numero è sparita, l'ordine è lo stesso. Il filtro è "Livello: terzo più alto / centrale / più basso".
  - `RatingBadge` eliminato.
- Testi cambiati: "Formazione consigliata", "N formazioni possibili", "Analisi della formazione", "Titolari e riserve per ruolo", l'avviso senza formazione, la frase delle presenze senza "finestra", il sottotitolo di sviluppo, "Stima ricavata dai risultati delle partitelle. La vede solo lo staff.", "Forza dell'avversaria (serve a stimare quanto sarà equilibrata la partita)".
- Controllo fatto sul sito: nessun `μ`, `σ`, `Σ`, "Skill", "TrueSkill", "rating", "Match Quality" o "finestra" nel testo, nei `title` e negli `aria-label` di undici pagine admin, su desktop e telefono.

### Trovato e corretto lungo la strada

- **Errore di idratazione nella dashboard**, a volte: in "Partite imminenti" l'icona del chip passava da un Server Component alla prop `icon` di `Chip`. L'elemento può arrivare non ancora risolto, il chip lo scarta sul server e lo disegna nel browser. Ora l'icona sta dentro l'etichetta. Vale come regola: da un Server Component non si passano icone alle prop `icon`/`avatar` di un componente client.
- I sei `loading.tsx` dell'admin avevano lo stesso `Container` annidato delle convocazioni.

### Rimasto fuori

- Bottone principale sempre nello stesso punto dell'intestazione (oggi tre posizioni diverse): è coerenza, non un criterio di questo ticket.
- Sidebar, azioni in blocco sugli utenti, ridisegno della scheda utente e del form partita, una ricerca persone per lo staff nell'header.
- Cambio squadra atomico (un'unica chiamata) con annulla.
- Paginazione delle tabelle (frecce da 40 px, selettore delle righe) e link del breadcrumb sotto i 44 px su telefono: sono di `TablePagination` e di `PageHeader`, comuni a tutto il sito.
- Affidabilità della stima: oggi non si mostra. Se servirà, a parole e con una soglia tarata sui dati veri di produzione (nei dati di prova nessuno scende sotto la soglia che c'era).
- Dall'admin si torna al sito sempre dalla home; un "Torna al sito" che porta alla pagina pubblica della sezione in cui si è è stato proposto e non richiesto (02/10).
- Il contatore dei suggerimenti nuovi nel menu (oggi solo nella dashboard): vorrebbe una query a ogni pagina.

## Criteri di accettazione

Verificati il 02/10/2026 sul dev server (Playwright, 1.440 e 390 px, da admin e da allenatore).

- [x] In admin un solo livello di navigazione per dispositivo; su telefono nessuna barra in basso e le notifiche raggiungibili dalla barra.
- [x] Tutte le sezioni dell'admin raggiungibili dal menu, non solo dalla dashboard.
- [x] Nessuna freccia di scorrimento sulle tab da `sm` in su.
- [x] Nessuna eliminazione e nessun cambio di ruolo utente direttamente nella riga della lista. La squadra e la conferma del ruolo Baskin suggerito restano in riga (decisione del committente).
- [x] Un allenatore non può assegnare ruoli oltre la regola decisa (403 dall'API), e non vede azioni che gli danno errore.
- [x] Nessun "μ", "σ", "Σ", "Skill" o "TrueSkill" visibile in UI.
- [x] Target sotto 44 px su mobile sotto 10: `/admin/partite` 6 (erano 87), `/admin/utenti` 8 sulla tab Atleti e 7 su Account e Figli (erano 67 e 63). Quelli rimasti sono lo skip link, il breadcrumb, la paginazione e gli strumenti di sviluppo.
- [x] `npm run a11y` verde, baseline vuota; `npx tsc --noEmit`, `npm run lint` e `npm test` verdi.
