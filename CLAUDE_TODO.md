# CLAUDE_TODO.md — Karibu Baskin

## 🟠 MUST-HAVE — Gestiti offline (no sviluppo)

Feature che per una società sportiva sono "obbligatorie" ma che il direttivo gestisce manualmente fuori dall'app. Tracciati qui solo per memoria: **non implementare senza esplicita richiesta.**

- **Certificati medici** — raccolta cartacea, scadenze monitorate offline.
- **Modulistica / documenti scaricabili** (regolamento, modulo iscrizione, codice condotta) — distribuiti a mano.
- **Privacy minori / consenso immagini** — modulo firmato a mano dal genitore, non tracciato nel DB.

---

## 📋 FEATURES PIANIFICATE

### F2. **Gestione immagini con Vercel Blob**

Upload immagini da parte di admin/coach (es. foto profilo squadra, foto giocatore, ecc.).

**Stack:** Vercel Blob SDK (`@vercel/blob`) — `put()` per upload, `del()` per cancellazione.

**⚠️ NB — Storage limitato su piano Hobby:**

- Il piano gratuito Vercel include **5 GB** di Blob storage.
- Vercel **non invia notifiche** al raggiungimento del limite — gli upload falliscono silenziosamente.
- Monitorare manualmente: dashboard Vercel → Storage → Usage.
- Per upgrade: piano Pro (~$20/mese) include spending limits configurabili con alert email.

**Regola implementativa obbligatoria — nessun file orfano:**
Quando un'immagine viene sostituita, eliminare sempre la vecchia prima di salvare la nuova URL:

1. Leggi URL attuale dal DB
2. `put()` nuova immagine → ottieni nuovo URL
3. Salva nuovo URL nel DB
4. `del(vecchioUrl)` — **non saltare questo step**

Senza il passo 4, lo storage si riempie di file orfani non referenziati.

---

### F3. **Gallery foto integrata con Instagram/Facebook**

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

### F4. **Sistema TrueSkill per-ruolo** _(futuro — già in memory)_

Rating nascosto su User/Child per bilanciare squadre in allenamento. Visibile solo COACH/ADMIN.

**Decisione di design (maggio 2026):** usare **TrueSkill** (non ELO) perché:

- ELO converge troppo lentamente con pochi dati per giocatore
- TrueSkill modella l'incertezza (μ + σ) e converge più velocemente
- Progettato nativamente per sport di squadra

**Rating per-ruolo:** un rating separato per ogni ruolo sportivo (1-5) — i ruoli Baskin non sono comparabili tra loro.

**Bilanciamento in due livelli:**

1. Strutturale: distribuzione equa dei ruoli tra le squadre
2. Skill: a parità di ruoli, bilanciare per rating TrueSkill

**Prerequisito:** aggiungere UI semplice per registrare vincitori/perdenti di ogni partitella a fine allenamento — senza questo dato TrueSkill non si aggiorna.

---

### F5. **Must-have tecnici residui**

_(Nessuno aperto al momento — la lista cresce quando emergono nuovi requisiti che non possono essere gestiti offline.)_

---

### F6. **Nice-to-have ad alto impatto community**

#### 🚧 Da progettare

- **Alert copertura ruoli sulle partite** — quando in una partita la somma dei _disponibili_ per ruolo è sotto soglia minima, mostrare warning al coach (banner nella pagina admin partita + eventuale push). Definire soglie per-ruolo (es. almeno 2 giocatori di ruolo 1, ecc.) — magari configurabili nelle impostazioni partita o globali per stagione. Modello `MatchAvailability` già disponibile; ricordare che il **default è "non disponibile"** (chi non risponde è considerato assente).
- **Reminder push per chi non ha risposto alla disponibilità** — cron a T-N giorni dalla partita che invia push ai membri di squadra senza record `MatchAvailability` per quel match. Ridurrebbe il numero di "non disponibili per default" che in realtà sono solo distratti.

