# CLAUDE_TODO.md — Karibu Baskin

Analisi codebase con priorità d'intervento. Aggiornato automaticamente.

---

## 🔴 CRITICO — Sicurezza

*(nessun item critico aperto)*

---

## 🟡 ALTA PRIORITÀ — Correttezza e struttura

---

## 🟡 MEDIA PRIORITÀ — Performance e QoL tecnico

### M1. **Componenti troppo grandi — refactor incrementale**

- `AdminPartiteClient.tsx` — ~1130 righe
- `CalendarClient.tsx` — ~1097 righe
- `AdminUserList.tsx` — ~1055 righe

**Non fare refactor standalone.** Estrarre sub-componenti e custom hooks quando si toccano per altre ragioni.

---

## 📋 FEATURES PIANIFICATE

### F1. **Storico presenze giocatore**

Non c'è pagina che mostra la frequenza agli allenamenti nel tempo. Utile per lo staff per monitorare la regolarità.

**Scope:**
- Sezione "Presenze" nel pannello admin utente (`/admin/utenti/[id]`)
- Eventualmente su profilo pubblico giocatore (visibile solo allo staff)

---

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

### F5. **Sistema TrueSkill per-ruolo** *(futuro — già in memory)*

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

## 🛠 DEVELOPER EXPERIENCE — Backlog

### DX1. ✅ **Husky + lint-staged — pre-commit hook** *(fatto: 2026-05-19)*

Esegue `prettier`, `eslint --fix` e `tsc --noEmit` automaticamente al commit.
Evita push con type-error o stile inconsistente.

### DX2. ✅ **GitHub Actions CI** *(fatto: 2026-05-19)*

Workflow `ci.yml` su push/PR: lint + type-check + test + format-check.
Blocca merge se rosso.

### DX3. **Path aliases granulari + barrel per `lib/schemas`**

Aggiungere `@/schemas/*` in `tsconfig.json` e creare `src/lib/schemas/index.ts`.
**Effort:** 1h

### DX4. **Sentry / error reporting in produzione**

Aggiungere `instrumentation.ts` con Sentry SDK. Catturare eccezioni da `global-error.tsx`.
**Effort:** 2h

### DX5. **Storybook per componenti complessi**

Priority: `RegistrationForm` (7+ stati), `TeamDisplay`, `CalendarClient`.
**Effort:** 3-4h setup + 30min/componente

---

## ✨ UX QUICK WINS — Backlog

### UX1. ✅ **Skeleton loading per sub-route admin** *(fatto: 2026-05-19)*

`loading.tsx` per allenamenti, utenti, partite, squadre, eventi.

### UX2. **Optimistic updates su iscrizione/disiscrizione**

SWR `mutate(key, optimisticData, { rollbackOnError: true })` in `useRegistrationForm`.
**Effort:** 2h

### UX3. **Accessibility: aria-label su IconButton**

Abilitare `jsx-a11y/control-has-associated-label: "error"` in eslint.config.
Poi aggiungere `aria-label` su tutti gli `IconButton` senza testo.
**Effort:** 3h

### UX4. **Keyboard navigation in CalendarClient**

`tabIndex={0}` + `onKeyDown` (←→ giorno, ↑↓ settimana) sui giorni del calendario.
**Effort:** 2h

### UX5. **Dark mode (prefers-color-scheme)**

MUI `CssVarsProvider` + `useMediaQuery` + override in localStorage.
**Effort:** 4-5h (richiede revisione `sx` con colori custom)

### UX6. **Toast "Annulla" sulle disiscrizioni**

Pattern Gmail: 8s per annullare. Ricrea iscrizione al click.
**Effort:** 1.5h

---

## 🏗 INFRASTRUTTURA — Backlog

### INF1. **TanStack Query al posto di SWR (graduale)**

`useMutation` con rollback, devtools, query invalidation a cascata.
Iniziare da dominio `registrations`.
**Effort:** 1h setup + 2h/dominio

### INF2. **Testing Library + Playwright E2E**

3 journey critiche: iscrizione anonima, login+iscrizione, admin genera squadre.
**Effort:** 2h setup + 2h/journey

### INF3. ✅ **React Hook Form + Zod resolver su form admin** *(fatto: 2026-05-19)*

Applicato a `AdminSessionForm`. Riusa schemi Zod server-side, elimina `validate()` manuale.
Prossimi candidati: form partite, form eventi, form squadre.

### INF4. **Prisma Edge adapter (Neon)**

`@prisma/adapter-neon` per abilitare auth nel middleware vero.
**Effort:** 3h + test approfonditi

---

## Note operative

| Categoria | Quando fare |
|---|---|
| 🔴 Critico | Prima del prossimo push in produzione |
| 🟡 Alta (A1–A5) | Prossimo sprint — nessun prerequisito bloccante |
| 🟡 Media (M1–M5) | Boy-scout rule: quando si tocca il file per altro |
| 📋 Feature (F1–F5) | In ordine: F1 → F2 → F3 → F4 → F5 |
| 🛠 DX / ✨ UX / 🏗 INF | Raccogliere in sprint dedicati |
