# UX-54 · Ritardatari nelle squadre senza avvisare tutti, equilibrio per lo staff

**Ondata:** 6 · **Stima:** M · **Dipende da:** UX-53 · **Stato:** in corso

Chiesto dal committente il 26/10/2026 (non nasce da un riaudit).

## Problema

1. **Ritardatari.** Capita spesso che qualcuno si iscriva dopo che le squadre sono state fatte. Oggi:
   - l'avviso "Ci sono stati cambiamenti nelle iscrizioni" ha un solo bottone, "Ricrea", che rimescola tutte le squadre e manda "Squadre pronte!" a **tutti** gli iscritti (la POST di `/api/teams/[sessionId]`);
   - la modifica a mano (PUT) non avvisa nessuno, nemmeno chi viene aggiunto o spostato;
   - sulla pagina pubblica dell'allenamento l'editor dello staff non ha il gruppo "Da assegnare", quindi lì un ritardatario non si può aggiungere a mano.
2. **Livello nelle squadre.** Allenatori e admin vogliono capire se le squadre sono equilibrate, e chi pesa di più. Oggi il livello stimato bilancia le squadre in generazione ma lo staff non ne vede niente.

## Decisioni del committente (26/10/2026)

- **Avvisi solo a chi entra o cambia squadra.** Mai più "Squadre pronte!" a tutti dopo la prima volta.
- **Livello per giocatore come fascia** (terzo più alto, centrale, più basso), solo per lo staff. Conferma la strada A di UX-40: nessun numero accanto a un nome.
- **Un numero solo sulla squadra:** l'equilibrio in percentuale.

## Cosa fare

### 1. Avvisi

