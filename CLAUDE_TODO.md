# CLAUDE_TODO.md — Karibu Baskin

## 📋 FEATURES PIANIFICATE

### ✅ F2. **Gestione immagini con Vercel Blob** _(completata maggio 2026)_

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

### F6. **Nice-to-have ad alto impatto community**

#### 🚧 Da progettare

- **Alert copertura ruoli sulle partite** — quando in una partita la somma dei _disponibili_ per ruolo è sotto soglia minima, mostrare warning al coach (banner nella pagina admin partita + eventuale push). Definire soglie per-ruolo (es. almeno 2 giocatori di ruolo 1, ecc.) — magari configurabili nelle impostazioni partita o globali per stagione. Modello `MatchAvailability` già disponibile; ricordare che il **default è "non disponibile"** (chi non risponde è considerato assente).
- **Reminder push per chi non ha risposto alla disponibilità** — cron a T-N giorni dalla partita che invia push ai membri di squadra senza record `MatchAvailability` per quel match. Ridurrebbe il numero di "non disponibili per default" che in realtà sono solo distratti.

### F7. **Nice-to-have di contenuto**

- **Bacheca / news** — nuovo modello `Post` (titolo, body markdown, autore, pubblicazione) + pagina `/news` + push automatica alla pubblicazione. Storico permanente delle comunicazioni (oggi solo notifiche effimere).
- **Pagina staff / "Chi siamo"** — `/la-squadra` esiste ma manca sezione dedicata ad allenatori e dirigenti (foto, ruolo, bio breve). Statica o derivata da `User` con flag `isStaffPublic`.
- **FAQ** — pagina statica con domande ricorrenti. Riduce il volume di `/contatti`.
- **Sondaggi/poll rapidi** — modello `Poll` con opzioni multiple, voto utente loggato, scadenza. Utile per scelte logistiche (cena fine stagione, orari trasferte).
