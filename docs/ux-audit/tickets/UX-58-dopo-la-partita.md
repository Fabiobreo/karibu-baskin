# UX-58 · Il dopo-partita: un appuntamento, non dati sparsi

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** UX-56, UX-57 · **Stato:** da fare · **In attesa di:** decisione sul voto MVP delle famiglie (punto 4)

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

Dopo una partita il sito ha tutto: risultato, statistiche, MVP, foto (con UX-57), la prossima partita. Ma arriva **a pezzi e in momenti diversi**:

- il risultato avvisa con `MATCH_RESULT` (`api/matches/[matchId]/route.ts`), poi le statistiche avvisano di nuovo chi ha una riga (`stats/route.ts`), poi gli MVP sbloccano badge con un altro avviso, poi (UX-57) le foto. Una famiglia può ricevere quattro notifiche per la stessa partita in due giorni, e nessuna dice "è tutto pronto";
- la pagina della partita giocata è un elenco: tabellino, statistiche, MVP, convocati. Non risponde alle domande di chi la apre ("com'è andata? com'è andato mio figlio? ci sono le foto? quando si rigioca?") in quest'ordine;
- in fondo alla pagina non c'è un passo successivo: né la prossima partita né l'invito a condividere.

## Cosa fare

### 1. Pagina della partita giocata, in quest'ordine

In `/partite/[slug]`, solo per le partite con risultato (`matchPhase`):

1. **Tabellino** nell'`EntityHero` (com'è oggi).
2. **"Per te"** (solo tesserati con un giocatore della famiglia in partita, dati dai convocati o da `PlayerMatchStats`): una riga per persona, "Marco: 6 punti, 3 tiri su 5" e i badge sbloccati in quella partita ("Nuovo traguardo: 10 partite 🔟"), con link al profilo se pubblico (`withProfileLink`). È la riga che il genitore cerca: oggi deve trovarla nella tabella.
3. **MVP** con `TeamAvatar` e nome (oggi più in basso).
4. **Foto** (`AlbumStrip` di UX-57).
5. **Statistiche** (tabella com'è oggi).
6. **Convocati** (distinta com'è oggi).
7. **"E adesso"**: la prossima partita della stessa squadra (riga partita come in `/partite`), oppure, se non ce n'è una nel calendario, il prossimo allenamento. Sotto, la riga di condivisione (`ShareSection`, UX-56).

Le regole sui minori restano quelle di oggi (`publicSubjects`): chi non è tesserato non vede minori in nessuna di queste sezioni, e la sezione "Per te" esiste solo per i tesserati.

### 2. Un avviso solo, quando è tutto pronto

Oggi gli avvisi del dopo-partita sono tre (risultato, statistiche, badge) più le foto. Proposta:

- **Risultato:** resta, a tutti quelli che lo ricevono oggi, appena è salvato. È la notizia.
- **Statistiche:** l'avviso a chi ha una riga diventa **personale** e unico: "Marco ha segnato 6 punti contro Thiene" invece di un avviso generico, e porta alla pagina della partita con l'ancora sulla sezione "Per te" (`#per-te`). Se nello stesso salvataggio si sblocca un badge, il badge entra nello stesso avviso ("6 punti e un traguardo nuovo: 10 partite") invece di partire con un avviso separato. Questo richiede che `reconcilePlayerBadges` (`@/lib/rating/badgeService`) restituisca i badge nuovi invece di notificarli da sé, con un parametro `notify: false` dalla rotta delle statistiche; gli altri chiamanti (MVP, backfill) non cambiano.
- **Foto:** come UX-57.
- Misurare con UX-55 prima e dopo (aperture di `MATCH_RESULT` e `BADGE_UNLOCKED` per 4 settimane).

### 3. Riga "Partite di questo fine settimana" in home

Per due giorni dopo l'ultima partita del fine settimana (fino al martedì sera, fuso Europe/Rome), la sezione partite della home apre con i risultati del fine settimana (una riga per partita, `PlayedMatchRow`) prima delle prossime partite. Poi torna com'è oggi. Così chi apre l'app il lunedì trova subito la cosa di cui si parla.

### 4. Decisione aperta: voto MVP delle famiglie

`MatchMvp` oggi lo sceglie lo staff. Un **"MVP del pubblico"** votato dai tesserati per 48 ore dopo la partita farebbe tornare sul sito chi non è venuto in palestra, ma in uno sport inclusivo può diventare una gara di popolarità che premia sempre gli stessi. Opzioni da far scegliere al committente:

- **A.** Niente voto: resta l'MVP dello staff. (Raccomandata se il club teme l'effetto popolarità.)
- **B.** Voto dei tesserati, risultato mostrato solo come "il pubblico ha scelto…" accanto all'MVP dello staff, senza percentuali né classifica dei voti. Un voto per famiglia, solo fra chi ha giocato.
- **C.** Voto su un momento e non su una persona ("l'azione più bella"), con le foto dell'album come opzioni. Richiede UX-57 e un album con le foto giuste: più bello, più lavoro per lo staff.

Fino alla decisione questo punto non si implementa; gli altri sì.

## Criteri di accettazione

- La pagina di una partita giocata ha le sezioni nell'ordine del punto 1; "Per te" c'è solo per un tesserato con un giocatore della famiglia in partita e mostra le sue righe.
- Da anonimo: niente "Per te", nessun minore nelle altre sezioni (stesse prove di oggi in `routeAccess.test.ts` e nei test delle pagine).
- Salvando le statistiche con un badge nuovo sbloccato, il genitore riceve **un** avviso con punti e traguardo, non due; il badge è comunque in `EarnedBadge` e nella pagina.
- Per una partita storica (`isHistoricMatch`) nessun avviso, come oggi.
- La sezione "E adesso" mostra la prossima partita della squadra; senza partite in calendario, il prossimo allenamento; senza nessuno dei due, non c'è.
- Il martedì sera dopo le 23:59 la home torna senza la riga dei risultati del fine settimana (test sulla funzione pura che decide la finestra).
- Testi in `it.json` ed `en.json`; `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.