- **Prima creazione** (nessuna squadra salvata, o squadre tutte vuote): resta "Squadre pronte!" a tutti gli iscritti, come oggi.
- **Dopo**, sempre e solo a chi è toccato, per persona come le convocazioni (`loadPlayerAudiences` + `deliverNotices` di `@/lib/notifications/matchNotify`): il giocatore legge "Sei nei Neri" (entrato) o "Ora sei nei Neri" (cambiato squadra), i genitori "Marco è nei Neri" / "Marco ora è nei Neri", con titolo dell'allenamento e giorno. Tipo `TEAMS_READY` (in lista il contenuto è il corpo).
- Vale per **"Ricrea da capo"** (POST: confronto con le squadre di prima), per **"Aggiungili alle squadre"** (avvisa solo chi entra) e per la **modifica a mano**.
- **Modifica a mano:** l'editor salva a ogni spostamento, e avvisare a ogni salvataggio manderebbe due avvisi a chi viene spostato due volte. Gli avvisi partono su "Fatto", con il confronto fra le squadre di quando l'editor è stato aperto e quelle salvate (`POST /api/teams/[sessionId]/notify` con l'assegnazione di partenza). Sopra "Fatto" la spunta "Avvisa chi è entrato o ha cambiato squadra (N)", accesa di default; senza cambiamenti non c'è.
- Nessun avviso a chi esce dalle squadre (resta iscritto ma "Da assegnare") né a chi si è cancellato.
- Allenamento finito: nessun avviso, come oggi.

### 2. Ritardatari

- L'avviso dello staff nomina chi manca: "2 iscritti non sono in squadra: Marco Rossi, Anna Pozza", e se serve "1 non è più iscritto".
- Azione principale **"Aggiungili alle squadre"** (`POST /api/teams/[sessionId]` con `mode: "add"`): toglie dalle squadre chi non è più iscritto o è segnato assente e mette ogni nuovo iscritto nella squadra con meno giocatori del suo ruolo; a parità, quella con meno giocatori; a parità, quella col livello totale più basso. Nessun altro si sposta. Logica pura e testata (`placeLateAthletes` in `@/lib/trainingTeams`).
- Azione secondaria **"Ricrea da capo"**, con conferma ("Le squadre verranno rifatte da zero; avviso solo chi cambia squadra").
- Sulla pagina pubblica dell'allenamento l'editor dello staff riceve gli iscritti, quindi ha "Da assegnare" come in admin.

### 3. Equilibrio e fasce (solo allenatori e admin)

- **Dati:** `GET /api/teams/[sessionId]/levels` (`staffGuard`, livello `staff` in `routeAccess.test.ts`): per ogni iscrizione μ, σ e fascia. Mai al dirigente né a chi non è staff. μ e σ servono solo al calcolo nel browser dell'anteprima e non si mostrano mai.
- **Fascia:** terzili del valore prudente (μ − 3σ) dentro il gruppo di ruolo (1-2, 3, 4, 5, senza ruolo) su tutta la rosa valutata: la stessa regola del filtro di `/admin/sviluppo`, spostata in `@/lib/rating/levelBands` e condivisa. Chi non ha un livello stimato non ha fascia.
- **Segno accanto al nome:** freccia su (terzo più alto), trattino (centrale), freccia giù (più basso), in `text.secondary`, con il nome della fascia per i lettori di schermo e nel suggerimento. Legenda di una riga sotto la barra.
- **Barra dell'equilibrio** sopra il tabellone (2 squadre): "Equilibrate" se la probabilità di vittoria sta fra 42 e 58%, altrimenti "Favoriti gli Arancioni"; percentuale per squadra, forza di ciascuna (`formationStrength`, media dei livelli) e quanti non hanno ancora un livello stimato (contano al livello di partenza). Con 3 squadre: solo la forza di ciascuna.
- **Probabilità:** TrueSkill su due formazioni di 6 in campo con il livello medio di ciascuna squadra (`teamWinProbability` in `@/lib/rating/teamBalance`): la somma premierebbe la squadra con un giocatore in più, che in allenamento ruota e non gioca in sette.
- **Anteprima in modifica:** con dei giocatori selezionati, la barra dice per ogni squadra di destinazione come cambierebbe l'equilibrio ("Se li sposti nei Neri: 45% · 55%").
- Le parole "Skill", "TrueSkill", "rating" non compaiono (UX-40).

## Criteri di accettazione

- Un iscritto dopo la creazione: "Aggiungili alle squadre" lo mette in squadra senza spostare nessun altro; avviso solo a lui (o ai genitori).
- "Ricrea da capo": avviso solo a chi ha cambiato squadra.
- Editor: spostare una persona e riportarla indietro, poi "Fatto": nessun avviso.
- Prima creazione: "Squadre pronte!" a tutti, come prima.
- Atleta, genitore o dirigente: nessuna fascia, nessuna barra, la GET dei livelli risponde 403.
- Testi in `it.json` ed `en.json`; `tsc --noEmit`, ESLint e `npm test` verdi.

## Rimasto fuori

- Avviso a chi esce dalle squadre restando iscritto.
- Percentuale con 3 squadre.

## Esito

Implementato il 26/10/2026, non ancora committato.

- **Avvisi:** `@/lib/notifications/teamsNotify` (`notifyTeamChanges`, testi in `teamChangeNotices`) con `teamChanges` e `assignmentOf` di `@/lib/trainingTeams`. La POST di `/api/teams/[sessionId]` confronta con le squadre salvate prima: la prima volta "Squadre pronte!" (nell'ordine delle iscrizioni), poi solo chi entra o cambia squadra. Ricreare con gli stessi iscritti non avvisa nessuno (la generazione è deterministica).
- **Ritardatari:** `mode: "add"` della POST (schema `TeamsPostSchema` in `@/lib/schemas/teams`) con `placeLateAthletes`; audit `UPDATE_TEAMS` con il numero di aggiunti e tolti. Nell'avviso dello staff il primo bottone è "Aggiungili alle squadre" ("Aggiorna le squadre" se c'è solo chi è uscito), "Ricrea da capo" chiede conferma. `SessionPageClient` passa gli iscritti a `TeamDisplay`: anche la pagina pubblica ha "Da assegnare" e i nomi nell'avviso.
- **Modifica a mano:** l'editor ricorda l'assegnazione di apertura; sopra "Fatto" la spunta "Avvisa chi è entrato o ha cambiato squadra (N)" (o "Avvisa gli iscritti che le squadre sono pronte" se si componevano da vuote), che chiama `POST /api/teams/[sessionId]/notify` (`TeamsNotifySchema`).
- **Livelli:** `GET /api/teams/[sessionId]/levels` (`staffGuard`, in `routeAccess.test.ts` come `staff`); fasce da `@/lib/rating/levelBands`, che ora usa anche `/admin/sviluppo` (stessa regola, codice in un posto solo). `TeamDisplay` li chiede solo se `isStaff` (allenatore o admin).
- **Interfaccia:** `TeamBalanceBar` (barra con le tinte delle casacche, percentuali, forza, legenda delle fasce, chi non ha un livello stimato) sopra il tabellone e nell'editor; `BandMark` accanto al nome nel tabellone e nei chip dell'editor; anteprima "Spostandoli in Neri: …" con dei giocatori selezionati. `normCdf` di `trueskill.ts` ora è esportata.
- **Verifiche:** `tsc --noEmit` ed ESLint puliti; Vitest 2562 test verdi, fra cui i nuovi su `teamChanges`, `placeLateAthletes`, `teamBalance`, `levelBand`, la POST (ricreare non avvisa, ritardatario avvisato da solo e messo dove manca il suo ruolo, `add` senza squadre = 400), `/levels` (403 a chi non è staff) e `/notify`. In Storybook a 360 px (stories "Staff: ritardatario ed equilibrio" e "Staff: modifica con equilibrio"): avviso col nome, barra, fasce, anteprima selezionando un giocatore, tema scuro, nessuno scorrimento orizzontale. Non provati nel browser: il salvataggio vero e l'arrivo degli avvisi (Storybook non ha il server), e `npm run a11y`.
- **Revisione avversaria (26/10):** corretti dopo la revisione:
  - **Riferimento degli avvisi sul server.** Le squadre salvate tengono l'assegnazione dell'ultimo avviso (`notified`, `NOTIFIED_KEY` in `@/lib/trainingTeams`). La scrivono solo POST e `/notify`; la PUT conserva quella salvata e ignora quella del browser. `/notify` non si fida più dell'assegnazione mandata dall'editor, che resta solo per le squadre salvate prima, e una seconda chiamata o una seconda scheda non avvisano due volte.
  - **Modifica a mano senza "Fatto".** Chi è stato spostato viene avvisato con la squadra fatta dopo.
  - **Forza e percentuale sotto 3 giocatori.** Non si mostrano (`MIN_TEAM_SIZE`): con uno o due sarebbero il livello di una persona. Le anteprime mostrano solo la percentuale.
  - **Presenze appena segnate.** "Aggiungili alle squadre" le salva prima di chiamare il server.
  - **Iscritti andati via tutti.** "Aggiorna le squadre" funziona anche senza iscritti.
  - **Allenamento finito.** Niente spunta "Avvisa".
  - **Livelli ricaricati.** Si richiedono quando cambiano gli iscritti, non solo il loro numero.
  - **Fasce dei figli con un account.** Si leggono dall'account e non contano due volte.
  - **Tre squadre.** Si seguono da `numTeams` anche con la terza vuota.
  - **"Ricrea da capo".** Tiene il numero di squadre salvato.
  - **Assenti nella pagina pubblica.** Chi è segnato assente non risulta "non in squadra".
- **Limite noto:** eliminare le squadre e rifarle manda di nuovo "Squadre pronte!" a tutti (come prima di UX-54). Nel conteggio della spunta "Avvisa" entrano anche gli iscritti anonimi, che non ricevono avvisi.
