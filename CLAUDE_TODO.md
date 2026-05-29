# CLAUDE_TODO.md — Karibu Baskin

## 📋 FEATURES PIANIFICATE

### F1. **Gallery foto integrata con Instagram/Facebook**

Sezione gallery nel sito che mostra le foto pubblicate sui social della squadra, senza dover caricare nulla manualmente.

**Opzioni da valutare:**

- **Instagram Basic Display API / Graph API** — richiede app Meta approvata e token di accesso a lunga scadenza (60 giorni, rinnovabile). Mostra post pubblici del profilo. Gratuita ma con review process.
- **Facebook Page API** — simile, richiede Page Access Token. Utile se la pagina FB è più attiva di IG.
- **Soluzione ibrida (consigliata):** fetch lato server (route API) con cache aggressiva (es. revalidate ogni ora) — non espone token al client, riduce chiamate API.

**Alternativa senza API:**
Usare un widget embed di terze parti (es. Elfsight, Behold.so) — zero codice ma dipendenza esterna e possibile costo mensile.

**Prerequisiti:**

- Decidere quale social è più aggiornato (IG o FB)
- Creare app Meta su developers.facebook.com
- Ottenere token con permesso `instagram_basic` o `pages_read_engagement`

---

### F2. **Sistema TrueSkill** _(futuro — già in memory)_

Rating nascosto su User/Child per bilanciare squadre in allenamento e supportare le scelte di lineup in campionato. Visibile solo COACH/ADMIN.

> Sintesi integrata (maggio 2026) tra il piano interno e una consulenza con un'altra AI. Le decisioni qui sotto sono quelle definitive concordate.

**Perché TrueSkill (non ELO):**

- ELO converge troppo lentamente con pochi dati per giocatore
- TrueSkill modella l'incertezza (μ + σ) e converge più velocemente
- Progettato nativamente per sport di squadra (skill squadra = somma dei μ in campo)

#### Decisioni di design

- **Rating SINGOLO per giocatore (μ, σ), NON per-ruolo.** ⚠️ Corregge la nota precedente "rating per-ruolo". Nel baskin ogni atleta ha **una categoria fissa** (`sportRole` 1-5): non cambia categoria tra partite, quindi un rating per-ruolo avrebbe sempre 4/5 dimensioni vuote. Un solo μ/σ per giocatore converge meglio.
- **La categoria è un VINCOLO, non un asse di rating.** I constraint regolamentari di categoria 1/2/3/4/5 sono obbligatori in tutta la generazione di lineup (partitelle e campionato). Le categorie non sono intercambiabili.
- **Due sorgenti di aggiornamento:**
  1. **Partitelle** (segnale primario, frequente) → fonte dati: modello `TrainingMatchResult` **già esistente** (`matchup` "AB"/"AC"/"BC", `scoreA`/`scoreB`).
  2. **Campionato W/L** (segnale secondario, raro) → peso minore / β maggiore, da `Match` + `PlayerMatchStats`.
- **Margin of victory attivo:** la differenza punti scala l'entità dell'update, **cappata** sui distacchi da supremazia. Scala dei margini nel baskin (punteggi alti): **≤4** combattuta, **~10** equilibrata, **~18** superiorità, **>18** supremazia. Implementato in `movWeight()`: peso lineare da 0.5 (combattuta) a 1.0 (margine ≥24).
- **Skill squadra = somma dei μ** dei giocatori in campo.
- **Altezza come layer di matchup, NON nel TrueSkill.** Nuovo campo `height Int?` (nullable) su User/Child, mostrato come annotazione affiancata a μ nella scheda convocati. Rilevante per cat. 3/4/5 contro avversari fisici. Non blocca il sistema se mancante.
- **Storico rating:** tabella append-only (`RatingUpdate`) scritta ad ogni aggiornamento — abilita il Development Tracker (curve μ) senza retrofit futuro. Cheap da aggiungere subito.
- **Visibilità:** μ/σ e derivati visibili **solo COACH/ADMIN**. Iscrizioni anonime / atleti senza account → unrated (default μ/σ, esclusi dagli update).

#### Bilanciamento partitelle (estende `teamGenerator.ts`)

Il generatore attuale bilancia solo **struttura ruoli + genere** e ignora la skill. TrueSkill aggiunge un **terzo layer** dopo quelli esistenti:

1. Strutturale: distribuzione equa dei ruoli (esistente)
2. Genere: bilanciamento donne R4/R5 (esistente)
3. **Skill (nuovo):** a parità di struttura, minimizzare il gap di Σμ tra squadre — mantenendo il **determinismo** (Mulberry32 seedato su `sessionId`).