#### Altri nice-to-have community

- **Compleanni** — banner home + push ai compagni nel giorno del compleanno. Campo `birthDate` già presente su `User`. Cron giornaliero.
- **Recap automatico post-allenamento** — cron il giorno dopo: "Eravate N, squadra X ha vinto, top scorer Y" via push + AppNotification. Dati già in `TrainingMatchResult`.

#### ✅ Già implementati (per memoria)

- **MVP partita** — scelti dai coach (max 3) dalla pagina statistiche partita; visualizzati nel banner dorato su `/partite/[slug]`. Modello `MatchMvp`.
- **Disponibilità partite** — pagina `/profilo/disponibilita` (con link in profilo + menù utente) per atleti e genitori; integrazione in pagina convocazioni admin (sezione "Non disponibili" raggruppati per ruolo, non selezionabili); default = non disponibile per chi non ha risposto; vincolo niente modifiche su partite passate (mostrate in grigetto). Modello `MatchAvailability`.
- **Tabellino partita condivisibile** — endpoint `/api/matches/[matchId]/tabellino` (Node runtime + `next/og` `ImageResponse`) genera PNG 1080×1350 con risultato, MVP e top scorer; bottone "Condividi/Scarica tabellino" nella hero di `/partite/[slug]` quando c'è punteggio (Web Share API su mobile, download fallback).
- **Badge / achievement giocatore** — 10 badge in 3 tier (bronze/silver/gold) calcolati on-the-fly da `matchStats` e `matchMvps`. Helper `src/lib/badges.ts` + sezione "Achievement" nel profilo pubblico `/giocatori/[slug]`.
- **Confronto testa a testa con avversaria** — riga "Ultime N" con pallini V/N/P nel riquadro "Bilancio storico" su `/avversarie/[slug]`. Dati da `Match` già presenti.
- **OG image dinamiche** — `opengraph-image.tsx` per `/partite/[slug]`, `/giocatori/[slug]`, `/squadre/[season]/[slug]`. Usano Prisma (Node runtime) per mostrare dati reali (punteggio, nome giocatore, colore squadra).
- **Sitemap** — aggiunta `/avversarie/[slug]` alle pagine dinamiche (già presenti giocatori, squadre, partite, allenamenti).
- **Storico ruolo Baskin nel profilo** — sezione "Storico ruolo Baskin" in `/giocatori/[slug]` che mostra la progressione dei ruoli con date, da `SportRoleHistory`. Visibile solo se ci sono almeno 2 cambi.

---

### F7. **Nice-to-have di contenuto**

- **Bacheca / news** — nuovo modello `Post` (titolo, body markdown, autore, pubblicazione) + pagina `/news` + push automatica alla pubblicazione. Storico permanente delle comunicazioni (oggi solo notifiche effimere).
- **Pagina staff / "Chi siamo"** — `/la-squadra` esiste ma manca sezione dedicata ad allenatori e dirigenti (foto, ruolo, bio breve). Statica o derivata da `User` con flag `isStaffPublic`.
- **FAQ** — pagina statica con domande ricorrenti. Riduce il volume di `/contatti`.
- **Sondaggi/poll rapidi** — modello `Poll` con opzioni multiple, voto utente loggato, scadenza. Utile per scelte logistiche (cena fine stagione, orari trasferte).

---

## Note operative

| Categoria              | Quando fare                                       |
| ---------------------- | ------------------------------------------------- |
| 🔴 Critico             | Prima del prossimo push in produzione             |
| 🟡 Media (M1)          | Boy-scout rule: quando si tocca il file per altro |
| 🟠 Must-have offline   | Gestiti fuori dall'app — non implementare         |
| 📋 Feature (F2–F7)     | F2 → F5 (must-have tecnici) → F6 → F7             |
| 🛠 DX / ✨ UX / 🏗 INF | Raccogliere in sprint dedicati                    |
