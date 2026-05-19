# CLAUDE_TODO.md — Karibu Baskin

Analisi codebase con priorità d'intervento. Aggiornato automaticamente.

---

## 🔴 CRITICO — Sicurezza

*(nessun item critico aperto)*

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

### F4. **Sistema TrueSkill per-ruolo** *(futuro — già in memory)*

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

## 🛠 DEVELOPER EXPERIENCE

### DX4. **Sentry / error reporting in produzione**

Aggiungere `instrumentation.ts` con Sentry SDK. Catturare eccezioni da `global-error.tsx`.
**Effort:** 2h

### DX5. **Storybook per componenti complessi**

Priority: `RegistrationForm` (7+ stati), `TeamDisplay`, `CalendarClient`.
**Effort:** 3-4h setup + 30min/componente

---

## ✨ UX QUICK WINS

### UX4. **Keyboard navigation in CalendarClient**

`tabIndex={0}` + `onKeyDown` (←→ giorno, ↑↓ settimana) sui giorni del calendario.
**Effort:** 2h

### UX5. **Dark mode (prefers-color-scheme)**

MUI `CssVarsProvider` + `useMediaQuery` + override in localStorage.
**Effort:** 4-5h (richiede revisione `sx` con colori custom)

---

## 🏗 INFRASTRUTTURA

### INF1. ✅ **TanStack Query — dominio `registrations`** *(fatto: 2026-05-19)*

`QueryClientProvider` in `Providers.tsx` + devtools.
`useSWR` → `useQuery` per fetch registrazioni in `allenamento/[session]/page.tsx`.
`handleSubmit` in `useRegistrationForm` → `useMutation` (`onMutate` ottimistico, `onError` rollback, `onSuccess` reset form).
`executeDeletion` in `RosterByRole` → `useMutation`.
**Prossimo dominio:** sessions o teams.

### INF2. ✅ **Playwright E2E** *(fatto: 2026-05-19, bug fix: 2026-05-19)*

3 journey: iscrizione anonima, login+iscrizione, admin genera squadre.
`playwright.config.ts` + `e2e/helpers.ts` + 3 spec file.
Richiede server locale con `ENABLE_TEST_LOGIN=true` e variabili `E2E_*` configurate.
Job CI opzionale in `ci.yml` (skip se `E2E_ADMIN_EMAIL` non impostato).

**Fix applicati dopo prima esecuzione:**
- Rate limit anonimo (3/min per IP): `addAnonReg` ora passa `X-Forwarded-For` con IP sintetico per-indice → ogni iscrizione ha IP distinto. In prod Vercel sovrascrive con `x-real-ip`.
- Locator strict mode: `getByText("Arancioni")` → `getByRole("heading", { name: "Arancioni" })`.
- `SportRoleQuestionnaire`: opzioni erano `<Paper onClick>` senza `role` → aggiunto `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space). Risolve sia il test (`getByRole("button", ...)`) sia l'accessibilità keyboard.

### INF3-b. **React Hook Form su `AdminPartiteClient`**

Candidato successivo per RHF — complesso per il flusso "crea avversaria al volo".
Richiede test browser prima di procedere.

### INF4. **Prisma Edge adapter (Neon)**

`@prisma/adapter-neon` per abilitare auth nel middleware vero.
**Effort:** 3h + test approfonditi
---

## Note operative

| Categoria | Quando fare |
|---|---|
| 🔴 Critico | Prima del prossimo push in produzione |
| 🟡 Media (M1) | Boy-scout rule: quando si tocca il file per altro |
| 📋 Feature (F1–F4) | In ordine: F1 → F2 → F3 → F4 |
| 🛠 DX / ✨ UX / 🏗 INF | Raccogliere in sprint dedicati |