#### Roadmap a fasi (numerazione interna, riordinata per dipendenze)

- **Fase 0 — Fondamenta:** ✅ FATTO. Campi `ratingMu`/`ratingSigma`/`height` su User+Child; tabella `RatingUpdate` + enum `RatingUpdateReason`; lib `src/lib/trueskill.ts` (implementazione self-contained 2-team, niente dipendenze) con costanti (μ₀=25, σ₀=25/3, β=σ₀/2, τ=σ₀/100) + test.
- **Fase 1 (Adesso) — Loop partitelle:**
  - ✅ `src/lib/ratingEngine.ts`: snapshot roster (`buildRostersSnapshot`), margin of victory (`movWeight`), replay puro (`replayTrainingEvents`) e ricalcolo+persistenza (`recomputeTrainingRatings`). + test.
  - ✅ Campo `rostersSnapshot Json?` su `TrainingMatchResult` (roster congelato).
  - ✅ Wiring API: POST `/sessions/[id]/match-results` congela lo snapshot e ricalcola in transazione; PUT/DELETE `[resultId]` ricalcolano (modello "replay completo", consistente con create/edit/delete fuori ordine).
  - ✅ Layer skill nel `teamGenerator` (Passo 5): scambi greedy deterministici stesso-ruolo+genere per avvicinare Σμ; no-op se nessuno è valutato. La route teams passa `ratingMu`.
  - ⏳ **DA FARE:** aggiornamento secondario da W/L campionato (`Match`/`PlayerMatchStats`) — fondere gli eventi ufficiali nel log cronologico di `recomputeTrainingRatings` (peso minore / β maggiore). UI per segnare il risultato della partitella esiste già (`TrainingMatchResult`).
  - ✅ UI COACH/ADMIN per visualizzare μ/σ: componente riusabile `RatingBadge` + colonna "Skill" in `AdminUserList` (tabelle desktop utenti/figli + chip nelle card mobile). Resta nascosto agli utenti normali (solo area admin). `page.tsx` espone `ratingMu`/`ratingSigma`.
  - ✅ **Cambio categoria → σ rigonfiato**: il replay (`replayTimeline`) fonde nella timeline cronologica partitelle E cambi ruolo (da `SportRoleHistory`, ora **polimorfico** userId/childId). A un cambio categoria (non prima assegnazione) μ resta, σ torna a σ₀ (`ROLE_CHANGE`). Agganciato a `PUT /api/users/[userId]` e `PATCH /api/children/[childId]` (recompute fire-and-forget). **Copre anche i figli.**
  - ✅ **Pagine pubbliche dei figli**: `Child.slug` aggiunto; `/giocatori/[slug]` risolve User **o** Child (vista unificata `player`), con `robots: noindex` per i figli. Slug generato in `PATCH /api/children/[childId]` + `generateChildSlug`.
  - ✅ **Link ai profili figli ovunque** (`slug ?? id`): roster squadra, `MatchStatsTable`, `MatchDetailTabs` (marcatori + MVP), pagina partita (MVP), `ClassificaTableClient`, leader squadra (`LeaderCard`), allenamento (`TeamDisplay` + `RosterByRole` via `userSlug` esteso nella route `/api/registrations`). **Classifica marcatori interna** (`/marcatori`) ora **include i figli** (groupBy per userId+childId). TODO minore residuo: OG image (`giocatori/[slug]/opengraph-image.tsx`) ancora solo-User.
  - ⏳ **DA FARE:** migrazione DB in prod (`prisma db push` al deploy) — colonne additive, sicure.
- **Fase 2 — Player Development Tracker:** ✅ FATTO. `src/lib/ratingTrend.ts` (classifica crescita/calo/plateau/altalenante/nuovo da serie μ, + test); `RatingSparkline` (curva μ in SVG puro, niente dipendenze); `DevelopmentTracker` (tabella con ricerca + filtro trend); pagina `/admin/sviluppo` (COACH+) + card nella dashboard. Legge lo storico `RatingUpdate`.
- **Fase 3 — Opponent profiling + Match Quality Score:** TrueSkill avversario da W/L campionato (prior = stima manuale / posizione classifica); form post-partita "3 click per categoria" (forza deboli/media/forti, fisicità bassa/media/alta); output matchup categoria-vs-categoria con alert mismatch fisici; classifica qualitativa pesata per forza avversario.
- **Fase 4 — Lineup optimizer campionato:** ottimizzazione dell'intera lista convocati (non solo i 5 titolari): combinazioni regolamentari valide, win probability vs avversario stimato, analisi **gap μ titolare↔riserva per categoria** (gap alto = rischio falli), top-N lineup + raccomandazione profondità per categoria. Altezza come annotazione.
- **Fase 5 (futuro) — Chemistry score:** coppie/trii che sovraperformano la somma dei μ. Richiede dati per-possesso non ancora disponibili. **Rinviato.**

#### Out of scope (per ora)

- Gestione rotazioni in tempo reale (serve operatore dedicato in partita)
- Ruoli tattici (la categoria È il ruolo nel baskin)
- Simulazione Monte Carlo stagione (dati avversari insufficienti)
- Chemistry granulare (vedi Fase 5)

#### Add-on LLM (futuro, costo ~zero) — separato da TrueSkill

- RAG statico sul regolamento ufficiale baskin (PDF); embedding una tantum + inferenza Gemini Flash / GPT-4o-mini
- Chatbot embedded accessibile a giocatori/allenatori/arbitri/genitori
- Potenziale valore per tutta la comunità baskin italiana

#### Regole regolamentari (CONFERMATE — codificare come hard constraint)

Esistono **due livelli** di vincolo, entrambi da modellare:

**A. Lineup IN CAMPO (6 giocatori contemporanei):**

- Esattamente **6** giocatori in campo.
- Esattamente **1** giocatore tra Ruolo 1 e Ruolo 2 (**mutuamente esclusivi** — mai insieme in campo).
- Ruoli 3/4/5 ammessi a riempire gli altri 5 slot.
- **Somma punti ruolo ≤ 23** (il valore numerico del ruolo = i suoi punti).
- Tra i giocatori R4+R5 in campo: **≥1 femmina E ≥1 maschio**.

**B. Roster TOTALE (convocati "a referto") — ciò che serve davvero oltre al campo:**

- **Max 14** giocatori a referto.
- **Obbligo di partecipazione:** ogni convocato deve entrare in campo almeno una volta entro le prime 4 frazioni → il roster deve garantire **profondità sufficiente per ruolo** da rendere fattibili le rotazioni rispettando A in ogni istante.
- ⇒ La Fase 4 (lineup optimizer) ottimizza il **roster intero + fattibilità rotazioni**, non solo i 6 titolari: deve verificare che esista una sequenza di formazioni valide (vincolo A) che faccia giocare tutti i 14 entro 4 frazioni, e segnalare i **gap μ titolare↔riserva per ruolo** come rischio falli.

> Per le **partitelle** di allenamento il vincolo A si applica in forma rilassata (squadre informali, dimensioni variabili): si mantiene la mutua esclusività R1/R2 e il bilanciamento di genere già presenti, ma non necessariamente il cap ≤23 o i 6 esatti. Da rifinire in Fase 1.

#### Cambio categoria di un giocatore (CONFERMATO)

Evento raro (≤1/anno per giocatore, spesso una volta in carriera), es. 3→4. Poiché il rating è **singolo su scala comune** (non per-ruolo), il cambio categoria **non azzera** μ. Regola:

- **μ invariato** (la skill accumulata resta informazione valida).
- **σ rigonfiato a σ₀** (o frazione alta ~0.8·σ₀): reintroduce incertezza → ri-convergenza rapida nelle partitelle successive senza buttare via lo storico.
- Agganciato al flusso esistente di **conferma admin** del cambio ruolo (`sportRoleSuggested` → conferma + `SportRoleHistory`).
- Scrivere una riga `RatingUpdate` con tipo evento `ROLE_CHANGE` (non una partita) → il Development Tracker (Fase 2) mostra il salto esplicitamente e non lo legge come crollo di forma.
- **Nessun replay** dello storico partitelle.

#### Snapshot roster partitella (CONFERMATO)

Per attribuire correttamente gli update TrueSkill serve sapere "chi era in squadra A/B/C" al momento della partitella, ma `TrainingSession.teams` può cambiare se si rigenerano le squadre. Regola definitiva:

- Quando si **segna il risultato** di una partitella (`TrainingMatchResult`), il **roster delle squadre coinvolte viene congelato** in uno snapshot salvato sul record stesso (campo Json, es. `rostersSnapshot`).
- Lo snapshot è **immutabile**: per cambiare le squadre dopo aver segnato un punteggio bisogna **cancellare il risultato** (che annulla anche l'update TrueSkill associato), modificare le squadre e ri-segnare.
- ⇒ l'update TrueSkill legge sempre dallo snapshot del record, mai dal `teams` corrente della sessione.
